'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from "motion/react";

/**
 * Available LLM models
 * 'kimi' is the default model for reasoning
 */
export type ModelType = 'kimi' | 'gemini' | 'openai' | 'gpt-4o';

interface ModelOption {
    id: ModelType;
    name: string;
    description: string;
    icon: string;
    color: string;
}

const models: ModelOption[] = [
    {
        id: 'kimi',
        name: 'Kimi K2 Thinking',
        description: '1T MoE, 256K context (default)',
        icon: '🌙',
        color: 'var(--accent-primary)',
    },
    {
        id: 'gemini',
        name: 'Gemini 3 Flash',
        description: 'Thinking mode enabled',
        icon: '✨',
        color: 'var(--accent-secondary)',
    },
    {
        id: 'openai',
        name: 'o4-mini',
        description: 'Fast reasoning model',
        icon: '⚡',
        color: 'var(--accent-tertiary)',
    },
    {
        id: 'gpt-4o',
        name: 'GPT-4o',
        description: 'Vision analysis (auto with images)',
        icon: '👁️',
        color: 'var(--text-tertiary)',
    },
];

interface ModelSelectorProps {
    selectedModel: ModelType;
    onModelChange: (model: ModelType) => void;
    disabled?: boolean;
}

const springPreset = { type: "spring" as const, stiffness: 400, damping: 30 };

/**
 * ModelSelector — Editorial Premium Dropdown
 * 
 * Features: Animated dropdown, staggered item entrance,
 * visual model indicators, keyboard accessible
 */
export function ModelSelector({ selectedModel, onModelChange, disabled }: ModelSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedOption = models.find(m => m.id === selectedModel) || models[0];

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close on Escape
    useEffect(() => {
        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') setIsOpen(false);
        }
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    return (
        <div className="relative z-50" ref={dropdownRef}>
            {/* Trigger */}
            <motion.button
                id="model-selector-button"
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={springPreset}
                className={`
                    flex items-center gap-3 px-4 py-2.5 rounded-xl
                    bg-[var(--bg-surface)] border border-[var(--border-default)]
                    transition-all duration-200
                    hover:border-[var(--border-strong)] hover:shadow-lg hover:shadow-black/20
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]
                    disabled:opacity-50 disabled:cursor-not-allowed
                    min-w-[180px]
                `}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-label="Select AI model"
            >
                {/* Model indicator */}
                <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-sm"
                    style={{
                        background: `linear-gradient(135deg, ${selectedOption.color} 0%, ${selectedOption.color}80 100%)`
                    }}
                >
                    {selectedOption.icon}
                </div>

                <div className="flex-1 text-left">
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                        {selectedOption.name}
                    </span>
                </div>

                <motion.svg
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={springPreset}
                    className="w-4 h-4 text-[var(--text-tertiary)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </motion.svg>
            </motion.button>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -8 }}
                        transition={springPreset}
                        style={{ transformOrigin: "top right" }}
                        className="
                            absolute top-full mt-2 right-0
                            min-w-[260px] py-2 rounded-2xl
                            bg-[var(--bg-elevated)] border border-[var(--border-default)]
                            shadow-2xl shadow-black/40
                            overflow-hidden
                        "
                        role="listbox"
                        aria-label="AI Models"
                    >
                        {/* Header */}
                        <div className="px-4 py-2 border-b border-[var(--border-subtle)]">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-tertiary)]">
                                SELECT MODEL
                            </span>
                        </div>

                        {/* Options */}
                        {models.map((model, i) => (
                            <motion.button
                                key={model.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ ...springPreset, delay: i * 0.05 + 0.1 }}
                                id={`model-option-${model.id}`}
                                type="button"
                                onClick={() => {
                                    onModelChange(model.id);
                                    setIsOpen(false);
                                }}
                                className={`
                                    w-full px-4 py-3 flex items-center gap-3
                                    text-left transition-colors duration-150
                                    hover:bg-[var(--bg-surface)]
                                    ${model.id === selectedModel ? 'bg-[var(--bg-surface)]' : ''}
                                `}
                                role="option"
                                aria-selected={model.id === selectedModel}
                            >
                                {/* Model icon */}
                                <div
                                    className="w-8 h-8 rounded-xl flex items-center justify-center text-lg shadow-lg"
                                    style={{
                                        background: `linear-gradient(135deg, ${model.color} 0%, ${model.color}80 100%)`,
                                        boxShadow: `0 4px 12px ${model.color}30`
                                    }}
                                >
                                    {model.icon}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-[var(--text-primary)]">
                                            {model.name}
                                        </span>
                                        {model.id === selectedModel && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="w-4 h-4 rounded-full bg-[var(--success)] flex items-center justify-center"
                                            >
                                                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </motion.div>
                                        )}
                                    </div>
                                    <span className="text-xs text-[var(--text-tertiary)]">
                                        {model.description}
                                    </span>
                                </div>
                            </motion.button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default ModelSelector;
