/**
 * Unified LLM Interface
 * 
 * Provides a single interface for generating responses from multiple LLM providers.
 * Currently supports:
 * - Kimi K2 Thinking (default - via OpenRouter)
 * - Gemini 3 Flash (with thinking mode)
 * - OpenAI o4-mini
 * - GPT-4o (vision model for image analysis)
 * 
 * Two-Stage Pipeline for Images:
 * When images are attached, GPT-4o analyzes the images first,
 * then Kimi K2 Thinking uses that analysis for deep reasoning.
 */

import { generateGeminiStream, generateGeminiResponse, GeminiError } from "./gemini";
import { generateOpenAIStream, generateOpenAIResponse, OpenAIError, generateVisionAnalysis } from "./openai";
import { generateKimiStream, generateKimiResponse, OpenRouterError } from "./openrouter";

// Supported model identifiers
// 'kimi' is the default model for reasoning
// 'gpt-4o' is used internally for vision analysis (not directly selectable for final response)
export type ModelId = "kimi" | "gemini" | "openai" | "gpt-4o";

// Re-export error types
export { GeminiError, OpenAIError, OpenRouterError };

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
 * Kimi K2 Thinking is the DEFAULT model
 */
export const AVAILABLE_MODELS: ModelInfo[] = [
    {
        id: "kimi",
        name: "Kimi K2 Thinking",
        description: "1T MoE model, 256K context (default)",
        provider: "Moonshot AI",
    },
    {
        id: "gemini",
        name: "Gemini 3 Flash",
        description: "Google's fast model with enhanced reasoning",
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
        description: "Vision analysis (used automatically with images)",
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
    if (modelId !== "kimi" && modelId !== "gemini" && modelId !== "openai" && modelId !== "gpt-4o") {
        throw new LLMError(
            `Unsupported model: ${modelId}. Available models: kimi, gemini, openai, gpt-4o`,
            modelId as ModelId,
            "INVALID_MODEL",
            false
        );
    }
}

/**
 * Unified streaming response generator
 * 
 * Two-Stage Pipeline for Images:
 * 1. If images are present, GPT-4o first analyzes them
 * 2. The vision analysis is then passed to the selected model for reasoning
 * 
 * @param modelId - Which model to use ("kimi", "gemini", or "openai")
 * @param context - The formatted context from RAG retrieval
 * @param query - The user's question
 * @param images - Optional array of base64 images (triggers two-stage pipeline)
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
        // Two-Stage Pipeline: If images are present, first get vision analysis from GPT-4o
        let visionAnalysis: string | undefined;
        if (images && images.length > 0) {
            console.log(`🖼️ Stage 1: Analyzing ${images.length} image(s) with GPT-4o vision...`);
            visionAnalysis = await generateVisionAnalysis(images, query);
            console.log(`✅ Vision analysis complete (${visionAnalysis.length} chars)`);
        }

        // Stage 2: Generate response with the selected reasoning model
        if (modelId === "kimi") {
            yield* generateKimiStream(context, query, visionAnalysis);
        } else if (modelId === "gemini") {
            // For Gemini, incorporate vision analysis into the query
            const enrichedQuery = visionAnalysis
                ? `## Image Analysis (from vision model):\n${visionAnalysis}\n\n## User Question:\n${query}`
                : query;
            yield* generateGeminiStream(context, enrichedQuery);
        } else if (modelId === "openai") {
            // For o4-mini, incorporate vision analysis into the query
            const enrichedQuery = visionAnalysis
                ? `## Image Analysis (from vision model):\n${visionAnalysis}\n\n## User Question:\n${query}`
                : query;
            yield* generateOpenAIStream(context, enrichedQuery, undefined, "o4-mini");
        } else if (modelId === "gpt-4o") {
            // Direct GPT-4o with images (legacy behavior if explicitly selected)
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
        if (error instanceof OpenRouterError) {
            throw new LLMError(error.message, "kimi", error.code, error.isRetryable);
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
 * @param modelId - Which model to use ("kimi", "gemini", or "openai")
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
        // Two-Stage Pipeline for images
        let visionAnalysis: string | undefined;
        if (images && images.length > 0) {
            visionAnalysis = await generateVisionAnalysis(images, query);
        }

        if (modelId === "kimi") {
            return await generateKimiResponse(context, query, visionAnalysis);
        } else if (modelId === "gemini") {
            const enrichedQuery = visionAnalysis
                ? `## Image Analysis:\n${visionAnalysis}\n\n## Question:\n${query}`
                : query;
            return await generateGeminiResponse(context, enrichedQuery);
        } else if (modelId === "openai") {
            const enrichedQuery = visionAnalysis
                ? `## Image Analysis:\n${visionAnalysis}\n\n## Question:\n${query}`
                : query;
            return await generateOpenAIResponse(context, enrichedQuery, undefined, "o4-mini");
        } else {
            // gpt-4o direct
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
        if (error instanceof OpenRouterError) {
            throw new LLMError(error.message, "kimi", error.code, error.isRetryable);
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
