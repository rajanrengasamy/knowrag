/**
 * KnowRAG - OpenAI Embeddings Wrapper
 * 
 * Uses OpenAI's text-embedding-3-small model for generating embeddings.
 * This is a lightweight wrapper around the OpenAI SDK for use in the RAG pipeline.
 */

import OpenAI from 'openai';

// Embedding configuration
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536; // Default for text-embedding-3-small
const MAX_BATCH_SIZE = Number(process.env.OPENAI_EMBEDDING_MAX_BATCH || 256);
const MAX_BATCH_TOKENS = Number(process.env.OPENAI_EMBEDDING_MAX_TOKENS || 200000);

// Singleton OpenAI client
let openaiClient: OpenAI | null = null;

/**
 * Get or create the OpenAI client
 * Reads OPENAI_API_KEY from environment
 */
function getOpenAIClient(): OpenAI {
    if (!openaiClient) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error(
                'OPENAI_API_KEY environment variable is not set. ' +
                'Please add it to your .env.local file.'
            );
        }
        openaiClient = new OpenAI({ apiKey });
    }
    return openaiClient;
}

/**
 * Generate embeddings for a single text string
 * 
 * @param text - The text to embed
 * @returns Array of embedding values (1536 dimensions)
 */
export async function embedText(text: string): Promise<number[]> {
    const client = getOpenAIClient();

    const response = await client.embeddings.create({
        model: EMBEDDING_MODEL,
        input: text,
    });

    return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts in a single batch
 * More efficient than calling embedText multiple times
 * 
 * @param texts - Array of texts to embed
 * @returns Array of embedding arrays
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
        return [];
    }

    const client = getOpenAIClient();

    const estimateTokens = (text: string) => Math.ceil(text.length / 4);
    const embeddings: number[][] = [];

    const batches: string[][] = [];
    let currentBatch: string[] = [];
    let currentTokens = 0;

    for (const text of texts) {
        const tokenEstimate = estimateTokens(text);
        const wouldOverflowTokens = currentTokens + tokenEstimate > MAX_BATCH_TOKENS;
        const wouldOverflowCount = currentBatch.length >= MAX_BATCH_SIZE;

        if (currentBatch.length > 0 && (wouldOverflowTokens || wouldOverflowCount)) {
            batches.push(currentBatch);
            currentBatch = [];
            currentTokens = 0;
        }

        currentBatch.push(text);
        currentTokens += tokenEstimate;
    }

    if (currentBatch.length > 0) {
        batches.push(currentBatch);
    }

    for (const batch of batches) {
        if (batch.length === 0) {
            continue;
        }

        const response = await client.embeddings.create({
            model: EMBEDDING_MODEL,
            input: batch,
        });

        // Ensure embeddings are in the same order as input
        const sortedData = response.data.sort((a, b) => a.index - b.index);
        embeddings.push(...sortedData.map(d => d.embedding));
    }

    return embeddings;
}

/**
 * Get the embedding model configuration
 */
export function getEmbeddingConfig() {
    return {
        model: EMBEDDING_MODEL,
        dimensions: EMBEDDING_DIMENSIONS,
    };
}

export { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS };
