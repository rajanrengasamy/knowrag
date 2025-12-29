# System Prompt Optimization Analysis

**Date**: December 29, 2025  
**Author**: Claude (Antigravity)  
**Purpose**: Thorough analysis of system prompts for optimal RAG inference and anti-hallucination measures

---

## Executive Summary

This analysis reviews the system prompts used in KnowRAG for:
1. **RAG System Prompt** (`lib/prompts/rag-prompt.ts`) - Main inference prompt
2. **Vision Analysis Prompt** (`lib/llm/openai.ts`) - GPT-4o image analysis (Stage 1)
3. **Kimi K2 Thinking Integration** (`lib/llm/openrouter.ts`) - Reasoning model (Stage 2)

### Overall Assessment: **Good Foundation, Room for Enhancement** ⭐⭐⭐⭐

The current prompts are well-structured but can be significantly improved for:
- **Stronger anti-hallucination guardrails**
- **Better reasoning chain guidance**
- **More precise citation enforcement**
- **Explicit uncertainty acknowledgment**

---

## 1. Current RAG System Prompt Analysis

### Current Implementation
```typescript
export const RAG_SYSTEM_PROMPT = `You are a knowledgeable assistant that answers questions based exclusively on the provided context from books in a knowledge base.

## Your Task
Answer the user's question using ONLY the information provided in the context below. Do not use any external knowledge.

## Citation Requirements
- **Always cite your sources** using bracketed source markers like [1], [2], [3]
- Use the source numbers from the context block below
- Include citations inline immediately after the relevant information
- If multiple sources support a point, cite all of them
- Example: "The margin of safety requires a discount to intrinsic value [1]."

## Response Guidelines
1. Be accurate and faithful to the source material
2. Synthesize information from multiple chunks when relevant
3. Use clear, well-organized language
4. If the context doesn't contain information to answer the question, respond with: "${NO_INFO_MESSAGE}"
5. Never make up or hallucinate information - only use what's in the context

## Context from Knowledge Base:
{context}`;
```

### ✅ Strengths
1. **Clear grounding instruction** - "ONLY the information provided"
2. **Explicit citation format** - Bracketed markers with example
3. **Fallback message** - Clear "I don't have information" response
4. **Anti-hallucination statement** - "Never make up or hallucinate"

### ⚠️ Areas for Improvement

#### Issue 1: Weak Uncertainty Language
**Problem**: The prompt doesn't explicitly guide the model on expressing uncertainty or partial answers.  
**Risk**: Model may either refuse entirely or make up information to "fill gaps."

#### Issue 2: No Chain-of-Thought Guidance
**Problem**: Advanced reasoning models (Kimi K2, o4-mini) benefit from explicit reasoning instructions.  
**Risk**: Models may provide shallow responses without leveraging their reasoning capabilities.

#### Issue 3: Citation Verification Not Emphasized
**Problem**: No instruction to verify that cited information actually supports the claim.  
**Risk**: Models may cite source [1] but include information not in source [1].

#### Issue 4: No Length/Depth Guidance
**Problem**: No guidance on response completeness vs. conciseness trade-off.  
**Risk**: Responses may be too brief or unnecessarily verbose.

#### Issue 5: Missing Meta-Instruction for Reasoning Models
**Problem**: Kimi K2 Thinking and o4-mini have special reasoning modes, but the prompt doesn't leverage them.  
**Risk**: Not fully utilizing the model's reasoning capabilities.

---

## 2. Current Vision Analysis Prompt Analysis

### Current Implementation
```typescript
const userContent: ChatCompletionContentPart[] = [
    {
        type: "text",
        text: `Analyze the following image(s) in detail. The user's question for context is: "${userQuery}"

Please provide:
1. A detailed description of what you see in each image
2. Any text, numbers, charts, tables, or data visible
3. Key insights or patterns relevant to the user's question
4. Any specific details that might be useful for answering their question

Be thorough and precise - your analysis will be used by another AI for reasoning.`
    },
    // ... images
];

// System prompt:
"You are an expert image analyst. Provide detailed, accurate descriptions of images for downstream AI reasoning. Focus on extracting all relevant information, especially text, data, and visual patterns."
```

### ✅ Strengths
1. **Structured extraction** - 4-point framework for analysis
2. **Context awareness** - Includes user's question for relevance
3. **Downstream awareness** - "will be used by another AI"

### ⚠️ Areas for Improvement

#### Issue 1: No Uncertainty Expression for OCR/Reading
**Problem**: Vision models can misread text, but prompt doesn't encourage confidence indicators.  
**Risk**: Downstream model may treat uncertain readings as definitive.

#### Issue 2: No Handling of Ambiguous/Low-Quality Images
**Problem**: No guidance on how to express when an image is unclear or partially visible.

#### Issue 3: Missing Structure for Multi-Image Scenarios
**Problem**: When multiple images are present, no explicit instruction on how to organize output.

---

## 3. Recommended Optimizations

### 3.1 Enhanced RAG System Prompt

```typescript
export const RAG_SYSTEM_PROMPT_V2 = `You are a knowledgeable research assistant that answers questions by carefully analyzing provided source material from a curated knowledge base.

## Core Principles

### 1. STRICT SOURCE ADHERENCE
- Base your response EXCLUSIVELY on the provided context sources
- NEVER incorporate external knowledge, assumptions, or generalizations
- If information is not explicitly stated in the sources, acknowledge its absence
- Treat the provided context as your ONLY source of truth

### 2. REASONING PROCESS
Before answering, mentally work through these steps:
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
- If context FULLY answers the question: Provide a complete, well-cited response
- If context PARTIALLY answers: Answer what you can, then explicitly state what information is missing
  - Example: "Based on the sources, X is explained [1], but the specific impact on Y is not addressed in the available material."
- If context does NOT address the question: Respond with: "${NO_INFO_MESSAGE}"
- **Never speculate or fill gaps with assumptions**

### 5. RESPONSE STRUCTURE
- Lead with a direct answer to the question when possible
- Provide supporting details with citations
- Use clear, organized formatting (paragraphs, bullet points as appropriate)
- Conclude with any limitations or gaps in the available information

## Context from Knowledge Base:
{context}

---
Remember: Your credibility depends on accuracy and proper attribution. When in doubt, acknowledge uncertainty rather than risk providing incorrect information.`;
```

### 3.2 Enhanced Vision Analysis Prompt

```typescript
export const VISION_ANALYSIS_PROMPT = `Analyze the following image(s) comprehensively. Your analysis will be used by a reasoning AI to answer this question: "${userQuery}"

## Analysis Framework

### For EACH image, provide:

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
- Relationships between elements
- Information specifically relevant to the user's question

**4. Confidence Notes**
- Flag any elements that are partially visible, blurry, or ambiguous
- Use "appears to be" or "likely" for uncertain interpretations
- State "cannot determine" for unreadable/unclear elements

## Multi-Image Format
If analyzing multiple images, clearly label each:
### Image 1:
[analysis]

### Image 2:
[analysis]

## Quality Guidelines
- Be thorough but focused on relevance to the question
- Precision over assumption: when uncertain, say so
- Extract all visible text verbatim when possible`;

export const VISION_SYSTEM_PROMPT = `You are an expert image analyst specializing in precise information extraction. Your role is to provide comprehensive, accurate visual analysis that will be used by a downstream AI for reasoning and answering user questions.

Key requirements:
1. **Accuracy over completeness**: Only report what you can clearly see
2. **Uncertainty marking**: Explicitly flag low-confidence observations
3. **Verbatim text extraction**: Quote visible text exactly as written
4. **Structured output**: Use clear headings and formatting for easy parsing
5. **Question relevance**: Prioritize details likely to help answer the user's question`;
```

### 3.3 Model-Specific Optimization for Kimi K2 Thinking

Since Kimi K2 Thinking has exposed reasoning capabilities, we can add a reasoning-specific preamble:

```typescript
// In lib/llm/openrouter.ts - when building the message for Kimi K2

function buildKimiMessage(userQuery: string, visionAnalysis?: string): string {
    let message = userQuery;
    
    if (visionAnalysis) {
        message = `## Image Analysis (from vision model):
${visionAnalysis}

## User Question:
${userQuery}`;
    }
    
    // Add reasoning guidance for Kimi's thinking mode
    message += `

## Reasoning Approach
Work through this step-by-step:
1. First, identify which sources are most relevant to the question
2. Extract and verify the specific information from those sources
3. Synthesize an accurate, well-cited response
4. Check: Is every claim supported by a cited source?
5. Identify any gaps where the sources don't provide complete information`;
    
    return message;
}
```

---

## 4. Anti-Hallucination Strategies

### Current State
The existing prompt includes basic anti-hallucination measures:
- "Do not use any external knowledge"
- "Never make up or hallucinate information"

### Enhanced Strategies

#### Strategy 1: Explicit Verification Loop
Add to the system prompt:
```
Before including ANY fact in your response, verify:
□ Is this exact information stated in one of the provided sources?
□ Can I cite the specific source number?
If you cannot check both boxes, DO NOT include the information.
```

#### Strategy 2: Structured Uncertainty Expression
```
When information is:
- COMPLETE: Provide full answer with citations
- PARTIAL: Answer what's available, explicitly note: "The sources do not address [specific aspect]"
- ABSENT: Use the standard "I don't have information" response
- CONFLICTING: Present both viewpoints with their citations
```

#### Strategy 3: Citation Verification Instruction
```
Citation Integrity Rule:
- Only cite a source for information that EXACTLY appears in that source
- Do not cite a source for paraphrased or inferred content
- If you're synthesizing, cite ALL sources you're drawing from
```

#### Strategy 4: Self-Check Instruction (for Reasoning Models)
Add to the user message for Kimi K2 and o4-mini:
```
Before finalizing your response, verify:
1. Every factual claim has a citation
2. Each citation accurately reflects the source content
3. No information was added from outside the provided context
4. Gaps are explicitly acknowledged, not filled with assumptions
```

---

## 5. Implementation Recommendations

### Priority 1 (High Impact, Low Effort)

1. **Update `lib/prompts/rag-prompt.ts`** with enhanced system prompt
   - Stronger anti-hallucination language
   - Explicit uncertainty handling
   - Verification checklist

2. **Update `lib/llm/openai.ts`** vision analysis prompt
   - Add confidence indicators
   - Better multi-image handling
   - Uncertainty markers for OCR

### Priority 2 (Medium Impact, Medium Effort)

3. **Add reasoning guidance** to Kimi K2 Thinking calls
   - Model-specific prompt suffix
   - Chain-of-thought encouragement

4. **Create `lib/prompts/reasoning-prompts.ts`**
   - Centralize model-specific prompt modifications
   - Enable A/B testing of prompt variations

### Priority 3 (Enhancement, Higher Effort)

5. **Implement response validation**
   - Post-processing check for citation format
   - Warning if response doesn't include citations
   - Flag responses that might indicate hallucination patterns

6. **Add telemetry/logging**
   - Track citation density per response
   - Log "I don't have information" frequency
   - Monitor prompt token usage

---

## 6. Testing Recommendations

### Test Cases for Anti-Hallucination

1. **Out-of-scope query**: Ask about a topic definitely not in the knowledge base
   - Expected: Clean "I don't have information" response

2. **Partial information query**: Ask about something partially covered
   - Expected: Answer what's available + explicit gap acknowledgment

3. **Leading question with false premise**: "According to the books, [false claim]..."
   - Expected: Model should not confirm false premises

4. **Citation accuracy check**: Ask a question, verify citations match actual chunks
   - Expected: All citations should be verifiable

### Test Cases for Reasoning Quality

1. **Synthesis query**: Question requiring information from multiple sources
   - Expected: Multi-source synthesis with appropriate citations

2. **Complex reasoning**: Question requiring inference from stated facts
   - Expected: Logical reasoning clearly tied to source material

3. **Ambiguous query**: Question that could be interpreted multiple ways
   - Expected: Either clarification request or comprehensive coverage

---

## 7. Proposed Code Changes

### File: `lib/prompts/rag-prompt.ts`

Replace the current `RAG_SYSTEM_PROMPT` with the enhanced version (Section 3.1 above).

### File: `lib/llm/openai.ts`

Update the `generateVisionAnalysis` function's prompts (Section 3.2 above).

### New File: `lib/prompts/model-specific.ts`

Create model-specific prompt enhancements for reasoning models.

---

## Conclusion

The current KnowRAG prompt architecture is functional but can be significantly strengthened. The key improvements focus on:

1. **Stronger anti-hallucination guardrails** through explicit verification instructions
2. **Better uncertainty handling** with structured partial-answer support  
3. **Leveraging reasoning capabilities** of advanced models like Kimi K2
4. **Improved citation enforcement** with verification requirements

Implementing these changes should result in more accurate, trustworthy, and well-cited responses while minimizing the risk of hallucination.

---

*Analysis complete. Ready for implementation review.*
