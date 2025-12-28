#!/usr/bin/env npx tsx
/**
 * KnowRAG - PDF Ingestion CLI Script
 * 
 * Usage:
 *   npx tsx scripts/ingest.ts --file "The Intelligent Investor - BENJAMIN GRAHAM.pdf"
 *   npx tsx scripts/ingest.ts --all
 *   npx tsx scripts/ingest.ts --stats
 * 
 * This script:
 * 1. Loads PDF(s) from the knowledge folder
 * 2. Extracts text while preserving page numbers
 * 3. Chunks the content with overlap
 * 4. Generates embeddings using OpenAI text-embedding-3-small
 * 5. Stores vectors in LanceDB for similarity search
 */

import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { ingestPDF, scanForPDFs } from '../lib/rag/ingest.js';
import { upsertChunks, getStats, closeDB } from '../lib/rag/vectordb.js';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

// Parse command line arguments
function parseArgs(): { file?: string; all: boolean; sampleSize: number; statsOnly: boolean; skipEmbed: boolean } {
    const args = process.argv.slice(2);
    let file: string | undefined;
    let all = false;
    let sampleSize = 3; // Number of sample chunks to display
    let statsOnly = false;
    let skipEmbed = false;

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--file':
            case '-f':
                file = args[++i];
                break;
            case '--all':
            case '-a':
                all = true;
                break;
            case '--samples':
            case '-s':
                sampleSize = parseInt(args[++i], 10) || 3;
                break;
            case '--stats':
                statsOnly = true;
                break;
            case '--skip-embed':
                skipEmbed = true;
                break;
            case '--help':
            case '-h':
                printHelp();
                process.exit(0);
        }
    }

    return { file, all, sampleSize, statsOnly, skipEmbed };
}

function printHelp(): void {
    console.log(`
KnowRAG PDF Ingestion Script

Usage:
  npx tsx scripts/ingest.ts [options]

Options:
  --file, -f <name>    Ingest a specific PDF file from the knowledge folder
  --all, -a            Ingest all PDFs in the knowledge folder
  --samples, -s <n>    Number of sample chunks to display (default: 3)
  --stats              Show database statistics only (no ingestion)
  --skip-embed         Skip embedding step (for testing extraction only)
  --help, -h           Show this help message

Examples:
  npx tsx scripts/ingest.ts --file "The Intelligent Investor - BENJAMIN GRAHAM.pdf"
  npx tsx scripts/ingest.ts --all
  npx tsx scripts/ingest.ts --stats
  npx tsx scripts/ingest.ts --file "book.pdf" --samples 5
  `);
}

function displaySampleChunks(chunks: Array<{ source: string; page: number; chunkIndex: number; text: string }>, count: number): void {
    console.log('\n📝 Sample Chunks (for verification):');
    console.log('-'.repeat(60));

    const samplesToShow = Math.min(count, chunks.length);
    const indices = [
        0, // First chunk
        Math.floor(chunks.length / 2), // Middle chunk
        chunks.length - 1 // Last chunk
    ].slice(0, samplesToShow);

    for (const idx of indices) {
        const chunk = chunks[idx];
        console.log(`\n[Chunk ${chunk.chunkIndex}] Page ${chunk.page} | ${chunk.text.length} chars`);
        console.log('-'.repeat(40));
        // Show first 300 chars of the chunk
        const preview = chunk.text.slice(0, 300);
        console.log(preview + (chunk.text.length > 300 ? '...' : ''));
    }
    console.log('\n');
}

async function displayStats(): Promise<void> {
    console.log('\n📊 Database Statistics');
    console.log('='.repeat(60));

    const stats = await getStats();

    if (!stats.ready) {
        console.log('   ⚠️  Database is empty. Run ingestion first.');
        return;
    }

    console.log(`   Total chunks: ${stats.totalChunks}`);
    console.log(`   Documents indexed: ${stats.documentCount}`);
    console.log(`   Documents:`);
    for (const doc of stats.documents) {
        console.log(`     - ${doc}`);
    }
    console.log('='.repeat(60) + '\n');
}

async function main(): Promise<void> {
    const { file, all, sampleSize, statsOnly, skipEmbed } = parseArgs();

    // Stats-only mode
    if (statsOnly) {
        await displayStats();
        await closeDB();
        return;
    }

    if (!file && !all) {
        console.error('❌ Error: Please specify --file <filename>, --all, or --stats');
        console.error('   Run with --help for usage information');
        process.exit(1);
    }

    // Check for API key if we're embedding
    if (!skipEmbed && !process.env.OPENAI_API_KEY) {
        console.error('❌ Error: OPENAI_API_KEY environment variable is not set.');
        console.error('   Please add it to your .env.local file.');
        console.error('   Example: OPENAI_API_KEY=sk-...');
        process.exit(1);
    }

    const knowledgePath = path.join(process.cwd(), 'knowledge');

    if (!fs.existsSync(knowledgePath)) {
        console.error(`❌ Error: Knowledge folder not found at ${knowledgePath}`);
        process.exit(1);
    }

    let pdfPaths: string[] = [];

    if (file) {
        const pdfPath = path.join(knowledgePath, file);
        if (!fs.existsSync(pdfPath)) {
            console.error(`❌ Error: PDF file not found: ${file}`);
            console.error(`   Looking in: ${knowledgePath}`);

            // Show available files
            const available = scanForPDFs(knowledgePath);
            if (available.length > 0) {
                console.error('\n   Available PDFs:');
                available.forEach(f => console.error(`   - ${path.basename(f)}`));
            }
            process.exit(1);
        }
        pdfPaths = [pdfPath];
    } else if (all) {
        pdfPaths = scanForPDFs(knowledgePath);
        if (pdfPaths.length === 0) {
            console.error('❌ Error: No PDF files found in knowledge folder');
            process.exit(1);
        }
    }

    // Process each PDF
    let totalChunks = 0;
    let totalPages = 0;
    let totalEmbedded = 0;

    for (const pdfPath of pdfPaths) {
        try {
            // Step 1: Extract and chunk the PDF
            const { chunks, stats } = await ingestPDF(pdfPath);
            totalChunks += stats.chunksCreated;
            totalPages += stats.pagesProcessed;

            // Display sample chunks for verification
            displaySampleChunks(chunks, sampleSize);

            // Verify page numbers are preserved
            console.log('🔍 Page Number Verification:');
            const pageDistribution = new Map<number, number>();
            for (const chunk of chunks) {
                pageDistribution.set(chunk.page, (pageDistribution.get(chunk.page) || 0) + 1);
            }

            const pages = Array.from(pageDistribution.keys()).sort((a, b) => a - b);
            console.log(`   Page range: ${pages[0]} - ${pages[pages.length - 1]}`);
            console.log(`   Pages with chunks: ${pages.length}`);

            // Show first 5 and last 5 page distributions
            const pageInfo = Array.from(pageDistribution.entries())
                .sort((a, b) => a[0] - b[0]);

            if (pageInfo.length <= 10) {
                pageInfo.forEach(([page, count]) => {
                    console.log(`   Page ${page}: ${count} chunks`);
                });
            } else {
                pageInfo.slice(0, 5).forEach(([page, count]) => {
                    console.log(`   Page ${page}: ${count} chunks`);
                });
                console.log('   ...');
                pageInfo.slice(-5).forEach(([page, count]) => {
                    console.log(`   Page ${page}: ${count} chunks`);
                });
            }

            // Step 2: Embed and store in LanceDB (unless skipped)
            if (!skipEmbed) {
                console.log('\n📦 Storing in LanceDB...');
                const embedded = await upsertChunks(chunks);
                totalEmbedded += embedded;
            } else {
                console.log('\n⏭️  Skipping embedding (--skip-embed flag)');
            }

        } catch (error) {
            console.error(`❌ Error processing ${path.basename(pdfPath)}:`, error);
        }
    }

    if (pdfPaths.length > 1) {
        console.log('\n' + '='.repeat(60));
        console.log('📊 Total Summary');
        console.log('='.repeat(60));
        console.log(`   PDFs processed: ${pdfPaths.length}`);
        console.log(`   Total pages: ${totalPages}`);
        console.log(`   Total chunks: ${totalChunks}`);
        if (!skipEmbed) {
            console.log(`   Total embedded: ${totalEmbedded}`);
        }
    }

    // Show final database stats
    if (!skipEmbed) {
        await displayStats();
    }

    await closeDB();

    console.log('\n✅ Ingestion complete!\n');

    if (skipEmbed) {
        console.log('Next step: Run without --skip-embed to store in LanceDB.');
    } else {
        console.log('Vectors are stored in /data/lancedb and ready for querying.');
    }
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
