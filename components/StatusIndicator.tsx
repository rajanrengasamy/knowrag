'use client';

import { useState, useEffect } from 'react';

interface StatusData {
    documents: number;
    chunks: number;
    ready: boolean;
    documentNames?: string[];
}

interface StatusIndicatorProps {
    className?: string;
}

/**
 * StatusIndicator - Displays the document index status
 * Task 7.4 - Fetches from /api/status and displays document/chunk counts
 */
export function StatusIndicator({ className = '' }: StatusIndicatorProps) {
    const [status, setStatus] = useState<StatusData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchStatus() {
            try {
                const response = await fetch('/api/status');
                if (!response.ok) {
                    throw new Error('Failed to fetch status');
                }
                const data = await response.json();
                setStatus(data);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setIsLoading(false);
            }
        }

        fetchStatus();

        // Refresh status every 30 seconds
        const interval = setInterval(fetchStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    if (isLoading) {
        return (
            <div
                id="status-indicator"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--muted)] ${className}`}
            >
                <div className="w-2 h-2 rounded-full bg-[var(--muted-foreground)] pulse-glow" />
                <span className="text-xs text-[var(--muted-foreground)]">Loading...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div
                id="status-indicator"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--error)]/10 ${className}`}
            >
                <div className="w-2 h-2 rounded-full bg-[var(--error)]" />
                <span className="text-xs text-[var(--error)]">Error loading status</span>
            </div>
        );
    }

    if (!status) {
        return null;
    }

    const isReady = status.ready && status.chunks > 0;

    return (
        <div
            id="status-indicator"
            className={`
        flex items-center gap-3 px-4 py-2 rounded-xl
        bg-[var(--muted)] border border-[var(--border)]
        ${className}
      `}
        >
            {/* Status dot with glow effect */}
            <div className="relative">
                <div
                    className={`
            w-2.5 h-2.5 rounded-full
            ${isReady ? 'bg-[var(--success)]' : 'bg-[var(--muted-foreground)]'}
          `}
                />
                {isReady && (
                    <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-[var(--success)] animate-ping opacity-75" />
                )}
            </div>

            {/* Status text */}
            <div className="flex items-center gap-2 text-xs">
                <span className="text-[var(--foreground)] font-medium">
                    {status.documents} {status.documents === 1 ? 'document' : 'documents'}
                </span>
                <span className="text-[var(--muted-foreground)]">|</span>
                <span className="text-[var(--muted-foreground)]">
                    {status.chunks.toLocaleString()} chunks
                </span>
            </div>

            {/* Ready/Not ready badge */}
            {isReady ? (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--success)]/10 text-[var(--success)]">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Ready
                </span>
            ) : (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--muted-foreground)]/10 text-[var(--muted-foreground)]">
                    Not indexed
                </span>
            )}
        </div>
    );
}

export default StatusIndicator;
