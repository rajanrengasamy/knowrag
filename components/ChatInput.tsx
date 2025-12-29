'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { motion } from "motion/react";

interface ChatInputProps {
    onSend: (message: string) => void;
    disabled?: boolean;
    placeholder?: string;
}

const springPreset = { type: "spring", stiffness: 400, damping: 30 };

/**
 * ChatInput — Editorial Premium Input Component
 * 
 * Features: Animated focus states, gradient send button,
 * auto-resize textarea, keyboard hints
 */
export function ChatInput({
    onSend,
    disabled = false,
    placeholder = 'Ask about your documents...'
}: ChatInputProps) {
    const [message, setMessage] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        if (trimmedMessage && !disabled) {
            onSend(trimmedMessage);
            setMessage('');
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

    const isSubmitDisabled = disabled || !message.trim();

    return (
        <div className="space-y-3">
            <motion.div
                animate={{
                    borderColor: isFocused ? "var(--accent-primary)" : "var(--border-default)",
                    boxShadow: isFocused
                        ? "0 0 0 4px rgba(245, 158, 11, 0.1), 0 8px 32px rgba(0, 0, 0, 0.2)"
                        : "0 4px 24px rgba(0, 0, 0, 0.15)"
                }}
                transition={{ duration: 0.2 }}
                className={`
                    flex items-end gap-4 p-4 rounded-2xl
                    bg-[var(--bg-surface)] border
                    ${disabled ? 'opacity-60' : ''}
                `}
            >
                {/* Textarea */}
                <div className="flex-1 relative">
                    <textarea
                        id="chat-input"
                        ref={textareaRef}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
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
                <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-default)]">
                        ↵
                    </kbd>
                    SEND
                </span>
                <span className="text-[var(--border-strong)]">•</span>
                <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-default)]">
                        ⇧
                    </kbd>
                    +
                    <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-default)]">
                        ↵
                    </kbd>
                    NEW LINE
                </span>
            </motion.div>
        </div>
    );
}

export default ChatInput;
