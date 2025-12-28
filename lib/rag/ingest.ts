/**
 * KnowRAG - PDF Ingestion Pipeline
 * 
 * Handles PDF loading, text extraction, and chunking with page number preservation.
 * Uses pdf-parse v1.x for text extraction and implements overlap-based chunking.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ChunkMetadata, PDFExtractionResult, PageContent, IngestionStats } from './types.js';

// pdf-parse is imported dynamically in loadPDF to support ESM compatibility

// Chunking configuration
const TARGET_CHUNK_SIZE = 512; // Target tokens per chunk (approx 4 chars per token)
const CHUNK_OVERLAP = 50; // Overlap tokens between chunks
const CHARS_PER_TOKEN = 4; // Rough approximation for English text

/**
 * Load and extract text from a PDF file with page number tracking
 * 
 * pdf-parse v1.x doesn't provide per-page text directly, so we use
 * a custom page render function to capture text page by page.
 * 
 * @param pdfPath - Absolute path to the PDF file
 * @returns PDFExtractionResult with text content per page
 */
export async function loadPDF(pdfPath: string): Promise<PDFExtractionResult> {
    const filename = path.basename(pdfPath);
    console.log(`📄 Loading PDF: ${filename}`);

    // Dynamic import for pdf-parse (CommonJS module)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');

    // Read PDF file asynchronously for non-blocking I/O
    const dataBuffer = await fs.promises.readFile(pdfPath);

    // Store per-page text
    const pageTexts: string[] = [];

    // Custom page renderer to capture per-page text with proper formatting
    const renderPage = async (pageData: {
        getTextContent: () => Promise<{
            items: Array<{ str: string; transform?: number[] }>
        }>
    }): Promise<string> => {
        const textContent = await pageData.getTextContent();
        let pageText = '';
        let lastY: number | null = null;

        for (const item of textContent.items) {
            // Add newline when Y position changes (indicates new line in PDF)
            if (lastY !== null && item.transform) {
                const currentY = item.transform[5];
                if (Math.abs(currentY - lastY) > 5) {
                    pageText += '\n';
                }
            }
            pageText += item.str;
            if (item.transform) {
                lastY = item.transform[5];
            }
        }

        pageTexts.push(pageText.trim());
        return pageText;
    };

    // Parse PDF with custom page renderer
    const options = {
        pagerender: renderPage
    };

    const data = await pdfParse(dataBuffer, options);

    // Build pages array
    const pages: PageContent[] = [];
    for (let i = 0; i < data.numpages; i++) {
        pages.push({
            pageNumber: i + 1,
            text: pageTexts[i] || ''
        });
    }

    console.log(`   ✓ Extracted ${data.numpages} pages`);

    return {
        totalPages: data.numpages,
        pages,
        source: filename
    };
}

/**
 * Split text into chunks with overlap, preserving page boundaries
 * 
 * Strategy:
 * - Target ~512 tokens per chunk (~2048 chars)
 * - 50 token overlap between chunks (~200 chars)
 * - Try to break at sentence boundaries when possible
 * - Preserve page number for each chunk
 * 
 * @param extraction - PDF extraction result with per-page text
 * @returns Array of ChunkMetadata with source and page info
 */
export function chunkDocument(extraction: PDFExtractionResult): ChunkMetadata[] {
    const chunks: ChunkMetadata[] = [];
    let globalChunkIndex = 0;

    const targetChars = TARGET_CHUNK_SIZE * CHARS_PER_TOKEN;
    const overlapChars = CHUNK_OVERLAP * CHARS_PER_TOKEN;

    console.log(`🔪 Chunking document (target: ${TARGET_CHUNK_SIZE} tokens, overlap: ${CHUNK_OVERLAP} tokens)`);

    for (const page of extraction.pages) {
        if (!page.text || page.text.trim().length === 0) {
            continue; // Skip empty pages
        }

        const pageText = page.text.trim();
        let position = 0;

        while (position < pageText.length) {
            // Calculate chunk boundaries
            let chunkEnd = Math.min(position + targetChars, pageText.length);

            // If not at end of page, try to find a good break point
            if (chunkEnd < pageText.length) {
                // Look for sentence boundary (. ! ? followed by space and capital) in last 20% of chunk
                const searchStart = Math.floor(chunkEnd - targetChars * 0.2);
                const searchRegion = pageText.slice(searchStart, chunkEnd);
                const sentenceMatch = searchRegion.match(/[.!?]\s+(?=[A-Z])/);

                if (sentenceMatch && sentenceMatch.index !== undefined) {
                    chunkEnd = searchStart + sentenceMatch.index + sentenceMatch[0].length;
                } else {
                    // Fall back to word boundary
                    const lastSpace = pageText.lastIndexOf(' ', chunkEnd);
                    if (lastSpace > position + targetChars * 0.5) {
                        chunkEnd = lastSpace;
                    }
                }
            }

            const chunkText = pageText.slice(position, chunkEnd).trim();

            if (chunkText.length > 50) { // Skip very small chunks
                chunks.push({
                    source: extraction.source,
                    page: page.pageNumber,
                    chunkIndex: globalChunkIndex,
                    text: chunkText
                });
                globalChunkIndex++;
            }

            // Move position forward, accounting for overlap
            const nextPosition = chunkEnd - overlapChars;

            // Prevent infinite loop - always advance at least some amount
            if (nextPosition <= position) {
                position = chunkEnd;
            } else {
                position = nextPosition;
            }

            // Safety: if we're at the end of meaningful content, break
            if (position >= pageText.length - 50) {
                break;
            }
        }
    }

    console.log(`   ✓ Created ${chunks.length} chunks from ${extraction.pages.length} pages`);

    return chunks;
}

/**
 * Full ingestion pipeline: Load PDF → Extract text → Chunk
 * 
 * @param pdfPath - Absolute path to the PDF file
 * @returns Object with chunks array and ingestion statistics
 */
export async function ingestPDF(pdfPath: string): Promise<{
    chunks: ChunkMetadata[];
    stats: IngestionStats;
}> {
    const startTime = Date.now();

    console.log('\n' + '='.repeat(60));
    console.log('🚀 KnowRAG Ingestion Pipeline');
    console.log('='.repeat(60) + '\n');

    // Step 1: Load and extract PDF
    const extraction = await loadPDF(pdfPath);

    // Step 2: Chunk the document
    const chunks = chunkDocument(extraction);

    // Calculate stats
    const totalChars = chunks.reduce((sum, c) => sum + c.text.length, 0);
    const avgChunkSize = chunks.length > 0 ? Math.round(totalChars / chunks.length) : 0;
    const processingTimeMs = Date.now() - startTime;

    const stats: IngestionStats = {
        source: extraction.source,
        pagesProcessed: extraction.totalPages,
        chunksCreated: chunks.length,
        avgChunkSize,
        processingTimeMs
    };

    // Log summary
    console.log('\n' + '-'.repeat(60));
    console.log('📊 Ingestion Summary');
    console.log('-'.repeat(60));
    console.log(`   Source: ${stats.source}`);
    console.log(`   Pages processed: ${stats.pagesProcessed}`);
    console.log(`   Chunks created: ${stats.chunksCreated}`);
    console.log(`   Avg chunk size: ${stats.avgChunkSize} chars (~${Math.round(stats.avgChunkSize / CHARS_PER_TOKEN)} tokens)`);
    console.log(`   Processing time: ${stats.processingTimeMs}ms`);
    console.log('='.repeat(60) + '\n');

    return { chunks, stats };
}

/**
 * Scan the knowledge folder for PDF files
 * 
 * @param knowledgePath - Path to the knowledge folder
 * @returns Array of PDF file paths
 */
export function scanForPDFs(knowledgePath: string): string[] {
    const files = fs.readdirSync(knowledgePath);
    const pdfFiles = files
        .filter(f => f.toLowerCase().endsWith('.pdf'))
        .map(f => path.join(knowledgePath, f));

    console.log(`📂 Found ${pdfFiles.length} PDF file(s) in knowledge folder`);
    pdfFiles.forEach(f => console.log(`   - ${path.basename(f)}`));

    return pdfFiles;
}

// Re-export types for convenience
export type { ChunkMetadata, PDFExtractionResult, PageContent, IngestionStats };
