/**
 * KnowRAG - Status API Route
 * 
 * GET /api/status
 * Returns the current status of the document index including:
 * - Number of indexed documents
 * - Total chunk count
 * - Whether the system is ready for queries
 */

import { NextResponse } from 'next/server';
import { getStats } from '@/lib/rag/vectordb';

/**
 * Response schema for status endpoint
 */
interface StatusResponse {
    /** Number of indexed documents */
    documents: number;
    /** Total number of chunks in the index */
    chunks: number;
    /** Whether the system is ready for queries */
    ready: boolean;
    /** List of indexed document names (optional) */
    documentNames?: string[];
}

/**
 * GET /api/status
 * 
 * Returns the current state of the document index.
 */
export async function GET() {
    try {
        const stats = await getStats();
        const response: StatusResponse = {
            documents: stats.documentCount,
            chunks: stats.totalChunks,
            ready: stats.ready,
            documentNames: stats.documents,
        };

        console.log(`📊 Status check: ${stats.documentCount} docs, ${stats.totalChunks} chunks, ready=${stats.ready}`);

        return NextResponse.json(response, { status: 200 });

    } catch (error) {
        console.error('Status API error:', error);

        // Return a meaningful error response
        const errorMessage = error instanceof Error
            ? error.message
            : 'Failed to retrieve index status';

        return NextResponse.json(
            {
                error: errorMessage,
                documents: 0,
                chunks: 0,
                ready: false,
            },
            { status: 500 }
        );
    }
}
