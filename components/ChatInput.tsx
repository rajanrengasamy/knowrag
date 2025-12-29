'use client';

import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent, ClipboardEvent } from 'react';
import { motion, AnimatePresence } from "motion/react";

export interface PdfAttachment {
    name: string;
    filename: string;
}

interface ChatInputProps {
    onSend: (message: string, images: string[], pdfs: PdfAttachment[]) => void;
    disabled?: boolean;
    placeholder?: string;
}

const springPreset = { type: "spring" as const, stiffness: 400, damping: 30 };
const MAX_IMAGE_COUNT = 4;
const MAX_IMAGE_MB = 5;
const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const MAX_PDF_COUNT = Number(process.env.NEXT_PUBLIC_MAX_PDF_COUNT) || 3;
const MAX_PDF_MB = Number(process.env.NEXT_PUBLIC_MAX_PDF_UPLOAD_MB || 200);
const MAX_PDF_BYTES = MAX_PDF_MB * 1024 * 1024;

/**
 * ChatInput — Editorial Premium Input Component
 * 
 * Features: Animated focus states, gradient send button,
 * auto-resize textarea, keyboard hints, image attachments
 */
export function ChatInput({
    onSend,
    disabled = false,
    placeholder = 'Ask about your documents...'
}: ChatInputProps) {
    const [message, setMessage] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [attachedImages, setAttachedImages] = useState<string[]>([]);
    const [attachedPdfs, setAttachedPdfs] = useState<PdfAttachment[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isDragActive, setIsDragActive] = useState(false);
    const [isPdfUploading, setIsPdfUploading] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pdfInputRef = useRef<HTMLInputElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
        }
    }, [message]);

    // Focus on mount
    useEffect(() => {
        if (textareaRef.current && !disabled) {
            textareaRef.current.focus();
        }
    }, [disabled]);

    const handleSend = () => {
        const trimmedMessage = message.trim();
        if ((trimmedMessage || attachedImages.length > 0 || attachedPdfs.length > 0) && !disabled) {
            onSend(trimmedMessage, attachedImages, attachedPdfs);
            setMessage('');
            setAttachedImages([]);
            setAttachedPdfs([]);
            setError(null);
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const convertFileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const attachFiles = async (files: FileList | File[]) => {
        const fileArray = Array.from(files);
        let slotsRemaining = MAX_IMAGE_COUNT - attachedImages.length;
        if (slotsRemaining <= 0) {
            setError(`You can attach up to ${MAX_IMAGE_COUNT} images.`);
            return;
        }

        for (const file of fileArray) {
            if (slotsRemaining <= 0) {
                setError(`You can attach up to ${MAX_IMAGE_COUNT} images.`);
                break;
            }

            if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
                setError(`Unsupported image type: ${file.type || 'unknown'}.`);
                continue;
            }

            if (file.size > MAX_IMAGE_BYTES) {
                setError(`Image exceeds ${MAX_IMAGE_MB}MB limit.`);
                continue;
            }

            try {
                const base64 = await convertFileToBase64(file);
                setAttachedImages(prev => [...prev, base64]);
                setError(null);
                slotsRemaining -= 1;
            } catch (error) {
                console.error('Error converting file:', error);
                setError('Failed to read image file.');
            }
        }
    };

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            await attachFiles(e.target.files);
            // Reset input so same file can be selected again
            e.target.value = '';
        }
    };

    const handlePaste = async (e: ClipboardEvent<HTMLTextAreaElement>) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    e.preventDefault();
                    try {
                        await attachFiles([file]);
                    } catch (error) {
                        console.error('Error handling paste:', error);
                    }
                }
            }
        }
    };

    const removeImage = (index: number) => {
        setAttachedImages(prev => prev.filter((_, i) => i !== index));
    };

    const removePdf = (index: number) => {
        setAttachedPdfs(prev => prev.filter((_, i) => i !== index));
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const triggerPdfInput = () => {
        pdfInputRef.current?.click();
    };

    const uploadPdf = async (file: File): Promise<PdfAttachment | null> => {
        if (file.size > MAX_PDF_BYTES) {
            setError(`PDF exceeds ${MAX_PDF_MB}MB limit.`);
            return null;
        }

        const formData = new FormData();
        formData.append('file', file);

        let response: Response;
        try {
            response = await fetch('/api/uploads', {
                method: 'POST',
                body: formData,
            });
        } catch (error) {
            console.error('PDF upload request failed:', error);
            setError('Failed to upload PDF.');
            return null;
        }

        let payload: { filename?: string; error?: string } = {};
        try {
            payload = await response.json();
        } catch (error) {
            console.error('PDF upload response parsing failed:', error);
        }

        if (!response.ok) {
            setError(payload.error || 'Failed to upload PDF.');
            return null;
        }

        if (typeof payload.filename !== 'string' || payload.filename.length === 0) {
            setError('Upload response missing filename.');
            return null;
        }

        return { name: file.name, filename: payload.filename };
    };

    const attachPdfs = async (files: File[]) => {
        if (files.length === 0) {
            return;
        }

        let slotsRemaining = MAX_PDF_COUNT - attachedPdfs.length;
        if (slotsRemaining <= 0) {
            setError(`You can attach up to ${MAX_PDF_COUNT} PDFs.`);
            return;
        }

        setIsPdfUploading(true);
        setError(null);

        try {
            for (const file of files) {
                if (slotsRemaining <= 0) {
                    setError(`You can attach up to ${MAX_PDF_COUNT} PDFs.`);
                    break;
                }

                if (!file.name.toLowerCase().endsWith('.pdf')) {
                    setError('Only PDF files are supported.');
                    continue;
                }

                try {
                    const attachment = await uploadPdf(file);
                    if (attachment) {
                        setAttachedPdfs(prev => [...prev, attachment]);
                        slotsRemaining -= 1;
                    }
                } catch (error) {
                    console.error('PDF upload failed:', error);
                    setError('Failed to upload PDF.');
                }
            }
        } finally {
            setIsPdfUploading(false);
        }
    };

    const handlePdfChange = async (e: ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) {
            return;
        }

        const files = Array.from(e.target.files);
        e.target.value = '';
        await attachPdfs(files);
    };

    const isSubmitDisabled = disabled || isPdfUploading || (!message.trim() && attachedImages.length === 0 && attachedPdfs.length === 0);

    return (
        <div
            className="space-y-3"
            onDragOver={(e) => {
                e.preventDefault();
                if (!disabled) setIsDragActive(true);
            }}
            onDragLeave={() => setIsDragActive(false)}
            onDrop={(e) => {
                e.preventDefault();
                setIsDragActive(false);
                if (!disabled && e.dataTransfer.files.length > 0) {
                    const files = Array.from(e.dataTransfer.files);
                    const imageFiles = files.filter(file => file.type.startsWith('image/'));
                    const pdfFiles = files.filter(file => file.name.toLowerCase().endsWith('.pdf'));

                    if (imageFiles.length > 0) {
                        void attachFiles(imageFiles);
                    }
                    if (pdfFiles.length > 0) {
                        void attachPdfs(pdfFiles);
                    }
                }
            }}
        >
            {/* Image Previews */}
            <AnimatePresence>
                {attachedImages.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                        {attachedImages.map((img, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="relative group"
                            >
                                <img
                                    src={img}
                                    alt="preview"
                                    className="w-16 h-16 object-cover rounded-xl border border-[var(--border-default)]"
                                />
                                <button
                                    onClick={() => removeImage(index)}
                                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </motion.div>
                        ))}
                    </div>
                )}
            </AnimatePresence>

            {/* PDF Attachments */}
            <AnimatePresence>
                {attachedPdfs.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                        {attachedPdfs.map((pdf, index) => (
                            <motion.div
                                key={`${pdf.filename}-${index}`}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)]"
                            >
                                <span className="text-sm">📄</span>
                                <span className="text-xs text-[var(--text-primary)] max-w-[160px] truncate">
                                    {pdf.name}
                                </span>
                                <button
                                    onClick={() => removePdf(index)}
                                    className="w-5 h-5 bg-[var(--error)]/80 rounded-full text-white flex items-center justify-center shadow-md hover:bg-[var(--error)] transition-colors"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </motion.div>
                        ))}
                    </div>
                )}
            </AnimatePresence>

            <motion.div
                animate={{
                    borderColor: isFocused ? "var(--accent-primary)" : "var(--border-default)",
                    boxShadow: isFocused
                        ? "0 0 0 4px rgba(245, 158, 11, 0.1), 0 8px 32px rgba(0, 0, 0, 0.2)"
                        : "0 4px 24px rgba(0, 0, 0, 0.15)"
                }}
                transition={{ duration: 0.2 }}
                className={`
                    flex items-end gap-3 p-4 rounded-2xl
                    bg-[var(--bg-surface)] border
                    ${isDragActive ? 'border-[var(--accent-secondary)]' : ''}
                    ${disabled ? 'opacity-60' : ''}
                `}
            >
                {/* File Attachment Button */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    multiple
                    disabled={disabled}
                    className="hidden"
                />
                <input
                    type="file"
                    ref={pdfInputRef}
                    onChange={handlePdfChange}
                    accept="application/pdf"
                    multiple
                    disabled={disabled || isPdfUploading}
                    className="hidden"
                />
                <motion.button
                    type="button"
                    onClick={triggerFileInput}
                    disabled={disabled}
                    whileHover={{ scale: 1.1, color: "var(--accent-primary)" }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 text-[var(--text-tertiary)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-elevated)] rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Attach image"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                </motion.button>
                <motion.button
                    type="button"
                    onClick={triggerPdfInput}
                    disabled={disabled || isPdfUploading}
                    whileHover={{ scale: 1.1, color: "var(--accent-secondary)" }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 text-[var(--text-tertiary)] hover:text-[var(--accent-secondary)] hover:bg-[var(--bg-elevated)] rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Attach PDF"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10M7 11h10M7 15h6M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6z" />
                    </svg>
                </motion.button>

                {/* Textarea */}
                <div className="flex-1 relative">
                    <textarea
                        id="chat-input"
                        ref={textareaRef}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        disabled={disabled}
                        placeholder={placeholder}
                        rows={1}
                        className="
                            w-full resize-none bg-transparent
                            text-[var(--text-primary)] placeholder-[var(--text-tertiary)]
                            text-[15px] leading-relaxed
                            focus:outline-none
                            disabled:cursor-not-allowed
                            min-h-[28px] max-h-[160px]
                            py-1.5
                        "
                        aria-label="Message input"
                    />
                </div>

                {/* Send Button */}
                <motion.button
                    id="send-button"
                    type="button"
                    onClick={handleSend}
                    disabled={isSubmitDisabled}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={springPreset}
                    className={`
                        relative flex-shrink-0 p-3 rounded-xl
                        bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-tertiary)]
                        text-[var(--bg-primary)] font-semibold
                        shadow-lg shadow-[var(--accent-primary)]/25
                        disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]
                        transition-shadow duration-200
                    `}
                    aria-label="Send message"
                >
                    {/* Button glow */}
                    {!isSubmitDisabled && (
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-tertiary)] blur-xl opacity-40" />
                    )}
                    <svg
                        className="relative w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                        />
                    </svg>
                </motion.button>
            </motion.div>

            {/* Keyboard hints */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center justify-center gap-4 text-[10px] font-mono text-[var(--text-tertiary)]"
            >
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                        <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-default)]">
                            ↵
                        </kbd>
                        SEND
                    </span>
                    <span className="text-[var(--border-strong)]">•</span>
                    <span className="flex items-center gap-1.5">
                        Attach images or paste from clipboard
                    </span>
                </div>
            </motion.div>

            {error && (
                <div className="text-xs text-[var(--error)] font-mono">
                    {error}
                </div>
            )}
        </div>
    );
}

export default ChatInput;
