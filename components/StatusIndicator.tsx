'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "motion/react";

interface StatusData {
    documents: number;
    chunks: number;
    ready: boolean;
    documentNames?: string[];
}

interface StatusIndicatorProps {
    className?: string;
}

const springPreset = { type: "spring" as const, stiffness: 400, damping: 30 };

/**
 * StatusIndicator — Editorial Premium Status Badge
 * 
 * Shows document index status with animated states,
 * skeleton loading, and refined visual feedback
 */
export function StatusIndicator({ className = '' }: StatusIndicatorProps) {
    const [status, setStatus] = useState<StatusData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchStatus() {
            try {
                const response = await fetch('/api/status');
                if (!response.ok) throw new Error('Failed to fetch status');
                const data = await response.json();
                setStatus(data);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setTimeout(() => setIsLoading(false), 400);
            }
        }

        fetchStatus();
        const interval = setInterval(fetchStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <AnimatePresence mode="wait">
            {isLoading ? (
                /* Loading skeleton */
                <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    id="status-indicator-loading"
                    className={`flex items-center gap-3 px-4 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] ${className}`}
                >
                    <div className="w-2 h-2 rounded-full bg-[var(--text-tertiary)] animate-pulse" />
                    <div className="h-3 w-16 rounded shimmer" />
                </motion.div>
            ) : error ? (
                /* Error state */
                <motion.div
                    key="error"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    id="status-indicator-error"
                    transition={springPreset}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--error)]/10 border border-[var(--error)]/20 ${className}`}
                >
                    <div className="w-2 h-2 rounded-full bg-[var(--error)]" />
                    <span className="text-[11px] font-mono text-[var(--error)]">ERROR</span>
                </motion.div>
            ) : status && (
                /* Ready state */
                <motion.div
                    key="ready"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={springPreset}
                    id="status-indicator"
                    className={`
                        flex items-center gap-3 px-4 py-2 rounded-xl
                        bg-[var(--bg-surface)] border border-[var(--border-default)]
                        ${className}
                    `}
                >
                    {/* Status indicator with pulse */}
                    <div className="relative">
                        <motion.div
                            animate={status.ready && status.chunks > 0 ? {
                                scale: [1, 1.2, 1],
                                opacity: [1, 0.8, 1]
                            } : {}}
                            transition={{ duration: 2, repeat: Infinity }}
                            className={`
                                w-2.5 h-2.5 rounded-full
                                ${status.ready && status.chunks > 0
                                    ? 'bg-[var(--success)]'
                                    : 'bg-[var(--text-tertiary)]'
                                }
                            `}
                        />
                        {status.ready && status.chunks > 0 && (
                            <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-[var(--success)] animate-ping opacity-50" />
                        )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-2 text-[11px] font-mono">
                        <span className="text-[var(--text-primary)] font-medium">
                            {status.documents} {status.documents === 1 ? 'DOC' : 'DOCS'}
                        </span>
                        <span className="text-[var(--text-tertiary)]">/</span>
                        <span className="text-[var(--text-secondary)]">
                            {status.chunks.toLocaleString()} CHUNKS
                        </span>
                    </div>

                    {/* Ready badge */}
                    {status.ready && status.chunks > 0 && (
                        <motion.span
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[var(--success)]/15 text-[var(--success)] border border-[var(--success)]/25"
                        >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            READY
                        </motion.span>
                    )}

                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default StatusIndicator;
