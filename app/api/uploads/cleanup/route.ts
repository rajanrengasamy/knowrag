import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { clearTempCache } from '@/lib/rag/temporary';

const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads');

export async function POST() {
    try {
        let deleted = 0;

        if (fs.existsSync(UPLOAD_DIR)) {
            const entries = await fs.promises.readdir(UPLOAD_DIR, { withFileTypes: true });

            for (const entry of entries) {
                if (!entry.isFile()) continue;

                const filePath = path.join(UPLOAD_DIR, entry.name);
                const resolved = path.resolve(filePath);
                const resolvedDir = path.resolve(UPLOAD_DIR);

                if (!resolved.startsWith(resolvedDir)) {
                    continue;
                }

                await fs.promises.unlink(resolved);
                deleted += 1;
            }
        }

        clearTempCache();

        return NextResponse.json({
            message: 'Uploads and temp cache cleared.',
            deletedFiles: deleted,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Cleanup failed.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
