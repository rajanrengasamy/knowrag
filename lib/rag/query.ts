/**
 * KnowRAG - RAG Query Pipeline
 * 
 * Handles the query flow: embed query → search vectors → format context
 * Returns chunks with citation markers for LLM consumption.
 */

import { embedText } from './embeddings';
import { searchSimilar, type VectorRecord } from './vectordb';

/**
 * Retrieved chunk with formatted citation info
 */
export interface RetrievedChunk {
    /** Original text content */
    text: string;
    /** Source PDF filename */
    source: string;
    /** Page number in PDF */
    page: number;
    /** Similarity score (lower is more similar for L2 distance) */
    score: number;
    /** Citation marker for LLM reference, e.g., "[1]" */
    citationMarker: string;
    /** Formatted citation, e.g., "(The Intelligent Investor, p. 42)" */
    citation: string;
}

/**
 * Query result containing context and metadata
 */
export interface QueryResult {
    /** Formatted context string for LLM */
    context: string;
    /** Retrieved chunks with metadata */
    chunks: RetrievedChunk[];
    /** Time taken in milliseconds */
    queryTimeMs: number;
}

/**
 * Format a source filename for citation
 * Removes file extension and cleans up the title
 */
function formatSourceForCitation(source: string): string {
    // Remove .pdf extension
    let title = source.replace(/\.pdf$/i, '');

    // Clean up common patterns
    title = title
        .replace(/ - /g, ': ')  // Replace " - " with ": "
        .replace(/_/g, ' ')     // Replace underscores with spaces
        .trim();

    return title;
}

/**
 * Convert raw search results to formatted retrieved chunks
 */
function formatRetrievedChunks(
    results: Array<VectorRecord & { _distance: number }>
): RetrievedChunk[] {
    return results.map((result, index) => {
        const citationMarker = `[${index + 1}]`;
        const formattedSource = formatSourceForCitation(result.source);
        const citation = `(${formattedSource}, p. ${result.page})`;

        return {
            text: result.text,
            source: result.source,
            page: result.page,
            score: result._distance,
            citationMarker,
            citation,
        };
    });
}

/**
 * Build context string for LLM from retrieved chunks
 * Format: Each chunk is labeled with citation marker
 */
function buildContextString(chunks: RetrievedChunk[]): string {
    if (chunks.length === 0) {
        return 'No relevant information found in the knowledge base.';
    }

    const contextParts = chunks.map(chunk => {
        return `${chunk.citationMarker} ${chunk.citation}\n${chunk.text}`;
    });

    const header = '=== Retrieved Knowledge ===\n\n';
    const footer = '\n\n=== End of Retrieved Knowledge ===';

    return header + contextParts.join('\n\n---\n\n') + footer;
}

/**
 * Main query function: embed query → search → format context
 * 
 * @param query - The user's question
 * @param topK - Number of chunks to retrieve (default: 5)
 * @returns QueryResult with context and chunk metadata
 */
export async function queryRAG(query: string, topK: number = 5): Promise<QueryResult> {
    const startTime = Date.now();

    console.log(`\n🔍 RAG Query: "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"`);

    // Step 1: Embed the query using the same model as documents
    console.log('   Embedding query...');
    const queryEmbedding = await embedText(query);

    // Step 2: Search for similar chunks in vector database
    console.log(`   Searching for top ${topK} similar chunks...`);
    const searchResults = await searchSimilar(queryEmbedding, topK);

    // Step 3: Format results with citation markers
    const chunks = formatRetrievedChunks(searchResults);

    // Step 4: Build context string for LLM
    const context = buildContextString(chunks);

    const queryTimeMs = Date.now() - startTime;

    console.log(`   ✓ Retrieved ${chunks.length} chunks in ${queryTimeMs}ms`);

    // Log chunk sources for debugging
    if (chunks.length > 0) {
        console.log('   Sources:');
        chunks.forEach(chunk => {
            console.log(`     ${chunk.citationMarker} ${chunk.citation} (score: ${chunk.score.toFixed(4)})`);
        });
    }

    return {
        context,
        chunks,
        queryTimeMs,
    };
}

/**
 * Get just the formatted context for a query (convenience wrapper)
 */
export async function getContextForQuery(query: string, topK: number = 5): Promise<string> {
    const result = await queryRAG(query, topK);
    return result.context;
}

/**
 * Build the full prompt for the LLM including context and user query
 * This combines the retrieved context with the user's question
 */
export function buildRAGPrompt(context: string, query: string): string {
    return `Use the following retrieved knowledge to answer the user's question. 
If you use information from the retrieved knowledge, cite it using the format shown (Book Title, p. XX).
If the answer is not found in the retrieved knowledge, say "I don't have information about that in my knowledge base."

${context}

User Question: ${query}

Answer:`;
}

export type { VectorRecord };
