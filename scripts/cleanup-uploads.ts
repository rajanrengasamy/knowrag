#!/usr/bin/env npx tsx
/**
 * Cleanup utility: clears uploaded PDFs and the temp PDF cache via API.
 *
 * Usage:
 *   npx tsx scripts/cleanup-uploads.ts --host http://localhost:3000
 */

interface Args {
    host: string;
}

function parseArgs(): Args {
    const args = process.argv.slice(2);
    const parsed: Args = { host: 'http://localhost:3000' };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--host') {
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
Cleanup uploads + temp PDF cache

Usage:
  npx tsx scripts/cleanup-uploads.ts --host http://localhost:3000

Options:
  --host   Base URL for the running dev server (default: http://localhost:3000)
  --help   Show this help
`);
}

async function main() {
    const { host } = parseArgs();
    const response = await fetch(`${host}/api/uploads/cleanup`, { method: 'POST' });
    const payload = await response.json();

    if (!response.ok) {
        throw new Error(payload.error || 'Cleanup failed.');
    }

    console.log('✅ Cleanup complete');
    console.log(`Deleted files: ${payload.deletedFiles}`);
}

main().catch((error) => {
    console.error('❌ Cleanup failed:', error instanceof Error ? error.message : error);
    process.exit(1);
});
