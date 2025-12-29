/**
 * OpenRouter LLM Integration - Kimi K2 Thinking
 * 
 * Uses OpenRouter API (OpenAI-compatible) for Moonshot AI's Kimi K2 Thinking model.
 * This is a 1 trillion parameter MoE model with 32B active parameters per forward pass.
 * 
 * Key features:
 * - 256K context window
 * - Deep reasoning with exposed reasoning_content
 * - Optimized for agentic, long-horizon reasoning tasks
 * 
 * @see https://openrouter.ai/moonshotai/kimi-k2-thinking
 */

import OpenAI from "openai";

// OpenRouter model configuration
const KIMI_MODEL = "moonshotai/kimi-k2-thinking";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

// Initialize the OpenRouter client (OpenAI-compatible)
let client: OpenAI | null = null;

/**
 * Custom error class for OpenRouter API errors
 */
export class OpenRouterError extends Error {
    constructor(
        message: string,
        public readonly code?: string,
        public readonly isRetryable: boolean = false
    ) {
        super(message);
        this.name = "OpenRouterError";
    }
}

/**
 * Initializes and returns the OpenRouter client
 */
function getClient(): OpenAI {
    if (client) return client;

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new OpenRouterError(
            "OPENROUTER_API_KEY environment variable is not set. Please add it to .env",
            "MISSING_API_KEY",
            false
        );
    }

    // OpenRouter uses OpenAI-compatible API
    client = new OpenAI({
        apiKey,
        baseURL: OPENROUTER_BASE_URL,
        defaultHeaders: {
            // Optional: helps with OpenRouter leaderboard and rate limiting
            "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
            "X-Title": process.env.OPENROUTER_SITE_NAME || "KnowRAG",
        },
    });
    return client;
}

/**
 * Response chunk from streaming
 */
export interface StreamChunk {
    text: string;
    done: boolean;
}

/**
 * Generates a response using Kimi K2 Thinking via OpenRouter with streaming
 * 
 * @param systemPrompt - The system prompt with context
 * @param userQuery - The user's question
 * @param visionAnalysis - Optional vision analysis from GPT-4o (pre-processed images)
 * @yields StreamChunk objects with text content
 */
export async function* generateKimiStream(
    systemPrompt: string,
    userQuery: string,
    visionAnalysis?: string
): AsyncGenerator<StreamChunk> {
    try {
        const openrouter = getClient();

        // Build the user message, incorporating vision analysis if provided
        // Add reasoning guidance to leverage Kimi K2's chain-of-thought capabilities
        let userMessage = userQuery;
        if (visionAnalysis) {
            userMessage = `## Image Analysis (from vision model):
${visionAnalysis}

## User Question:
${userQuery}`;
        }

        // Add reasoning guidance for Kimi K2 Thinking
        userMessage += `

## Reasoning Approach
Work through this systematically:
1. Identify which sources are most relevant to the question
2. Extract and verify the specific information from those sources
3. Synthesize an accurate, well-cited response
4. Verify: Is every claim supported by a cited source?
5. Acknowledge any gaps where the sources don't provide complete information`;

        // Create streaming chat completion
        // Kimi K2 Thinking recommended: temperature=1.0 for full reasoning exploration
        // OpenRouter-specific routing: request cheapest provider
        const stream = await openrouter.chat.completions.create({
            model: KIMI_MODEL,
            stream: true,
            temperature: 1.0,
            max_tokens: 8192, // Large enough for reasoning chains + response
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage },
            ],
            // OpenRouter provider routing for cheapest option
            // Cast to any to allow OpenRouter-specific params not in OpenAI SDK types
            ...({
                provider: {
                    order: ["price"],
                    allow_fallbacks: true,
                },
            } as Record<string, unknown>),
        });

        // Yield chunks as they arrive
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
                yield { text: content, done: false };
            }
        }

        // Signal completion
        yield { text: "", done: true };
    } catch (error: unknown) {
        // Handle specific OpenRouter/OpenAI error types
        if (error instanceof OpenAI.APIError) {
            const status = error.status;
            const message = error.message;

            if (status === 401) {
                throw new OpenRouterError(
                    "Invalid OpenRouter API key. Please check your OPENROUTER_API_KEY in .env",
                    "INVALID_API_KEY",
                    false
                );
            }

            if (status === 429) {
                throw new OpenRouterError(
                    "API rate limit exceeded. Please try again in a moment.",
                    "RATE_LIMIT",
                    true
                );
            }

            if (status === 500 || status === 502 || status === 503) {
                throw new OpenRouterError(
                    "OpenRouter service is temporarily unavailable. Please try again later.",
                    "SERVICE_UNAVAILABLE",
                    true
                );
            }

            if (status === 400 && message.includes("context_length")) {
                throw new OpenRouterError(
                    "The request was too long. Please try with a shorter query.",
                    "CONTEXT_TOO_LONG",
                    false
                );
            }

            throw new OpenRouterError(`OpenRouter API error: ${message}`, "API_ERROR", true);
        }

        // Generic error
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new OpenRouterError(
            `Failed to generate response: ${errorMessage}`,
            "UNKNOWN_ERROR",
            true
        );
    }
}

/**
 * Generates a complete (non-streaming) response using Kimi K2 Thinking
 * 
 * @param systemPrompt - The system prompt with context
 * @param userQuery - The user's question
 * @param visionAnalysis - Optional vision analysis from GPT-4o
 * @returns The complete response text
 */
export async function generateKimiResponse(
    systemPrompt: string,
    userQuery: string,
    visionAnalysis?: string
): Promise<string> {
    try {
        const openrouter = getClient();

        // Build the user message, incorporating vision analysis if provided
        // Add reasoning guidance to leverage Kimi K2's chain-of-thought capabilities
        let userMessage = userQuery;
        if (visionAnalysis) {
            userMessage = `## Image Analysis (from vision model):
${visionAnalysis}

## User Question:
${userQuery}`;
        }

        // Add reasoning guidance for Kimi K2 Thinking
        userMessage += `

## Reasoning Approach
Work through this systematically:
1. Identify which sources are most relevant to the question
2. Extract and verify the specific information from those sources
3. Synthesize an accurate, well-cited response
4. Verify: Is every claim supported by a cited source?
5. Acknowledge any gaps where the sources don't provide complete information`;

        const response = await openrouter.chat.completions.create({
            model: KIMI_MODEL,
            temperature: 1.0,
            max_tokens: 8192,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage },
            ],
            // OpenRouter provider routing for cheapest option
            ...({
                provider: {
                    order: ["price"],
                    allow_fallbacks: true,
                },
            } as Record<string, unknown>),
        });

        return response.choices[0]?.message?.content || "";
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new OpenRouterError(`Failed to generate response: ${errorMessage}`, "API_ERROR", true);
    }
}

/**
 * Tests the OpenRouter/Kimi connection with a simple prompt
 */
export async function testKimiConnection(): Promise<boolean> {
    try {
        const openrouter = getClient();
        const response = await openrouter.chat.completions.create({
            model: KIMI_MODEL,
            messages: [{ role: "user", content: "Reply with 'OK' if you can read this." }],
            max_tokens: 10,
        });
        const text = response.choices[0]?.message?.content || "";
        return text.toLowerCase().includes("ok");
    } catch {
        return false;
    }
}
