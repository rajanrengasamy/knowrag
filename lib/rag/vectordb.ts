/**
 * KnowRAG - LanceDB Vector Database Operations
 * 
 * Handles vector storage, retrieval, and management using LanceDB.
 * Vectors are persisted locally in /data/lancedb folder.
 */

import * as lancedb from '@lancedb/lancedb';
import * as path from 'path';
import * as fs from 'fs';
import { embedTexts } from './embeddings';
import type { ChunkMetadata } from './types';

// Database configuration
const DB_PATH = path.join(process.cwd(), 'data', 'lancedb');
const TABLE_NAME = 'chunks';

// LanceDB connection (singleton)
let db: lancedb.Connection | null = null;

/**
 * Schema for storing document chunks with embeddings
 */
export interface VectorRecord {
    /** Unique identifier: source_chunkIndex */
    id: string;
    /** Original text content */
    text: string;
    /** Embedding vector (1536 dimensions for text-embedding-3-small) */
    vector: number[];
    /** Source PDF filename */
    source: string;
    /** Page number in PDF (1-indexed) */
    page: number;
    /** Chunk index within the document */
    chunkIndex: number;
    /** Index signature for LanceDB compatibility */
    [key: string]: string | number | number[];
}

/**
 * Database statistics
 */
export interface DBStats {
    /** Total number of chunks stored */
    totalChunks: number;
    /** Number of unique documents */
    documentCount: number;
    /** List of indexed document names */
    documents: string[];
    /** Whether the database is ready for queries */
    ready: boolean;
}

/**
 * Initialize and get the LanceDB connection
 * Creates the database directory if it doesn't exist
 */
async function getDB(): Promise<lancedb.Connection> {
    if (!db) {
        // Ensure the data directory exists
        if (!fs.existsSync(DB_PATH)) {
            fs.mkdirSync(DB_PATH, { recursive: true });
            console.log(`📁 Created LanceDB directory: ${DB_PATH}`);
        }

        db = await lancedb.connect(DB_PATH);
        console.log(`🔗 Connected to LanceDB at ${DB_PATH}`);
    }
    return db;
}

/**
 * Check if the chunks table exists
 */
async function tableExists(): Promise<boolean> {
    const connection = await getDB();
    const tables = await connection.tableNames();
    return tables.includes(TABLE_NAME);
}

/**
 * Create the chunks table with appropriate schema
 * Only creates if table doesn't exist
 */
export async function createTable(): Promise<void> {
    const connection = await getDB();

    if (await tableExists()) {
        console.log(`📋 Table '${TABLE_NAME}' already exists`);
        return;
    }

    // Create table with initial empty record to establish schema
    // LanceDB infers schema from the first record
    const initialRecord: VectorRecord = {
        id: '__init__',
        text: 'Initialization record',
        vector: new Array(1536).fill(0),
        source: '__init__',
        page: 0,
        chunkIndex: 0,
    };

    await connection.createTable(TABLE_NAME, [initialRecord]);
    console.log(`✅ Created table '${TABLE_NAME}'`);

    // Delete the initialization record
    const table = await connection.openTable(TABLE_NAME);
    await table.delete('id = "__init__"');
    console.log(`   Cleaned up initialization record`);
}

/**
 * Upsert chunks with their embeddings into the database
 * This will embed the chunks and store them in LanceDB
 * 
 * @param chunks - Array of chunk metadata to store
 * @returns Number of chunks upserted
 */
export async function upsertChunks(chunks: ChunkMetadata[]): Promise<number> {
    if (chunks.length === 0) {
        console.log('⚠️  No chunks to upsert');
        return 0;
    }

    const connection = await getDB();

    // Ensure table exists
    await createTable();

    console.log(`\n🔄 Embedding ${chunks.length} chunks...`);
    const startTime = Date.now();

    // Extract texts for batch embedding
    const texts = chunks.map(c => c.text);

    // Generate embeddings in batches (OpenAI recommends max 2048 per request)
    const BATCH_SIZE = 100; // Smaller batches for progress logging
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const batch = texts.slice(i, i + BATCH_SIZE);
        const embeddings = await embedTexts(batch);
        allEmbeddings.push(...embeddings);

        const progress = Math.min(i + BATCH_SIZE, texts.length);
        console.log(`   Embedded ${progress}/${texts.length} chunks...`);
    }

    const embeddingTime = Date.now() - startTime;
    console.log(`   ✓ Embedding complete in ${embeddingTime}ms`);

    // Prepare records for insertion
    const records: VectorRecord[] = chunks.map((chunk, idx) => ({
        id: `${chunk.source}_${chunk.chunkIndex}`,
        text: chunk.text,
        vector: allEmbeddings[idx],
        source: chunk.source,
        page: chunk.page,
        chunkIndex: chunk.chunkIndex,
    }));

    // Get or create table and add records
    const table = await connection.openTable(TABLE_NAME);

    // Delete existing records from the same source (upsert behavior)
    const source = chunks[0].source;
    try {
        await table.delete(`source = "${source}"`);
        console.log(`   Removed existing chunks from '${source}'`);
    } catch (error) {
        // Table might be empty or source doesn't exist, that's fine
        console.debug(`   [Debug] No existing chunks found to delete for source: ${source}`, error);
    }

    // Add new records
    await table.add(records);

    const totalTime = Date.now() - startTime;
    console.log(`✅ Upserted ${records.length} chunks in ${totalTime}ms`);

    return records.length;
}

/**
 * Search for similar chunks using vector similarity
 * 
 * @param queryEmbedding - The query embedding vector
 * @param topK - Number of results to return (default: 5)
 * @returns Array of matching chunks with similarity scores
 */
export async function searchSimilar(
    queryEmbedding: number[],
    topK: number = 5
): Promise<Array<VectorRecord & { _distance: number }>> {
    const connection = await getDB();

    if (!(await tableExists())) {
        console.log('⚠️  No chunks table found. Run ingestion first.');
        return [];
    }

    const table = await connection.openTable(TABLE_NAME);

    const results = await table
        .vectorSearch(queryEmbedding)
        .limit(topK)
        .toArray();

    return results as Array<VectorRecord & { _distance: number }>;
}

/**
 * Get database statistics
 */
export async function getStats(): Promise<DBStats> {
    const connection = await getDB();

    if (!(await tableExists())) {
        return {
            totalChunks: 0,
            documentCount: 0,
            documents: [],
            ready: false,
        };
    }

    const table = await connection.openTable(TABLE_NAME);
    const allRecords = await table.query().toArray();

    // Get unique sources - cast to VectorRecord[] for type safety
    const sources = new Set((allRecords as unknown as VectorRecord[]).map(r => r.source));

    return {
        totalChunks: allRecords.length,
        documentCount: sources.size,
        documents: Array.from(sources),
        ready: allRecords.length > 0,
    };
}

/**
 * Clear all data from the database
 * Use with caution!
 */
export async function clearDatabase(): Promise<void> {
    const connection = await getDB();

    if (await tableExists()) {
        await connection.dropTable(TABLE_NAME);
        console.log(`🗑️  Dropped table '${TABLE_NAME}'`);
    }
}

/**
 * Close the database connection
 */
export async function closeDB(): Promise<void> {
    if (db) {
        // LanceDB doesn't require explicit close, but reset our singleton
        db = null;
        console.log('🔌 Closed LanceDB connection');
    }
}

export { TABLE_NAME, DB_PATH };
