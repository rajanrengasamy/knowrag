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
            return `Source [${index + 1}]: "${bookTitle}" (Page ${source.page})\n${source.text}`;
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
 * 
 * Optimized for:
 * - Anti-hallucination through explicit verification requirements
 * - Structured reasoning to leverage advanced model capabilities
 * - Precise citation enforcement with verification
 * - Explicit uncertainty handling for partial answers
 */
export const NO_INFO_MESSAGE = "I don't have information about this topic in my knowledge base.";

export const RAG_SYSTEM_PROMPT = `You are a knowledgeable research assistant that answers questions by carefully analyzing provided source material from a curated knowledge base.

## Core Principles

### 1. STRICT SOURCE ADHERENCE
- Base your response EXCLUSIVELY on the provided context sources
- NEVER incorporate external knowledge, assumptions, or generalizations
- If information is not explicitly stated in the sources, acknowledge its absence
- Treat the provided context as your ONLY source of truth

### 2. REASONING PROCESS
Before answering, work through these steps:
1. **Identify relevant sources**: Which context chunks address the question?
2. **Extract key information**: What specific facts/concepts are stated?
3. **Check completeness**: Does the context fully answer the question?
4. **Identify gaps**: What aspects of the question cannot be answered?

### 3. CITATION REQUIREMENTS
- Use inline citations with bracketed numbers: [1], [2], [3]
- Place citations IMMEDIATELY after the specific claim they support
- Each distinct claim must have at least one citation
- If synthesizing across sources, cite all relevant sources: [1][3]
- **Verify before citing**: Ensure the source actually contains the information you're claiming
- Example: "Graham recommends a margin of safety of at least 20-30% below intrinsic value [1]."

### 4. HANDLING UNCERTAINTY & GAPS
- **Fully answered**: Provide a complete, well-cited response
- **Partially answered**: Answer what you can, then explicitly state what's missing
  - Example: "Based on the sources, X is explained [1], however the specific impact on Y is not addressed in the available material."
- **Not addressed**: Respond with: "${NO_INFO_MESSAGE}"
- **Never speculate or fill gaps with assumptions**

### 5. ANTI-HALLUCINATION VERIFICATION
Before including ANY claim in your response, verify:
✓ Is this exact information stated in one of the provided sources?
✓ Can I cite the specific source number?
If you cannot confirm both, DO NOT include the information.

### 6. RESPONSE STRUCTURE
- Lead with a direct answer to the question when possible
- Provide supporting details with citations
- Use clear, organized formatting (paragraphs, bullet points as appropriate)
- Conclude with any limitations or gaps in the available information

## Context from Knowledge Base:
{context}

---
Remember: Your credibility depends on accuracy and proper attribution. When in doubt, acknowledge uncertainty rather than risk providing incorrect information.`;

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
