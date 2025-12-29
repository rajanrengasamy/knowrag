#!/usr/bin/env npx tsx
/**
 * Sanity check: attach PDF -> query -> citations
 *
 * Usage:
 *   npx tsx scripts/sanity-attachment.ts --pdf /path/to/file.pdf --query "Your question" --model openai --host http://localhost:3000
 */

import * as fs from 'fs';
import * as path from 'path';
import { Blob } from 'buffer';

interface Args {
    pdfPath?: string;
    query: string;
    model: 'kimi' | 'gemini' | 'openai' | 'gpt-4o';
    host: string;
}

function parseArgs(): Args {
    const args = process.argv.slice(2);
    const parsed: Args = {
        query: 'Summarize the key points in this PDF.',
        model: 'kimi',
        host: 'http://localhost:3000',
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--pdf') {
            parsed.pdfPath = args[++i];
        } else if (arg === '--query') {
            parsed.query = args[++i];
        } else if (arg === '--model') {
            const model = args[++i] as Args['model'];
            parsed.model = model;
        } else if (arg === '--host') {
            parsed.host = args[++i];
        } else if (arg === '--help') {
            printHelp();
            process.exit(0);
        }
    }

    return parsed;
}

function printHelp(): void {
    console.log(`
Sanity check: attach PDF -> query -> citations

Usage:
  npx tsx scripts/sanity-attachment.ts --pdf /path/to/file.pdf --query "Your question" --model openai --host http://localhost:3000

Options:
  --pdf     Path to a PDF file to attach
  --query   Question to ask
  --model   kimi | gemini | openai | gpt-4o (default: kimi)
  --host    Base URL for the running dev server (default: http://localhost:3000)
  --help    Show this help
`);
}

async function uploadPdf(host: string, pdfPath: string): Promise<{ filename: string; name: string }> {
    const fileBuffer = await fs.promises.readFile(pdfPath);
    const fileName = path.basename(pdfPath);

    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: 'application/pdf' });
    formData.append('file', blob as unknown as globalThis.Blob, fileName);

    const response = await fetch(`${host}/api/uploads`, {
        method: 'POST',
        body: formData,
    });

    const payload = await response.json();
    if (!response.ok) {
        throw new Error(payload.error || 'Upload failed.');
    }

    return { filename: payload.filename, name: fileName };
}

async function chatWithPdf(host: string, model: Args['model'], query: string, pdf: { filename: string; name: string }) {
    const response = await fetch(`${host}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query,
            model,
            pdfs: [pdf],
        }),
    });

    if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || 'Chat failed.');
    }

    const raw = await response.text();
    const [header, content] = raw.split('|||');
    if (!content || !header) {
        throw new Error('Missing citation header delimiter in response.');
    }

    const parsed = JSON.parse(header);
    const citations = parsed.citations || [];
    const hasBadge = /\[\d+\]/.test(content);

    return { citations, content, hasBadge };
}

async function main() {
    const { pdfPath, query, model, host } = parseArgs();

    if (!pdfPath) {
        printHelp();
        process.exit(1);
    }

    if (!fs.existsSync(pdfPath)) {
        throw new Error(`PDF not found: ${pdfPath}`);
    }

    console.log(`📄 Uploading PDF: ${pdfPath}`);
    const pdf = await uploadPdf(host, pdfPath);
    console.log(`✅ Uploaded as: ${pdf.filename}`);

    console.log(`💬 Querying with model=${model}`);
    const result = await chatWithPdf(host, model, query, pdf);

    console.log(`📎 Citations returned: ${result.citations.length}`);
    console.log(`🔖 Badge markers in response: ${result.hasBadge ? 'yes' : 'no'}`);
    console.log('\n--- Response Preview ---');
    console.log(result.content.slice(0, 800));
    console.log('------------------------\n');
}

main().catch((error) => {
    console.error('❌ Sanity check failed:', error instanceof Error ? error.message : error);
    process.exit(1);
});
