'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { ModelSelector, type ModelType } from '@/components/ModelSelector';
import { StatusIndicator } from '@/components/StatusIndicator';
import { ChatInput } from '@/components/ChatInput';
import { ChatMessage, TypingIndicator, type Message } from '@/components/ChatMessage';

/**
 * Citation metadata from the RAG pipeline
 */
export interface Citation {
  marker: string;
  citation: string;
  source: string;
  page: number;
}

/**
 * Animation presets for editorial feel
 */
const springPreset = { type: "spring", stiffness: 400, damping: 30 };
const smoothPreset = { type: "spring", stiffness: 300, damping: 35 };

/**
 * KnowRAG — Editorial Premium Chat Interface
 * 
 * Design Philosophy: Bloomberg Terminal meets Vogue
 * - Warm amber/teal palette
 * - Bold typography with Syne display font
 * - Atmospheric backgrounds with depth
 * - Refined micro-interactions
 */
export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelType>('gemini');
  const [isLoading, setIsLoading] = useState(false);
  const [citationsMap, setCitationsMap] = useState<Map<string, Citation[]>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const handleSendMessage = useCallback(async (content: string) => {
    if (isLoading) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    const assistantMessageId = generateId();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: content, model: selectedModel }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response body');

      let accumulatedContent = '';
      let citationsExtracted = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedContent += chunk;

        // Parse citation header on first chunk (format: JSON|||content)
        if (!citationsExtracted && accumulatedContent.includes('|||')) {
          const delimiterIndex = accumulatedContent.indexOf('|||');
          const citationJson = accumulatedContent.substring(0, delimiterIndex);

          try {
            const parsed = JSON.parse(citationJson);
            if (parsed.citations) {
              setCitationsMap(prev => {
                const newMap = new Map(prev);
                newMap.set(assistantMessageId, parsed.citations);
                return newMap;
              });
            }
          } catch (e) {
            console.error('Failed to parse citations:', e);
          }

          // Remove the citation header from content
          accumulatedContent = accumulatedContent.substring(delimiterIndex + 3);
          citationsExtracted = true;
        }

        // Only update message content after citations are extracted
        const displayContent = citationsExtracted ? accumulatedContent : '';

        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantMessageId
              ? { ...msg, content: displayContent }
              : msg
          )
        );
      }

      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMessageId
            ? { ...msg, isStreaming: false, timestamp: new Date() }
            : msg
        )
      );

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
      } else {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantMessageId
              ? { ...msg, content: `⚠️ ${errorMessage}`, isStreaming: false }
              : msg
          )
        );
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [isLoading, selectedModel]);

  return (
    <div className="min-h-screen flex flex-col ambient-bg">
      {/* Editorial Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={smoothPreset}
        className="sticky top-0 z-50 glass-dark border-b border-[var(--border-subtle)]"
      >
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Brand */}
            <div className="flex items-center gap-4">
              <motion.div
                whileHover={{ rotate: -5, scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                transition={springPreset}
                className="relative"
              >
                {/* Glow effect */}
                <div className="absolute inset-0 w-12 h-12 rounded-2xl bg-[var(--accent-primary)] blur-xl opacity-40" />
                <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-tertiary)] flex items-center justify-center shadow-lg">
                  <span className="text-2xl">⚡</span>
                </div>
              </motion.div>

              <div>
                <h1 className="font-display text-xl gradient-text tracking-tight">
                  KnowRAG
                </h1>
                <p className="text-[11px] text-[var(--text-tertiary)] font-mono uppercase tracking-widest">
                  Knowledge Intelligence
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              <StatusIndicator />
              <ModelSelector
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                disabled={isLoading}
              />
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <AnimatePresence mode="wait">
            {messages.length === 0 ? (
              /* Empty State - Editorial Hero */
              <motion.div
                key="hero"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="min-h-[60vh] flex flex-col items-center justify-center text-center relative"
              >
                {/* Background spotlight */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[600px] h-[600px] rounded-full bg-gradient-radial from-[var(--accent-primary)]/10 via-transparent to-transparent blur-3xl" />
                </div>

                {/* Icon with glow */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ ...smoothPreset, delay: 0.1 }}
                  className="relative mb-8"
                >
                  <div className="absolute inset-0 w-24 h-24 rounded-3xl bg-[var(--accent-primary)] blur-2xl opacity-30" />
                  <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-[var(--accent-primary)] via-[var(--accent-tertiary)] to-[var(--accent-secondary)] flex items-center justify-center float">
                    <span className="text-5xl">📚</span>
                  </div>
                </motion.div>

                {/* Editorial headline */}
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...smoothPreset, delay: 0.2 }}
                  className="font-display text-4xl md:text-5xl gradient-text mb-4 text-editorial"
                >
                  Ask Anything.
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...smoothPreset, delay: 0.3 }}
                  className="text-[var(--text-secondary)] text-lg max-w-md mb-10 leading-relaxed"
                >
                  Query your knowledge base with precision.
                  Every answer comes with verified citations.
                </motion.p>

                {/* Suggestion chips */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...smoothPreset, delay: 0.4 }}
                  className="flex flex-wrap justify-center gap-3"
                >
                  {[
                    { icon: "🎯", text: "What is the margin of safety?" },
                    { icon: "📈", text: "Who is Mr. Market?" },
                    { icon: "💡", text: "Investment vs speculation?" },
                  ].map((suggestion, i) => (
                    <motion.button
                      key={suggestion.text}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ ...springPreset, delay: 0.5 + i * 0.1 }}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSendMessage(suggestion.text)}
                      disabled={isLoading}
                      className="group flex items-center gap-2 px-5 py-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm font-medium transition-all duration-200 hover:border-[var(--accent-primary)] hover:shadow-lg hover:shadow-[var(--accent-primary)]/10 disabled:opacity-50"
                    >
                      <span className="text-lg group-hover:scale-110 transition-transform">{suggestion.icon}</span>
                      {suggestion.text}
                    </motion.button>
                  ))}
                </motion.div>

                {/* Decorative elements */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="absolute bottom-8 text-[var(--text-tertiary)] text-xs font-mono"
                >
                  ↓ START YOUR QUERY
                </motion.div>
              </motion.div>
            ) : (
              /* Messages */
              <motion.div
                key="messages"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <AnimatePresence mode="popLayout">
                  {messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      citations={citationsMap.get(message.id)}
                    />
                  ))}

                  {isLoading && messages.length > 0 && !messages[messages.length - 1]?.content && (
                    <TypingIndicator key="typing" />
                  )}
                </AnimatePresence>

                <div ref={messagesEndRef} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Input Footer */}
      <motion.footer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...smoothPreset, delay: 0.2 }}
        className="sticky bottom-0 z-40 glass-dark border-t border-[var(--border-subtle)]"
      >
        <div className="max-w-4xl mx-auto px-6 py-5">
          <ChatInput
            onSend={handleSendMessage}
            disabled={isLoading}
            placeholder={isLoading ? 'Processing...' : 'Ask about your documents...'}
          />
        </div>
      </motion.footer>
    </div>
  );
}
