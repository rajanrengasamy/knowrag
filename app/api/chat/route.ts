/**
 * KnowRAG - Chat API Route
 * 
 * POST /api/chat
 * Processes user queries through the RAG pipeline and streams LLM responses.
 * 
 * Request body: { query: string, model: "gemini" | "openai" }
 * Response: Streaming text response with citations
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateResponse, LLMError, formatErrorMessage, type ModelId } from '@/lib/llm';
import { generateSystemPromptFromSources, NO_INFO_MESSAGE } from '@/lib/prompts/rag-prompt';
import { embedText } from '@/lib/rag/embeddings';
import { searchSimilar } from '@/lib/rag/vectordb';
import { formatSourceForCitation } from '@/lib/rag/query';
import { getTempIndex, searchTempIndex } from '@/lib/rag/temporary';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Request body schema
 */
interface ChatRequest {
    query: string;
    model: ModelId;
    images?: string[];
    pdfs?: Array<{ filename: string; name: string }>;
}

const MAX_IMAGE_COUNT = Number(process.env.MAX_IMAGE_COUNT || 4);
const MAX_IMAGE_MB = Number(process.env.MAX_IMAGE_MB || 5);
const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;
const ALLOWED_IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const MAX_PDF_COUNT = Number(process.env.MAX_PDF_COUNT || 3);
const MAX_PDF_MB = Number(process.env.MAX_PDF_UPLOAD_MB || 200);
const MAX_PDF_BYTES = MAX_PDF_MB * 1024 * 1024;
const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads');
const TOP_K = Number(process.env.RAG_TOP_K || 5);
const PDF_TOP_K = Number(process.env.RAG_PDF_TOP_K || Math.min(3, TOP_K));

/**
 * Validates the request body
 */
function validateRequest(body: unknown): body is ChatRequest {
    if (!body || typeof body !== 'object') {
        return false;
    }

    const { query, model, images, pdfs } = body as Record<string, unknown>;

    if (typeof query !== 'string' || query.trim().length === 0) {
        return false;
    }

    if (model !== 'gemini' && model !== 'openai' && model !== 'gpt-4o') {
        return false;
    }

    if (images !== undefined) {
        if (!Array.isArray(images) || !images.every(img => typeof img === 'string')) {
            return false;
        }
    }

    if (pdfs !== undefined) {
        if (!Array.isArray(pdfs)) {
            return false;
        }
        for (const pdf of pdfs) {
            if (
                !pdf ||
                typeof pdf !== 'object' ||
                typeof (pdf as { filename?: unknown }).filename !== 'string' ||
                typeof (pdf as { name?: unknown }).name !== 'string'
            ) {
                return false;
            }
        }
    }

    return true;
}

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
    const matches = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (!matches) {
        return null;
    }
    return { mimeType: matches[1], data: matches[2] };
}

function estimateBase64Size(base64Data: string): number {
    const padding = base64Data.endsWith('==') ? 2 : base64Data.endsWith('=') ? 1 : 0;
    return Math.floor((base64Data.length * 3) / 4) - padding;
}

function validateImages(images: string[]): string | null {
    if (images.length > MAX_IMAGE_COUNT) {
        return `Too many images. Max ${MAX_IMAGE_COUNT} allowed per message.`;
    }

    for (const [index, image] of images.entries()) {
        const parsed = parseDataUrl(image);
        if (!parsed) {
            return `Image ${index + 1} must be a base64 data URL.`;
        }

        if (!ALLOWED_IMAGE_MIME.has(parsed.mimeType)) {
            return `Image ${index + 1} type ${parsed.mimeType} is not supported.`;
        }

        const sizeBytes = estimateBase64Size(parsed.data);
        if (sizeBytes > MAX_IMAGE_BYTES) {
            return `Image ${index + 1} exceeds ${MAX_IMAGE_MB}MB limit.`;
        }
    }

    return null;
}

/**
 * POST /api/chat
 * 
 * Streams a RAG-powered response to the user's query.
 */
export async function POST(request: NextRequest) {
    try {
        // Parse request body
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: 'Invalid JSON in request body' },
                { status: 400 }
            );
        }

        // Validate required fields
        if (!validateRequest(body)) {
            return NextResponse.json(
                {
                    error: 'Invalid request. Required: { query: string, model: "gemini" | "openai" | "gpt-4o" }'
                },
                { status: 400 }
            );
        }

        const { query, model, images, pdfs } = body;
        const hasImages = Boolean(images && images.length > 0);
        const hasPdfs = Boolean(pdfs && pdfs.length > 0);
        const effectiveModel: ModelId = hasImages ? 'gpt-4o' : model;

        if (hasImages && images) {
            const imageError = validateImages(images);
            if (imageError) {
                return NextResponse.json({ error: imageError }, { status: 400 });
            }
        }

        if (hasPdfs && pdfs) {
            if (pdfs.length > MAX_PDF_COUNT) {
                return NextResponse.json(
                    { error: `Too many PDFs. Max ${MAX_PDF_COUNT} allowed per message.` },
                    { status: 400 }
                );
            }
        }

        const modelNote = hasImages && model !== 'gpt-4o' ? ` (auto-switched to gpt-4o)` : '';
        console.log(`\n📩 Chat request: model=${effectiveModel}${modelNote}, query="${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"${images?.length ? ` + ${images.length} images` : ''}${pdfs?.length ? ` + ${pdfs.length} PDFs` : ''}`);

        // Step 1: Embed the query once for all searches
        const queryEmbedding = await embedText(query);

        // Step 2: Search the persistent vector database
        const dbResults = await searchSimilar(queryEmbedding, TOP_K);

        // Step 3: Search any attached PDFs via temporary in-memory index
        const pdfResults: Array<{
            text: string;
            source: string;
            page: number;
            chunkIndex: number;
            score: number;
        }> = [];

        if (hasPdfs && pdfs) {
            for (const pdf of pdfs) {
                const safeName = path.basename(pdf.filename);
                if (!safeName.toLowerCase().endsWith('.pdf')) {
                    return NextResponse.json({ error: 'Invalid PDF attachment.' }, { status: 400 });
                }
                const filePath = path.join(UPLOAD_DIR, safeName);
                const resolvedUploadDir = path.resolve(UPLOAD_DIR);
                const resolvedFile = path.resolve(filePath);

                if (!resolvedFile.startsWith(resolvedUploadDir)) {
                    return NextResponse.json({ error: 'Invalid PDF attachment.' }, { status: 400 });
                }

                if (!fs.existsSync(filePath)) {
                    return NextResponse.json({ error: `PDF not found: ${pdf.name}` }, { status: 404 });
                }

                const stats = await fs.promises.stat(filePath);
                if (stats.size > MAX_PDF_BYTES) {
                    return NextResponse.json(
                        { error: `PDF ${pdf.name} exceeds ${MAX_PDF_MB}MB limit.` },
                        { status: 413 }
                    );
                }

                const tempIndex = await getTempIndex(filePath);
                const matches = searchTempIndex(queryEmbedding, tempIndex, TOP_K);
                matches.forEach(match => {
                    pdfResults.push({
                        text: match.text,
                        source: pdf.name,
                        page: match.page,
                        chunkIndex: match.chunkIndex,
                        score: match._distance,
                    });
                });
            }
        }

        const dbChunks = dbResults.map(result => ({
            text: result.text,
            source: result.source,
            page: result.page,
            chunkIndex: result.chunkIndex,
            score: result._distance,
        }));

        const sortedPdfResults = pdfResults.slice().sort((a, b) => a.score - b.score);
        const pdfBudget = hasPdfs ? Math.min(TOP_K, Math.max(1, PDF_TOP_K)) : 0;
        const selectedPdfResults = hasPdfs ? sortedPdfResults.slice(0, pdfBudget) : [];
        const remainingBudget = hasPdfs ? Math.max(0, TOP_K - selectedPdfResults.length) : TOP_K;
        const selectedDbResults = dbChunks
            .slice()
            .sort((a, b) => a.score - b.score)
            .slice(0, remainingBudget);

        const combined = hasPdfs ? [...selectedPdfResults, ...selectedDbResults] : selectedDbResults;

        // Step 2: Create a streaming response using TransformStream
        const encoder = new TextEncoder();
        const stream = new TransformStream();
        const writer = stream.writable.getWriter();

        const combinedChunks = combined.map((chunk, index) => {
            const citationMarker = `[${index + 1}]`;
            const citation = `(${formatSourceForCitation(chunk.source)}, p. ${chunk.page})`;
            return {
                ...chunk,
                citationMarker,
                citation,
            };
        });

        // Prepare citation metadata for the frontend
        const citations = combinedChunks.map(chunk => ({
            marker: chunk.citationMarker,
            citation: chunk.citation,
            source: chunk.source,
            page: chunk.page,
        }));

        // Build the system prompt from retrieved chunks
        const sources = combinedChunks.map(chunk => ({
            text: chunk.text,
            source: chunk.source,
            page: chunk.page,
            chunkIndex: chunk.chunkIndex,
        }));
        const systemPrompt = generateSystemPromptFromSources(sources);

        // Start the streaming response in the background
        (async () => {
            try {
                // Send citation metadata first with a delimiter
                // Format: JSON_CITATIONS|||STREAM_CONTENT
                const citationHeader = JSON.stringify({ citations }) + '|||';
                await writer.write(encoder.encode(citationHeader));

                if (combinedChunks.length === 0) {
                    await writer.write(encoder.encode(NO_INFO_MESSAGE));
                } else {
                    // Pass images to generateResponse
                    for await (const chunk of generateResponse(effectiveModel, systemPrompt, query, images)) {
                        if (chunk.text) {
                            await writer.write(encoder.encode(chunk.text));
                        }
                    }
                }
            } catch (error) {
                console.error('Streaming error:', error);

                // Write error message to stream
                const errorMessage = error instanceof LLMError
                    ? formatErrorMessage(error)
                    : 'An unexpected error occurred while generating the response.';

                await writer.write(encoder.encode(`\n\n[Error: ${errorMessage}]`));
            } finally {
                await writer.close();
            }
        })();

        // Return streaming response
        return new Response(stream.readable, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Transfer-Encoding': 'chunked',
                'Cache-Control': 'no-cache',
            },
        });

    } catch (error) {
        console.error('Chat API error:', error);

        // Handle LLM-specific errors
        if (error instanceof LLMError) {
            const clientErrorCodes = new Set([
                'MISSING_API_KEY',
                'INVALID_API_KEY',
                'MODEL_NOT_VISION',
                'INVALID_MODEL',
            ]);
            const status = error.code && clientErrorCodes.has(error.code) ? 400 : 502;
            return NextResponse.json(
                { error: formatErrorMessage(error) },
                { status }
            );
        }

        if (error instanceof Error) {
            if (error.message.includes('OPENAI_API_KEY')) {
                return NextResponse.json(
                    { error: error.message },
                    { status: 400 }
                );
            }
        }

        // Generic server error
        return NextResponse.json(
            { error: 'An unexpected error occurred. Please try again.' },
            { status: 500 }
        );
    }
}
