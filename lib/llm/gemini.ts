/**
 * Gemini 3 Flash LLM Integration
 * 
 * Uses Google's Generative AI SDK with "thinking: high" mode for enhanced reasoning.
 * Supports streaming responses for real-time output.
 */

import { GoogleGenerativeAI, GenerativeModel, Part } from "@google/generative-ai";

// Gemini 3 Flash Preview - released December 17, 2025
// Supports configurable thinking levels: minimal, low, medium, high
const GEMINI_MODEL = "gemini-3-flash-preview";

// Initialize the Google AI client
let genAI: GoogleGenerativeAI | null = null;
let model: GenerativeModel | null = null;

/**
 * Custom error class for Gemini API errors
 */
export class GeminiError extends Error {
    constructor(
        message: string,
        public readonly code?: string,
        public readonly isRetryable: boolean = false
    ) {
        super(message);
        this.name = "GeminiError";
    }
}

// Helper to parse base64 data URL
function parseBase64Image(dataUrl: string): { mimeType: string; data: string } {
    const matches = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (!matches) {
        throw new Error("Invalid base64 image format");
    }
    return { mimeType: matches[1], data: matches[2] };
}

/**
 * Initializes the Gemini client with API key from environment
 */
function getClient(): GenerativeModel {
    if (model) return model;

    const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
        throw new GeminiError(
            "GOOGLE_API_KEY or GOOGLE_AI_API_KEY environment variable is not set. Please add it to .env",
            "MISSING_API_KEY",
            false
        );
    }

    genAI = new GoogleGenerativeAI(apiKey);

    // Configure Gemini 3 Flash with thinking_level: high for enhanced reasoning
    // The thinkingConfig enables the model's reasoning capabilities
    model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: {
            temperature: 0.7,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192,
            /**
             * thinkingConfig: Gemini 3's enhanced reasoning mode
             * @since Dec 2024 - Requires @google/generative-ai v0.24.1+
             * @note This is an intentional @ts-expect-error until SDK types are updated
             */
            // @ts-expect-error - thinkingConfig is a new feature not yet in SDK types
            thinkingConfig: {
                thinkingLevel: "high",
            },
        },
    });

    return model;
}

/**
 * Response chunk from streaming
 */
export interface StreamChunk {
    text: string;
    done: boolean;
}

/**
 * Generates a response using Gemini with streaming
 * 
 * @param systemPrompt - The system prompt with context
 * @param userQuery - The user's question
 * @param images - Optional array of base64 images
 * @yields StreamChunk objects with text content
 */
export async function* generateGeminiStream(
    systemPrompt: string,
    userQuery: string,
    images?: string[]
): AsyncGenerator<StreamChunk> {
    try {
        const client = getClient();

        // Prepare content parts
        const parts: (string | Part)[] = [
            `${systemPrompt}\n\n## User Question:\n${userQuery}`
        ];

        if (images && images.length > 0) {
            images.forEach(img => {
                try {
                    const { mimeType, data } = parseBase64Image(img);
                    parts.push({ inlineData: { mimeType, data } });
                } catch (e) {
                    console.error("Failed to parse image for Gemini:", e);
                }
            });
        }

        // Start streaming generation
        const result = await client.generateContentStream(parts);

        // Yield chunks as they arrive
        for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
                yield { text, done: false };
            }
        }

        // Signal completion
        yield { text: "", done: true };
    } catch (error: unknown) {
        // ... (existing error handling)
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        if (errorMessage.includes("quota") || errorMessage.includes("rate limit")) {
            throw new GeminiError(
                "API rate limit exceeded. Please try again in a moment.",
                "RATE_LIMIT",
                true
            );
        }

        if (errorMessage.includes("API_KEY_INVALID") || errorMessage.includes("invalid api key")) {
            throw new GeminiError(
                "Invalid Google API key. Please check your GOOGLE_API_KEY in .env",
                "INVALID_API_KEY",
                false
            );
        }

        if (errorMessage.includes("blocked") || errorMessage.includes("safety")) {
            throw new GeminiError(
                "Content was blocked by safety filters. Please try rephrasing your question.",
                "CONTENT_BLOCKED",
                false
            );
        }

        // Generic error
        throw new GeminiError(
            `Gemini API error: ${errorMessage}`,
            "API_ERROR",
            true
        );
    }
}

/**
 * Generates a complete (non-streaming) response using Gemini
 * Useful for testing and simpler use cases
 * 
 * @param systemPrompt - The system prompt with context
 * @param userQuery - The user's question
 * @param images - Optional array of base64 images
 * @returns The complete response text
 */
export async function generateGeminiResponse(
    systemPrompt: string,
    userQuery: string,
    images?: string[]
): Promise<string> {
    try {
        const client = getClient();

        // Prepare content parts
        const parts: (string | Part)[] = [
            `${systemPrompt}\n\n## User Question:\n${userQuery}`
        ];

        if (images && images.length > 0) {
            images.forEach(img => {
                try {
                    const { mimeType, data } = parseBase64Image(img);
                    parts.push({ inlineData: { mimeType, data } });
                } catch (e) {
                    console.error("Failed to parse image for Gemini:", e);
                }
            });
        }

        const result = await client.generateContent(parts);
        const response = result.response;

        return response.text();

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new GeminiError(`Failed to generate response: ${errorMessage}`, "API_ERROR", true);
    }
}

/**
 * Tests the Gemini connection with a simple prompt
 */
export async function testGeminiConnection(): Promise<boolean> {
    try {
        const client = getClient();
        const result = await client.generateContent("Reply with 'OK' if you can read this.");
        const response = result.response.text();
        return response.toLowerCase().includes("ok");
    } catch {
        return false;
    }
}
