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

    // OpenAI API allows batching up to 2048 texts
    // For very large batches, we may need to chunk
    const MAX_BATCH_SIZE = 2048;
    const embeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
        const batch = texts.slice(i, i + MAX_BATCH_SIZE);

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
