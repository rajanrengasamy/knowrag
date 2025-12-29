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
const DEFAULT_OPENAI_MODEL = "o4-mini";
type OpenAIModel = "o4-mini" | "gpt-4o";

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
    images?: string[],
    model: OpenAIModel = DEFAULT_OPENAI_MODEL
): AsyncGenerator<StreamChunk> {
    try {
        const openai = getClient();

        // Prepare user content
        let userContent: string | ChatCompletionContentPart[] = userQuery;

        if (images && images.length > 0) {
            if (model !== "gpt-4o") {
                throw new OpenAIError(
                    "Selected model does not support images. Please use GPT-4o for vision inputs.",
                    "MODEL_NOT_VISION",
                    false
                );
            }
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
            model,
            stream: true,
            ...(model === "o4-mini"
                ? {
                    /**
                     * reasoning_effort: o4-mini's enhanced reasoning mode (low/medium/high)
                     * @since Dec 2024 - Requires openai v4.76.0+
                     */
                    reasoning_effort: "high",
                }
                : {}),
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
    images?: string[],
    model: OpenAIModel = DEFAULT_OPENAI_MODEL
): Promise<string> {
    try {
        const openai = getClient();

        // Prepare user content
        let userContent: string | ChatCompletionContentPart[] = userQuery;

        if (images && images.length > 0) {
            if (model !== "gpt-4o") {
                throw new OpenAIError(
                    "Selected model does not support images. Please use GPT-4o for vision inputs.",
                    "MODEL_NOT_VISION",
                    false
                );
            }
            userContent = [
                { type: "text", text: userQuery },
                ...images.map(img => ({
                    type: "image_url",
                    image_url: { url: img }
                } as ChatCompletionContentPart))
            ];
        }

        const response = await openai.chat.completions.create({
            model,
            ...(model === "o4-mini"
                ? {
                    /**
                     * reasoning_effort: o4-mini's enhanced reasoning mode (low/medium/high)
                     * @since Dec 2024 - Requires openai v4.76.0+
                     */
                    reasoning_effort: "high",
                }
                : {}),
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
 * Generates vision analysis from images using GPT-4o
 * 
 * Stage 1 of the two-stage pipeline:
 * This function analyzes images and produces a detailed textual description
 * that can be passed to the reasoning model (Kimi K2, etc.)
 * 
 * @param images - Array of base64 images
 * @param userQuery - The user's question for context
 * @returns Detailed text analysis of the images
 */
export async function generateVisionAnalysis(
    images: string[],
    userQuery: string
): Promise<string> {
    try {
        const openai = getClient();

        // Enhanced vision analysis prompt with structured extraction
        const analysisPrompt = images.length > 1
            ? `Analyze the following ${images.length} images comprehensively. Your analysis will be used by a reasoning AI to answer this question: "${userQuery}"

## Analysis Framework

For EACH image, provide a clearly labeled section:

### Image [N]:

**1. Visual Description**
- Overall composition and subject matter
- Key elements, objects, or figures present
- Spatial relationships and layout

**2. Text & Data Extraction**
- ALL visible text (quote exactly, use [unclear: ...] for uncertain readings)
- Numbers, statistics, dates
- Charts/graphs: type, axes, key data points
- Tables: structure and content

**3. Contextual Insights**
- Patterns or trends visible
- Information specifically relevant to: "${userQuery}"

**4. Confidence Notes**
- Flag any elements that are partially visible, blurry, or ambiguous
- Use "appears to be" or "likely" for uncertain interpretations
- State "cannot determine" for unreadable/unclear elements

## Quality Guidelines
- Precision over assumption: when uncertain, say so
- Extract all visible text verbatim when possible
- Be thorough but focused on relevance to the question`
            : `Analyze this image comprehensively. Your analysis will be used by a reasoning AI to answer this question: "${userQuery}"

## Analysis Framework

**1. Visual Description**
- Overall composition and subject matter
- Key elements, objects, or figures present
- Spatial relationships and layout

**2. Text & Data Extraction**
- ALL visible text (quote exactly, use [unclear: ...] for uncertain readings)
- Numbers, statistics, dates
- Charts/graphs: type, axes, key data points
- Tables: structure and content

**3. Contextual Insights**
- Patterns or trends visible
- Information specifically relevant to: "${userQuery}"

**4. Confidence Notes**
- Flag any elements that are partially visible, blurry, or ambiguous
- Use "appears to be" or "likely" for uncertain interpretations
- State "cannot determine" for unreadable/unclear elements

## Quality Guidelines
- Precision over assumption: when uncertain, say so
- Extract all visible text verbatim when possible
- Be thorough but focused on relevance to the question`;

        const userContent: ChatCompletionContentPart[] = [
            { type: "text", text: analysisPrompt },
            ...images.map(img => ({
                type: "image_url" as const,
                image_url: { url: img }
            }))
        ];

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are an expert image analyst specializing in precise information extraction for downstream AI reasoning.

Key requirements:
1. **Accuracy over completeness**: Only report what you can clearly see
2. **Uncertainty marking**: Explicitly flag low-confidence observations with [unclear: ...] or "appears to be"
3. **Verbatim text extraction**: Quote visible text exactly as written when possible
4. **Structured output**: Use clear headings and formatting for easy parsing
5. **Question relevance**: Prioritize details likely to help answer the user's question
6. **No assumptions**: Do not infer or assume information not visible in the image`
                },
                { role: "user", content: userContent }
            ],
            max_tokens: 4096,
        });

        return response.choices[0]?.message?.content || "Unable to analyze images.";
    } catch (error: unknown) {
        if (error instanceof OpenAI.APIError) {
            throw new OpenAIError(
                `Vision analysis failed: ${error.message}`,
                "VISION_ANALYSIS_ERROR",
                true
            );
        }
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new OpenAIError(
            `Vision analysis failed: ${errorMessage}`,
            "VISION_ANALYSIS_ERROR",
            true
        );
    }
}

/**
 * Tests the OpenAI connection with a simple prompt
 */
export async function testOpenAIConnection(): Promise<boolean> {
    try {
        const openai = getClient();
        const response = await openai.chat.completions.create({
            model: DEFAULT_OPENAI_MODEL,
            messages: [{ role: "user", content: "Reply with 'OK' if you can read this." }],
            max_completion_tokens: 10,
        });
        const text = response.choices[0]?.message?.content || "";
        return text.toLowerCase().includes("ok");
    } catch {
        return false;
    }
}

