#!/usr/bin/env npx tsx
/**
 * KnowRAG - Test Query Script
 * 
 * Tests the RAG query pipeline with sample queries.
 * Usage: npx tsx scripts/test-query.ts [query]
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local and .env
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { queryRAG, buildRAGPrompt } from '../lib/rag/query.js';
import { getStats } from '../lib/rag/vectordb.js';

async function main() {
    // Get query from command line or use default
    const query = process.argv[2] || 'What is margin of safety?';

    console.log('\n' + '='.repeat(60));
    console.log('🧪 KnowRAG Query Pipeline Test');
    console.log('='.repeat(60));

    // Check database stats first
    console.log('\n📊 Database Status:');
    const stats = await getStats();
    console.log(`   Documents: ${stats.documentCount}`);
    console.log(`   Chunks: ${stats.totalChunks}`);
    console.log(`   Ready: ${stats.ready}`);

    if (!stats.ready) {
        console.log('\n❌ Database is not ready. Run ingestion first:');
        console.log('   npx tsx scripts/ingest.ts --file knowledge/\"The Intelligent Investor - BENJAMIN GRAHAM.pdf\"');
        process.exit(1);
    }

    // Run the query
    console.log(`\n📝 Query: "${query}"`);
    const result = await queryRAG(query, 5);

    // Display results
    console.log('\n' + '-'.repeat(60));
    console.log('📚 Retrieved Chunks:');
    console.log('-'.repeat(60));

    result.chunks.forEach((chunk, i) => {
        console.log(`\n${chunk.citationMarker} ${chunk.citation}`);
        console.log(`   Score: ${chunk.score.toFixed(6)}`);
        console.log(`   Text preview: "${chunk.text.substring(0, 150)}..."`);
    });

    // Display formatted context
    console.log('\n' + '-'.repeat(60));
    console.log('📄 Formatted Context for LLM:');
    console.log('-'.repeat(60));
    console.log(result.context);

    // Display full RAG prompt
    console.log('\n' + '-'.repeat(60));
    console.log('💬 Full RAG Prompt:');
    console.log('-'.repeat(60));
    console.log(buildRAGPrompt(result.context, query));

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Query completed in ${result.queryTimeMs}ms`);
    console.log('='.repeat(60) + '\n');
}

main().catch(console.error);
