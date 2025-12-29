import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads');
const MAX_PDF_MB = Number(process.env.MAX_PDF_UPLOAD_MB || 200);
const MAX_PDF_BYTES = MAX_PDF_MB * 1024 * 1024;

function isFileLike(value: unknown): value is File {
    return Boolean(
        value &&
        typeof value === 'object' &&
        typeof (value as File).arrayBuffer === 'function' &&
        typeof (value as File).name === 'string' &&
        typeof (value as File).size === 'number'
    );
}

function sanitizeFilename(filename: string): string {
    const base = path.basename(filename);
    return base.replace(/[^\w.\- ]+/g, '_');
}

function ensureUniqueFilename(dir: string, filename: string): string {
    const ext = path.extname(filename);
    const base = path.basename(filename, ext);
    let candidate = filename;
    let counter = 1;

    while (fs.existsSync(path.join(dir, candidate))) {
        candidate = `${base}-${Date.now()}-${counter}${ext}`;
        counter += 1;
    }

    return candidate;
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!isFileLike(file)) {
            return NextResponse.json({ error: 'Missing PDF file upload.' }, { status: 400 });
        }

        if (!file.name.toLowerCase().endsWith('.pdf')) {
            return NextResponse.json({ error: 'Only PDF files are supported.' }, { status: 400 });
        }

        if (file.size === 0) {
            return NextResponse.json({ error: 'Uploaded PDF is empty.' }, { status: 400 });
        }

        if (file.size > MAX_PDF_BYTES) {
            return NextResponse.json(
                { error: `PDF exceeds ${MAX_PDF_MB}MB limit.` },
                { status: 413 }
            );
        }

        await fs.promises.mkdir(UPLOAD_DIR, { recursive: true });

        const safeName = sanitizeFilename(file.name);
        const uniqueName = ensureUniqueFilename(UPLOAD_DIR, safeName);
        const filePath = path.join(UPLOAD_DIR, uniqueName);
        const buffer = Buffer.from(await file.arrayBuffer());

        await fs.promises.writeFile(filePath, buffer);

        return NextResponse.json({
            filename: uniqueName,
            size: file.size,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Upload failed.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
