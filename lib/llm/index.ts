/**
 * Unified LLM Interface
 * 
 * Provides a single interface for generating responses from multiple LLM providers.
 * Currently supports:
 * - Gemini 3 Flash (with thinking mode)
 * - OpenAI o4-mini
 */

import { generateGeminiStream, generateGeminiResponse, GeminiError } from "./gemini";
import { generateOpenAIStream, generateOpenAIResponse, OpenAIError } from "./openai";

// Supported model identifiers
export type ModelId = "gemini" | "openai" | "gpt-4o";

// Re-export error types
export { GeminiError, OpenAIError };

/**
 * Unified error class for LLM operations
 */
export class LLMError extends Error {
    constructor(
        message: string,
        public readonly provider: ModelId,
        public readonly code?: string,
        public readonly isRetryable: boolean = false
    ) {
        super(message);
        this.name = "LLMError";
    }
}

/**
 * Model configuration and display information
 */
export interface ModelInfo {
    id: ModelId;
    name: string;
    description: string;
    provider: string;
}

/**
 * Available models with their configuration
 */
export const AVAILABLE_MODELS: ModelInfo[] = [
    {
        id: "gemini",
        name: "Gemini 3 Flash",
        description: "Google's fast model with enhanced reasoning (thinking: high)",
        provider: "Google",
    },
    {
        id: "openai",
        name: "o4-mini",
        description: "OpenAI's efficient reasoning model",
        provider: "OpenAI",
    },
    {
        id: "gpt-4o",
        name: "GPT-4o",
        description: "OpenAI's multimodal model for vision + text",
        provider: "OpenAI",
    },
];

/**
 * Gets model info by ID
 */
export function getModelInfo(modelId: ModelId): ModelInfo | undefined {
    return AVAILABLE_MODELS.find((m) => m.id === modelId);
}

/**
 * Stream chunk from unified interface
 */
export interface StreamChunk {
    text: string;
    done: boolean;
}

/**
 * Validates that the model ID is supported
 */
function validateModelId(modelId: string): asserts modelId is ModelId {
    if (modelId !== "gemini" && modelId !== "openai" && modelId !== "gpt-4o") {
        throw new LLMError(
            `Unsupported model: ${modelId}. Available models: gemini, openai, gpt-4o`,
            modelId as ModelId,
            "INVALID_MODEL",
            false
        );
    }
}

/**
 * Unified streaming response generator
 * 
 * @param modelId - Which model to use ("gemini" or "openai")
 * @param context - The formatted context from RAG retrieval
 * @param query - The user's question
 * @yields StreamChunk objects with text content
 */
export async function* generateResponse(
    modelId: string,
    context: string,
    query: string,
    images?: string[]
): AsyncGenerator<StreamChunk> {
    validateModelId(modelId);

    try {
        if (modelId === "gemini") {
            yield* generateGeminiStream(context, query, images);
        } else if (modelId === "openai") {
            yield* generateOpenAIStream(context, query, images, "o4-mini");
        } else {
            yield* generateOpenAIStream(context, query, images, "gpt-4o");
        }
    } catch (error: unknown) {
        // Wrap provider-specific errors in unified LLMError
        if (error instanceof GeminiError) {
            throw new LLMError(error.message, "gemini", error.code, error.isRetryable);
        }
        if (error instanceof OpenAIError) {
            throw new LLMError(error.message, "openai", error.code, error.isRetryable);
        }

        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new LLMError(
            `Failed to generate response: ${errorMessage}`,
            modelId,
            "UNKNOWN_ERROR",
            true
        );
    }
}

/**
 * Unified non-streaming response generator
 * 
 * @param modelId - Which model to use ("gemini" or "openai")
 * @param context - The formatted context from RAG retrieval
 * @param query - The user's question
 * @param images - Optional array of base64 images
 * @returns The complete response text
 */
export async function generateFullResponse(
    modelId: string,
    context: string,
    query: string,
    images?: string[]
): Promise<string> {
    validateModelId(modelId);

    try {
        if (modelId === "gemini") {
            return await generateGeminiResponse(context, query, images);
        } else if (modelId === "openai") {
            return await generateOpenAIResponse(context, query, images, "o4-mini");
        } else {
            return await generateOpenAIResponse(context, query, images, "gpt-4o");
        }
    } catch (error: unknown) {
        // Wrap provider-specific errors in unified LLMError
        if (error instanceof GeminiError) {
            throw new LLMError(error.message, "gemini", error.code, error.isRetryable);
        }
        if (error instanceof OpenAIError) {
            throw new LLMError(error.message, "openai", error.code, error.isRetryable);
        }

        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new LLMError(
            `Failed to generate response: ${errorMessage}`,
            modelId,
            "UNKNOWN_ERROR",
            true
        );
    }
}

/**
 * Formats an LLM error into a user-friendly message
 */
export function formatErrorMessage(error: LLMError): string {
    const modelInfo = getModelInfo(error.provider);
    const modelName = modelInfo?.name || error.provider;

    if (error.isRetryable) {
        return `${error.message} (${modelName})`;
    }

    return `${error.message}`;
}
