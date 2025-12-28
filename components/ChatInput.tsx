'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface ChatInputProps {
    onSend: (message: string) => void;
    disabled?: boolean;
    placeholder?: string;
}

/**
 * ChatInput - Text input component for sending messages
 * Task 7.5 - Features auto-resize textarea, keyboard shortcuts, and premium styling
 */
export function ChatInput({ onSend, disabled = false, placeholder = 'Ask a question about your documents...' }: ChatInputProps) {
    const [message, setMessage] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
        }
    }, [message]);

    // Focus input on mount
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
            // Reset height
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        // Send on Enter (without Shift)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const isSubmitDisabled = disabled || !message.trim();

    return (
        <div className="relative">
            <div
                className={`
          flex items-end gap-3 p-4 rounded-2xl
          bg-[var(--muted)] border border-[var(--border)]
          transition-all duration-200
          focus-within:border-[var(--accent)] focus-within:shadow-lg focus-within:shadow-[var(--accent)]/10
          ${disabled ? 'opacity-60' : ''}
        `}
            >
                {/* Textarea */}
                <textarea
                    id="chat-input"
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    placeholder={placeholder}
                    rows={1}
                    className={`
            flex-1 resize-none bg-transparent
            text-[var(--foreground)] placeholder-[var(--muted-foreground)]
            text-sm leading-relaxed
            focus:outline-none
            disabled:cursor-not-allowed
            min-h-[24px] max-h-[200px]
          `}
                    aria-label="Message input"
                />

                {/* Send Button */}
                <button
                    id="send-button"
                    type="button"
                    onClick={handleSend}
                    disabled={isSubmitDisabled}
                    className={`
            flex-shrink-0 p-2.5 rounded-xl
            bg-[var(--accent)] text-[var(--accent-foreground)]
            transition-all duration-200 ease-out
            hover:bg-[var(--accent-hover)] hover:scale-105
            active:scale-95
            disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100
            focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50
          `}
                    aria-label="Send message"
                >
                    <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                        />
                    </svg>
                </button>
            </div>

            {/* Keyboard hint */}
            <p className="mt-2 text-center text-[10px] text-[var(--muted-foreground)]">
                Press <kbd className="px-1.5 py-0.5 rounded bg-[var(--muted)] border border-[var(--border)] font-mono text-[10px]">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 rounded bg-[var(--muted)] border border-[var(--border)] font-mono text-[10px]">Shift+Enter</kbd> for new line
            </p>
        </div>
    );
}

export default ChatInput;
