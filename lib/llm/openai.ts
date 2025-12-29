/**
 * OpenAI o4-mini LLM Integration
 * 
 * Uses OpenAI's SDK for o4-mini model with reasoning_effort: "high" for enhanced thinking.
 * Supports streaming responses for real-time output.
 */

import OpenAI from "openai";
import { ChatCompletionContentPart } from "openai/resources/index";

// OpenAI model configuration
// o4-mini is a reasoning model that supports reasoning_effort parameter
const OPENAI_MODEL = "o4-mini";

// Initialize the OpenAI client
let client: OpenAI | null = null;

/**
 * Custom error class for OpenAI API errors
 */
export class OpenAIError extends Error {
    constructor(
        message: string,
        public readonly code?: string,
        public readonly isRetryable: boolean = false
    ) {
        super(message);
        this.name = "OpenAIError";
    }
}

/**
 * Initializes and returns the OpenAI client
 */
function getClient(): OpenAI {
    if (client) return client;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new OpenAIError(
            "OPENAI_API_KEY environment variable is not set. Please add it to .env",
            "MISSING_API_KEY",
            false
        );
    }

    client = new OpenAI({ apiKey });
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
 * Generates a response using OpenAI o4-mini with streaming and reasoning_effort: high
 * 
 * @param systemPrompt - The system prompt with context
 * @param userQuery - The user's question
 * @param images - Optional array of base64 images
 * @yields StreamChunk objects with text content
 */
export async function* generateOpenAIStream(
    systemPrompt: string,
    userQuery: string,
    images?: string[]
): AsyncGenerator<StreamChunk> {
    try {
        const openai = getClient();

        // Prepare user content
        let userContent: string | ChatCompletionContentPart[] = userQuery;

        if (images && images.length > 0) {
            userContent = [
                { type: "text", text: userQuery },
                ...images.map(img => ({
                    type: "image_url",
                    image_url: { url: img }
                } as ChatCompletionContentPart))
            ];
        }

        // Create streaming chat completion with reasoning_effort: high
        // o4-mini supports low, medium, high reasoning effort levels
        const stream = await openai.chat.completions.create({
            model: OPENAI_MODEL,
            stream: true,
            /**
             * reasoning_effort: o4-mini's enhanced reasoning mode (low/medium/high)
             * @since Dec 2024 - Requires openai v4.76.0+
             */
            reasoning_effort: "high",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userContent },
            ],
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
        // Handle specific OpenAI error types
        if (error instanceof OpenAI.APIError) {
            const status = error.status;
            const message = error.message;

            if (status === 401) {
                throw new OpenAIError(
                    "Invalid OpenAI API key. Please check your OPENAI_API_KEY in .env",
                    "INVALID_API_KEY",
                    false
                );
            }

            if (status === 429) {
                throw new OpenAIError(
                    "API rate limit exceeded. Please try again in a moment.",
                    "RATE_LIMIT",
                    true
                );
            }

            if (status === 500 || status === 502 || status === 503) {
                throw new OpenAIError(
                    "OpenAI service is temporarily unavailable. Please try again later.",
                    "SERVICE_UNAVAILABLE",
                    true
                );
            }

            if (status === 400 && message.includes("context_length")) {
                throw new OpenAIError(
                    "The request was too long. Please try with a shorter query.",
                    "CONTEXT_TOO_LONG",
                    false
                );
            }

            throw new OpenAIError(`OpenAI API error: ${message}`, "API_ERROR", true);
        }

        // Generic error
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new OpenAIError(
            `Failed to generate response: ${errorMessage}`,
            "UNKNOWN_ERROR",
            true
        );
    }
}

/**
 * Generates a complete (non-streaming) response using OpenAI o4-mini with reasoning_effort: high
 * Useful for testing and simpler use cases
 * 
 * @param systemPrompt - The system prompt with context
 * @param userQuery - The user's question
 * @param images - Optional array of base64 images
 * @returns The complete response text
 */
export async function generateOpenAIResponse(
    systemPrompt: string,
    userQuery: string,
    images?: string[]
): Promise<string> {
    try {
        const openai = getClient();

        // Prepare user content
        let userContent: string | ChatCompletionContentPart[] = userQuery;

        if (images && images.length > 0) {
            userContent = [
                { type: "text", text: userQuery },
                ...images.map(img => ({
                    type: "image_url",
                    image_url: { url: img }
                } as ChatCompletionContentPart))
            ];
        }

        const response = await openai.chat.completions.create({
            model: OPENAI_MODEL,
            /**
             * reasoning_effort: o4-mini's enhanced reasoning mode (low/medium/high)
             * @since Dec 2024 - Requires openai v4.76.0+
             */
            reasoning_effort: "high",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userContent },
            ],
        });

        return response.choices[0]?.message?.content || "";
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new OpenAIError(`Failed to generate response: ${errorMessage}`, "API_ERROR", true);
    }
}

/**
 * Tests the OpenAI connection with a simple prompt
 */
export async function testOpenAIConnection(): Promise<boolean> {
    try {
        const openai = getClient();
        const response = await openai.chat.completions.create({
            model: OPENAI_MODEL,
            messages: [{ role: "user", content: "Reply with 'OK' if you can read this." }],
            max_completion_tokens: 10,
        });
        const text = response.choices[0]?.message?.content || "";
        return text.toLowerCase().includes("ok");
    } catch {
        return false;
    }
}
