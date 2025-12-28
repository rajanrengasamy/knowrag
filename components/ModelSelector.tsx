'use client';

import { useState, useRef, useEffect } from 'react';

/**
 * Available LLM models for the chat interface
 */
export type ModelType = 'gemini' | 'openai';

interface ModelOption {
    id: ModelType;
    name: string;
    description: string;
    icon: string;
}

const models: ModelOption[] = [
    {
        id: 'gemini',
        name: 'Gemini 3 Flash',
        description: 'Thinking mode enabled',
        icon: '✨',
    },
    {
        id: 'openai',
        name: 'o4-mini',
        description: 'Fast reasoning model',
        icon: '⚡',
    },
];

interface ModelSelectorProps {
    selectedModel: ModelType;
    onModelChange: (model: ModelType) => void;
    disabled?: boolean;
}

/**
 * ModelSelector - Dropdown component for selecting the LLM model
 * Task 7.3 - Premium design with animations and clear visual feedback
 */
export function ModelSelector({ selectedModel, onModelChange, disabled }: ModelSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedOption = models.find(m => m.id === selectedModel) || models[0];

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close dropdown on Escape key
    useEffect(() => {
        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        }

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                id="model-selector-button"
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`
          flex items-center gap-2 px-4 py-2.5 rounded-xl
          bg-[var(--muted)] border border-[var(--border)]
          hover:border-[var(--accent)] hover:bg-[var(--muted)]/80
          transition-all duration-200 ease-out
          focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50
          disabled:opacity-50 disabled:cursor-not-allowed
          min-w-[180px]
        `}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-label="Select AI model"
            >
                <span className="text-lg">{selectedOption.icon}</span>
                <span className="flex-1 text-left text-sm font-medium text-[var(--foreground)]">
                    {selectedOption.name}
                </span>
                <svg
                    className={`w-4 h-4 text-[var(--muted-foreground)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    className={`
            absolute top-full mt-2 right-0 z-50
            min-w-[220px] py-2 rounded-xl
            bg-[var(--card)] border border-[var(--border)]
            shadow-xl shadow-black/20
            transform origin-top-right
            animate-in fade-in slide-in-from-top-2 duration-200
          `}
                    role="listbox"
                    aria-label="AI Models"
                >
                    {models.map((model) => (
                        <button
                            key={model.id}
                            id={`model-option-${model.id}`}
                            type="button"
                            onClick={() => {
                                onModelChange(model.id);
                                setIsOpen(false);
                            }}
                            className={`
                w-full px-4 py-3 flex items-start gap-3
                text-left transition-all duration-150
                hover:bg-[var(--muted)]
                ${model.id === selectedModel ? 'bg-[var(--accent)]/10' : ''}
              `}
                            role="option"
                            aria-selected={model.id === selectedModel}
                        >
                            <span className="text-xl mt-0.5">{model.icon}</span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-[var(--foreground)]">{model.name}</span>
                                    {model.id === selectedModel && (
                                        <svg className="w-4 h-4 text-[var(--accent)]" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </div>
                                <span className="text-xs text-[var(--muted-foreground)]">{model.description}</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ModelSelector;
