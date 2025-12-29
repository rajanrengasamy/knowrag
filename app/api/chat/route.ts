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
import { queryRAG } from '@/lib/rag/query';
import { generateResponse, LLMError, formatErrorMessage } from '@/lib/llm';

/**
 * Request body schema
 */
interface ChatRequest {
    query: string;
    model: 'gemini' | 'openai';
}

/**
 * Validates the request body
 */
function validateRequest(body: unknown): body is ChatRequest {
    if (!body || typeof body !== 'object') {
        return false;
    }

    const { query, model } = body as Record<string, unknown>;

    if (typeof query !== 'string' || query.trim().length === 0) {
        return false;
    }

    if (model !== 'gemini' && model !== 'openai') {
        return false;
    }

    return true;
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
                    error: 'Invalid request. Required: { query: string, model: "gemini" | "openai" }'
                },
                { status: 400 }
            );
        }

        const { query, model } = body;

        console.log(`\n📩 Chat request: model=${model}, query="${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"`);

        // Step 1: Query the RAG pipeline to get relevant context
        const ragResult = await queryRAG(query);

        if (ragResult.chunks.length === 0) {
            console.log('   ⚠️ No relevant chunks found');
        }

        // Step 2: Create a streaming response using TransformStream
        const encoder = new TextEncoder();
        const stream = new TransformStream();
        const writer = stream.writable.getWriter();

        // Prepare citation metadata for the frontend
        const citations = ragResult.chunks.map(chunk => ({
            marker: chunk.citationMarker,
            citation: chunk.citation,
            source: chunk.source,
            page: chunk.page,
        }));

        // Start the streaming response in the background
        (async () => {
            try {
                // Send citation metadata first with a delimiter
                // Format: JSON_CITATIONS|||STREAM_CONTENT
                const citationHeader = JSON.stringify({ citations }) + '|||';
                await writer.write(encoder.encode(citationHeader));

                for await (const chunk of generateResponse(model, ragResult.context, query)) {
                    if (chunk.text) {
                        await writer.write(encoder.encode(chunk.text));
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
            return NextResponse.json(
                { error: formatErrorMessage(error) },
                { status: 502 } // Bad Gateway for upstream service failures
            );
        }

        // Generic server error
        return NextResponse.json(
            { error: 'An unexpected error occurred. Please try again.' },
            { status: 500 }
        );
    }
}
