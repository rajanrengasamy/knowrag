'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from "motion/react";

export type MessageRole = 'user' | 'assistant';

/**
 * Citation metadata from the RAG pipeline
 */
export interface Citation {
    marker: string;
    citation: string;
    source: string;
    page: number;
}

export interface Message {
    id: string;
    role: MessageRole;
    content: string;
    timestamp: Date;
    isStreaming?: boolean;
    images?: string[]; // Base64 strings
    pdfs?: string[];
}

interface ChatMessageProps {
    message: Message;
    citations?: Citation[];
}

const springPreset = { type: "spring" as const, stiffness: 400, damping: 30 };

/**
 * Parse and render markdown content
 * Handles: headers, bold, lists, citations [n], inline code
 */
function renderMarkdown(content: string, citations?: Citation[]): React.ReactNode[] {
    if (!content) return [];

    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];

    lines.forEach((line, lineIndex) => {
        const key = `line-${lineIndex}`;

        // Skip empty lines but add spacing
        if (line.trim() === '') {
            elements.push(<div key={key} className="h-2" />);
            return;
        }

        // Headers (### Header)
        const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (headerMatch) {
            const level = headerMatch[1].length;
            const text = headerMatch[2];
            const headerClasses = {
                1: 'text-xl font-bold mt-4 mb-2',
                2: 'text-lg font-bold mt-4 mb-2',
                3: 'text-base font-semibold mt-3 mb-1.5 text-[var(--text-primary)]',
                4: 'text-sm font-semibold mt-2 mb-1',
                5: 'text-sm font-medium mt-2 mb-1',
                6: 'text-sm font-medium mt-2 mb-1',
            }[level] || 'text-base font-semibold';

            elements.push(
                <div key={key} className={headerClasses}>
                    {renderInlineMarkdown(text, citations)}
                </div>
            );
            return;
        }

        // Bullet points (* item or - item)
        const bulletMatch = line.match(/^[\*\-]\s+(.+)$/);
        if (bulletMatch) {
            elements.push(
                <div key={key} className="flex gap-2 my-1 ml-1">
                    <span className="text-[var(--accent-secondary)] mt-0.5">•</span>
                    <span className="flex-1">{renderInlineMarkdown(bulletMatch[1], citations)}</span>
                </div>
            );
            return;
        }

        // Numbered lists (1. item)
        const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
        if (numberedMatch) {
            elements.push(
                <div key={key} className="flex gap-2 my-1 ml-1">
                    <span className="text-[var(--accent-primary)] font-mono text-sm min-w-[1.5rem]">
                        {numberedMatch[1]}.
                    </span>
                    <span className="flex-1">{renderInlineMarkdown(numberedMatch[2], citations)}</span>
                </div>
            );
            return;
        }

        // Regular paragraph
        elements.push(
            <p key={key} className="my-1">
                {renderInlineMarkdown(line, citations)}
            </p>
        );
    });

    return elements;
}

/**
 * CitationBadge — Interactive citation with hover tooltip
 */
function CitationBadge({
    number,
    citation
}: {
    number: string;
    citation?: Citation;
}) {
    const [isHovered, setIsHovered] = useState(false);
    const sourceLabel =
        citation && typeof citation.source === 'string'
            ? citation.source.replace(/\.pdf$/i, '')
            : 'Unknown source';
    const pageLabel = citation && Number.isFinite(citation.page) ? citation.page : 'N/A';

    return (
        <span
            className="relative inline-flex"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <span
                className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 mx-0.5 rounded text-[10px] font-bold bg-[var(--accent-secondary)]/20 text-[var(--accent-secondary)] border border-[var(--accent-secondary)]/30 cursor-help align-middle hover:bg-[var(--accent-secondary)]/30 transition-colors"
            >
                {number}
            </span>

            <AnimatePresence>
                {isHovered && citation && (
                    <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none"
                    >
                        <div className="relative px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)] shadow-xl shadow-black/20 min-w-[180px] max-w-[280px]">
                            {/* Arrow */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                                <div className="w-2 h-2 rotate-45 bg-[var(--bg-elevated)] border-r border-b border-[var(--border-default)]" />
                            </div>

                            {/* Content */}
                            <div className="space-y-1">
                                <div className="text-[10px] font-mono text-[var(--accent-secondary)] uppercase tracking-wider">
                                    Source {citation.marker}
                                </div>
                                <div className="text-sm font-medium text-[var(--text-primary)] leading-tight">
                                    {sourceLabel}
                                </div>
                                <div className="text-xs text-[var(--text-tertiary)]">
                                    Page {pageLabel}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </span>
    );
}

/**
 * Render inline markdown: **bold**, *italic*, `code`, [n] citations
 */
function renderInlineMarkdown(text: string, citations?: Citation[]): React.ReactNode[] {
    const elements: React.ReactNode[] = [];

    // Combined regex for all inline elements
    // Matches: **bold**, *italic*, `code`, [n] citations
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[(\d+)\])/g;

    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        // Add text before match
        if (match.index > lastIndex) {
            elements.push(text.slice(lastIndex, match.index));
        }

        const fullMatch = match[0];

        // Bold **text**
        if (match[2]) {
            elements.push(
                <strong key={`bold-${match.index}`} className="font-semibold text-[var(--text-primary)]">
                    {match[2]}
                </strong>
            );
        }
        // Italic *text*
        else if (match[3]) {
            elements.push(
                <em key={`italic-${match.index}`} className="italic">
                    {match[3]}
                </em>
            );
        }
        // Inline code `code`
        else if (match[4]) {
            elements.push(
                <code key={`code-${match.index}`} className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--accent-secondary)] font-mono text-[0.9em]">
                    {match[4]}
                </code>
            );
        }
        // Citation [n]
        else if (match[5]) {
            const citationNumber = parseInt(match[5], 10);
            const citation = citations?.find(c => c.marker === `[${citationNumber}]`);

            elements.push(
                <CitationBadge
                    key={`cite-${match.index}`}
                    number={match[5]}
                    citation={citation}
                />
            );
        }

        lastIndex = match.index + fullMatch.length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
        elements.push(text.slice(lastIndex));
    }

    return elements.length > 0 ? elements : [text];
}

/**
 * ChatMessage — Editorial Premium Message Bubble
 */
export function ChatMessage({ message, citations }: ChatMessageProps) {
    const isUser = message.role === 'user';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springPreset}
            className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
        >
            <div
                className={`
                    message-bubble
                    relative max-w-[85%] md:max-w-[75%]
                    ${isUser
                        ? 'bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-tertiary)] text-[var(--bg-primary)] rounded-3xl rounded-br-lg shadow-lg shadow-[var(--accent-primary)]/20'
                        : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] rounded-3xl rounded-bl-lg border border-[var(--border-default)]'
                    }
                    px-5 py-4
                `}
            >
                {/* Role indicator for assistant */}
                {!isUser && (
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[var(--border-subtle)]">
                        <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-[var(--accent-secondary)] to-teal-400 flex items-center justify-center">
                            <span className="text-[10px]">⚡</span>
                        </div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-tertiary)]">
                            KNOWRAG
                        </span>
                        {message.isStreaming && (
                            <span className="text-[10px] font-mono text-[var(--accent-primary)] animate-pulse">
                                STREAMING
                            </span>
                        )}
                    </div>
                )}

                {/* Attached Images */}
                {message.images && message.images.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                        {message.images.map((img, index) => (
                            <img
                                key={index}
                                src={img}
                                alt="Attached"
                                className="w-24 h-24 object-cover rounded-xl border border-white/20"
                            />
                        ))}
                    </div>
                )}

                {message.pdfs && message.pdfs.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                        {message.pdfs.map((pdf, index) => (
                            <div
                                key={`${pdf}-${index}`}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
                                    isUser
                                        ? 'bg-white/20 border border-white/30'
                                        : 'bg-[var(--bg-elevated)] border border-[var(--border-default)]'
                                }`}
                            >
                                <span className="text-sm">📄</span>
                                <span
                                    className={`text-xs font-mono max-w-[180px] truncate ${
                                        isUser ? 'text-white/90' : 'text-[var(--text-tertiary)]'
                                    }`}
                                >
                                    {pdf}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Message content */}
                <div className={`message-content text-[15px] leading-relaxed ${isUser ? 'font-medium' : ''}`}>
                    {isUser ? (
                        <span>{message.content}</span>
                    ) : (
                        renderMarkdown(message.content, citations)
                    )}

                    {/* Streaming cursor */}
                    {message.isStreaming && (
                        <span className="inline-block w-0.5 h-4 ml-1 align-middle bg-[var(--accent-primary)] rounded-full animate-pulse" />
                    )}
                </div>

                {/* Timestamp */}
                <div className={`mt-3 pt-2 border-t ${isUser ? 'border-white/20' : 'border-[var(--border-subtle)]'}`}>
                    <span className={`text-[10px] font-mono ${isUser ? 'text-white/60' : 'text-[var(--text-tertiary)]'}`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div>
        </motion.div>
    );
}

/**
 * TypingIndicator — Animated thinking state
 */
export function TypingIndicator() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex justify-start"
        >
            <div className="px-5 py-4 rounded-3xl rounded-bl-lg bg-[var(--bg-surface)] border border-[var(--border-default)]">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-[var(--accent-secondary)] to-teal-400 flex items-center justify-center">
                        <span className="text-[10px]">⚡</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {[0, 1, 2].map((i) => (
                            <motion.div
                                key={i}
                                animate={{
                                    y: [0, -6, 0],
                                    opacity: [0.4, 1, 0.4]
                                }}
                                transition={{
                                    duration: 0.8,
                                    repeat: Infinity,
                                    delay: i * 0.15,
                                    ease: "easeInOut"
                                }}
                                className="w-2 h-2 rounded-full bg-[var(--accent-secondary)]"
                            />
                        ))}
                    </div>
                    <span className="text-[10px] font-mono text-[var(--text-tertiary)] ml-2">
                        THINKING
                    </span>
                </div>
            </div>
        </motion.div>
    );
}

export default ChatMessage;
