'use client';

import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent, ClipboardEvent } from 'react';
import { motion, AnimatePresence } from "motion/react";

interface ChatInputProps {
    onSend: (message: string, images: string[]) => void;
    disabled?: boolean;
    placeholder?: string;
}

const springPreset = { type: "spring" as const, stiffness: 400, damping: 30 };

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
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
        if ((trimmedMessage || attachedImages.length > 0) && !disabled) {
            onSend(trimmedMessage, attachedImages);
            setMessage('');
            setAttachedImages([]);
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

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            if (file.type.startsWith('image/')) {
                try {
                    const base64 = await convertFileToBase64(file);
                    setAttachedImages(prev => [...prev, base64]);
                } catch (error) {
                    console.error('Error converting file:', error);
                }
            }
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
                        const base64 = await convertFileToBase64(file);
                        setAttachedImages(prev => [...prev, base64]);
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

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const isSubmitDisabled = disabled || (!message.trim() && attachedImages.length === 0);

    return (
        <div className="space-y-3">
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
                    ${disabled ? 'opacity-60' : ''}
                `}
            >
                {/* File Attachment Button */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                />
                <motion.button
                    type="button"
                    onClick={triggerFileInput}
                    whileHover={{ scale: 1.1, color: "var(--accent-primary)" }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 text-[var(--text-tertiary)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-elevated)] rounded-xl transition-colors"
                    title="Attach image"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
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
        </div>
    );
}

export default ChatInput;
