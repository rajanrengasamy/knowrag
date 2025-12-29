import * as fs from 'fs';
import * as path from 'path';
import { loadPDF, chunkDocument } from './ingest';
import { embedTexts } from './embeddings';
import type { ChunkMetadata } from './types';

const TEMP_PDF_TTL_MS = Number(process.env.TEMP_PDF_TTL_MS || 10 * 60 * 1000);

interface TempIndex {
    chunks: ChunkMetadata[];
    vectors: number[][];
    size: number;
    mtimeMs: number;
    expiresAt: number;
}

const cache = new Map<string, TempIndex>();
const pending = new Map<string, Promise<TempIndex>>();

function l2Distance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        const diff = a[i] - b[i];
        sum += diff * diff;
    }
    return Math.sqrt(sum);
}

function cleanupExpired(now: number) {
    for (const [key, entry] of cache.entries()) {
        if (entry.expiresAt <= now) {
            cache.delete(key);
        }
    }
}

export async function getTempIndex(pdfPath: string): Promise<TempIndex> {
    const resolvedPath = path.resolve(pdfPath);
    const now = Date.now();
    cleanupExpired(now);

    const stats = await fs.promises.stat(resolvedPath);
    const existing = cache.get(resolvedPath);
    if (
        existing &&
        existing.expiresAt > now &&
        existing.size === stats.size &&
        existing.mtimeMs === stats.mtimeMs
    ) {
        existing.expiresAt = now + TEMP_PDF_TTL_MS;
        return existing;
    }

    const inFlight = pending.get(resolvedPath);
    if (inFlight) {
        return inFlight;
    }

    const buildPromise = (async () => {
        const extraction = await loadPDF(resolvedPath);
        const chunks = chunkDocument(extraction);
        const texts = chunks.map((chunk) => chunk.text);
        const vectors = await embedTexts(texts);

        const entry: TempIndex = {
            chunks,
            vectors,
            size: stats.size,
            mtimeMs: stats.mtimeMs,
            expiresAt: now + TEMP_PDF_TTL_MS,
        };

        cache.set(resolvedPath, entry);
        return entry;
    })();

    pending.set(resolvedPath, buildPromise);
    try {
        const entry = await buildPromise;
        return entry;
    } finally {
        pending.delete(resolvedPath);
    }
}

export function searchTempIndex(
    queryEmbedding: number[],
    index: TempIndex,
    topK: number
): Array<ChunkMetadata & { _distance: number }> {
    const scored = index.vectors.map((vector, idx) => ({
        ...index.chunks[idx],
        _distance: l2Distance(queryEmbedding, vector),
    }));

    scored.sort((a, b) => a._distance - b._distance);
    return scored.slice(0, topK);
}

export function clearTempCache(): void {
    cache.clear();
    pending.clear();
}
