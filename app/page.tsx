'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ModelSelector, type ModelType } from '@/components/ModelSelector';
import { StatusIndicator } from '@/components/StatusIndicator';
import { ChatInput } from '@/components/ChatInput';
import { ChatMessage, TypingIndicator, type Message } from '@/components/ChatMessage';

/**
 * KnowRAG - Main Chat Interface
 * Tasks 7.7-7.11: Complete chat UI with model selection, streaming, and status
 */
export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelType>('gemini');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * Generate a unique message ID
   */
  const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  /**
   * Handle sending a message
   * Task 7.8-7.9: State management and streaming response display
   */
  const handleSendMessage = useCallback(async (content: string) => {
    // Prevent double-submission
    if (isLoading) return;

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    // Add user message
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Create placeholder for assistant message
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
      // Make API request
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

      // Read the streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedContent += chunk;

        // Update the assistant message with accumulated content
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantMessageId
              ? { ...msg, content: accumulatedContent }
              : msg
          )
        );
      }

      // Mark streaming as complete
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMessageId
            ? { ...msg, isStreaming: false, timestamp: new Date() }
            : msg
        )
      );

    } catch (error) {
      // Handle errors
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was cancelled, remove the empty assistant message
        setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
      } else {
        // Show error in the message
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantMessageId
              ? {
                ...msg,
                content: `⚠️ Error: ${errorMessage}`,
                isStreaming: false,
              }
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
    <div className="min-h-screen flex flex-col animated-gradient">
      {/* Header - Task 7.11 */}
      <header className="sticky top-0 z-40 glass border-b border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-purple-500 flex items-center justify-center">
              <span className="text-xl">📚</span>
            </div>
            <div>
              <h1 className="text-lg font-bold gradient-text">KnowRAG</h1>
              <p className="text-[10px] text-[var(--muted-foreground)] -mt-0.5">AI-Powered Knowledge Base</p>
            </div>
          </div>

          {/* Model Selector */}
          <ModelSelector
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            disabled={isLoading}
          />
        </div>
      </header>

      {/* Status Bar */}
      <div className="border-b border-[var(--border)] bg-[var(--background)]/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-center sm:justify-start">
          <StatusIndicator />
        </div>
      </div>

      {/* Chat Area - Task 7.7 */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-purple-500 flex items-center justify-center mb-6 glow">
                <span className="text-4xl">📖</span>
              </div>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">
                Welcome to KnowRAG
              </h2>
              <p className="text-[var(--muted-foreground)] max-w-md mb-6">
                Ask questions about your indexed documents. I&apos;ll provide answers with accurate citations including book titles and page numbers.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  'What is the margin of safety?',
                  'Who is Mr. Market?',
                  'Investment vs speculation?',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSendMessage(suggestion)}
                    disabled={isLoading}
                    className="px-4 py-2 rounded-full text-sm bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--accent)] hover:bg-[var(--muted)]/80 transition-all duration-200 disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Messages list
            <div className="flex flex-col gap-4">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}

              {/* Typing indicator when loading and no streaming content yet */}
              {isLoading && messages.length > 0 && !messages[messages.length - 1]?.content && (
                <TypingIndicator />
              )}

              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      {/* Input Area - Fixed at bottom */}
      <footer className="sticky bottom-0 border-t border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <ChatInput
            onSend={handleSendMessage}
            disabled={isLoading}
            placeholder={isLoading ? 'Waiting for response...' : 'Ask a question about your documents...'}
          />
        </div>
      </footer>
    </div>
  );
}
