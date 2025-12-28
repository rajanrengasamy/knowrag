'use client';

import { useEffect, useRef } from 'react';

export type MessageRole = 'user' | 'assistant';

export interface Message {
    id: string;
    role: MessageRole;
    content: string;
    timestamp: Date;
    isStreaming?: boolean;
}

interface ChatMessageProps {
    message: Message;
}

/**
 * ChatMessage - Message bubble component with distinct user/assistant styling
 * Task 7.6 - Features markdown-like rendering, citation highlighting, and streaming indicator
 */
export function ChatMessage({ message }: ChatMessageProps) {
    const messageRef = useRef<HTMLDivElement>(null);

    // Scroll into view when streaming
    useEffect(() => {
        if (message.isStreaming && messageRef.current) {
            messageRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, [message.content, message.isStreaming]);

    const isUser = message.role === 'user';

    // Simple markdown-like rendering for citations and formatting
    const renderContent = (content: string) => {
        if (!content) return null;

        // Highlight citations like (Book Title, p. XX)
        const citationRegex = /\(([^)]+,\s*p\.\s*\d+(?:-\d+)?)\)/g;
        const parts = content.split(citationRegex);

        return parts.map((part, index) => {
            // Every odd index is a citation match
            if (index % 2 === 1) {
                return (
                    <span
                        key={index}
                        className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded text-xs font-medium bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/30"
                    >
                        📖 {part}
                    </span>
                );
            }

            // Regular text - handle bold (**text**) and newlines
            return part.split('\n').map((line, lineIndex, lines) => (
                <span key={`${index}-${lineIndex}`}>
                    {line.split(/\*\*(.+?)\*\*/g).map((segment, segIndex) => (
                        segIndex % 2 === 1 ? (
                            <strong key={segIndex} className="font-semibold">{segment}</strong>
                        ) : (
                            segment
                        )
                    ))}
                    {lineIndex < lines.length - 1 && <br />}
                </span>
            ));
        });
    };

    return (
        <div
            ref={messageRef}
            id={`message-${message.id}`}
            className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
        >
            <div
                className={`
          max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl
          ${isUser
                        ? 'bg-[var(--user-bubble)] text-[var(--user-bubble-foreground)] rounded-br-md'
                        : 'bg-[var(--assistant-bubble)] text-[var(--assistant-bubble-foreground)] rounded-bl-md border border-[var(--border)]'
                    }
        `}
            >
                {/* Message content */}
                <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {renderContent(message.content)}

                    {/* Streaming cursor */}
                    {message.isStreaming && (
                        <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse rounded-sm" />
                    )}
                </div>

                {/* Timestamp */}
                <div
                    className={`
            mt-2 text-[10px] opacity-60
            ${isUser ? 'text-right' : 'text-left'}
          `}
                >
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
        </div>
    );
}

/**
 * TypingIndicator - Shows when the assistant is thinking
 */
export function TypingIndicator() {
    return (
        <div className="flex justify-start animate-in fade-in duration-300">
            <div className="bg-[var(--assistant-bubble)] border border-[var(--border)] px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[var(--muted-foreground)] typing-dot" />
                    <div className="w-2 h-2 rounded-full bg-[var(--muted-foreground)] typing-dot" />
                    <div className="w-2 h-2 rounded-full bg-[var(--muted-foreground)] typing-dot" />
                </div>
            </div>
        </div>
    );
}

export default ChatMessage;
