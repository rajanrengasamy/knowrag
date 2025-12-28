/**
 * RAG System Prompt Template
 * 
 * This module defines the system prompts used for the RAG query pipeline.
 * The prompts instruct the LLM to:
 * 1. Only answer based on the provided context
 * 2. Include citations in "(Book Title, p. XX)" format
 * 3. Acknowledge when information is not available
 */

export interface ContextSource {
    text: string;
    source: string;
    page: number;
    chunkIndex: number;
}

/**
 * Formats context chunks into a numbered list for the LLM
 */
export function formatContext(sources: ContextSource[]): string {
    if (sources.length === 0) {
        return "No relevant context found.";
    }

    return sources
        .map((source, index) => {
            const bookTitle = extractBookTitle(source.source);
            return `[${index + 1}] "${bookTitle}" (Page ${source.page}):\n${source.text}`;
        })
        .join("\n\n---\n\n");
}

/**
 * Extracts a clean book title from the source filename
 * e.g., "The Intelligent Investor - BENJAMIN GRAHAM.pdf" -> "The Intelligent Investor"
 */
export function extractBookTitle(source: string): string {
    // Remove file extension
    let title = source.replace(/\.pdf$/i, "");

    // Remove path if present
    title = title.split("/").pop() || title;
    title = title.split("\\").pop() || title;

    // Remove author portion after dash or hyphen (common pattern)
    const dashIndex = title.indexOf(" - ");
    if (dashIndex > 0) {
        title = title.substring(0, dashIndex);
    }

    return title.trim();
}

/**
 * The main RAG system prompt template
 * Instructs the LLM to answer questions based on provided context with citations
 */
export const RAG_SYSTEM_PROMPT = `You are a knowledgeable assistant that answers questions based exclusively on the provided context from books in a knowledge base.

## Your Task
Answer the user's question using ONLY the information provided in the context below. Do not use any external knowledge.

## Citation Requirements
- **Always cite your sources** using the format: (Book Title, p. XX)
- Include citations inline immediately after the relevant information
- If multiple sources support a point, cite all of them
- Example: "The margin of safety principle suggests buying securities at a significant discount (The Intelligent Investor, p. 512)."

## Response Guidelines
1. Be accurate and faithful to the source material
2. Synthesize information from multiple chunks when relevant
3. Use clear, well-organized language
4. If the context doesn't contain information to answer the question, respond with: "I don't have information about this topic in my knowledge base."
5. Never make up or hallucinate information - only use what's in the context

## Context from Knowledge Base:
{context}`;

/**
 * Generates the complete system prompt with context inserted
 */
export function generateSystemPrompt(context: string): string {
    return RAG_SYSTEM_PROMPT.replace("{context}", context);
}

/**
 * Generates a system prompt from source chunks
 */
export function generateSystemPromptFromSources(sources: ContextSource[]): string {
    const formattedContext = formatContext(sources);
    return generateSystemPrompt(formattedContext);
}
