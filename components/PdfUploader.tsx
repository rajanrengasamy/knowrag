'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { motion } from "motion/react";

interface PdfUploaderProps {
    disabled?: boolean;
    onComplete?: () => void;
}

const MAX_PDF_MB = Number(process.env.NEXT_PUBLIC_MAX_PDF_UPLOAD_MB || 200);
const MAX_PDF_BYTES = MAX_PDF_MB * 1024 * 1024;

type UploadStatus = 'idle' | 'uploading' | 'ingesting' | 'success' | 'error';

export function PdfUploader({ disabled = false, onComplete }: PdfUploaderProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [status, setStatus] = useState<UploadStatus>('idle');
    const [message, setMessage] = useState<string | null>(null);

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        event.target.value = '';
        setMessage(null);

        if (!file.name.toLowerCase().endsWith('.pdf')) {
            setStatus('error');
            setMessage('Please select a PDF file.');
            return;
        }

        if (file.size > MAX_PDF_BYTES) {
            setStatus('error');
            setMessage(`PDF exceeds ${MAX_PDF_MB}MB limit.`);
            return;
        }

        try {
            setStatus('uploading');

            const formData = new FormData();
            formData.append('file', file);

            const uploadResponse = await fetch('/api/uploads', {
                method: 'POST',
                body: formData,
            });

            const uploadPayload = await uploadResponse.json();
            if (!uploadResponse.ok) {
                throw new Error(uploadPayload.error || 'Upload failed.');
            }

            setStatus('ingesting');

            const ingestResponse = await fetch('/api/ingest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: uploadPayload.filename }),
            });

            const ingestPayload = await ingestResponse.json();
            if (!ingestResponse.ok) {
                throw new Error(ingestPayload.error || 'Ingestion failed.');
            }

            setStatus('success');
            setMessage('Upload & ingestion complete.');
            onComplete?.();

            setTimeout(() => {
                setStatus('idle');
                setMessage(null);
            }, 2000);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Upload failed.';
            setStatus('error');
            setMessage(errorMessage);
        }
    };

    const label = (() => {
        switch (status) {
            case 'uploading':
                return 'Uploading...';
            case 'ingesting':
                return 'Ingesting...';
            case 'success':
                return 'Done';
            case 'error':
                return 'Retry Upload';
            default:
                return 'Upload PDF';
        }
    })();

    return (
        <div className="flex flex-col items-end gap-1">
            <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
            />

            <motion.button
                type="button"
                onClick={triggerFileInput}
                disabled={disabled || status === 'uploading' || status === 'ingesting'}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`
                    inline-flex items-center gap-2 px-4 py-2 rounded-xl
                    bg-[var(--bg-surface)] border border-[var(--border-default)]
                    text-xs font-mono tracking-widest uppercase
                    transition-all duration-200
                    hover:border-[var(--border-strong)] hover:shadow-lg hover:shadow-black/20
                    ${status === 'error' ? 'text-[var(--error)] border-[var(--error)]/40' : 'text-[var(--text-primary)]'}
                    disabled:opacity-60 disabled:cursor-not-allowed
                `}
                aria-label="Upload PDF"
            >
                <span className="text-base">📄</span>
                {label}
            </motion.button>

            {message && (
                <span className={`text-[10px] font-mono ${status === 'error' ? 'text-[var(--error)]' : 'text-[var(--text-tertiary)]'}`}>
                    {message}
                </span>
            )}
        </div>
    );
}

export default PdfUploader;
