# KnowRAG Architecture Guide

> A comprehensive guide to understanding Vector Databases, RAG (Retrieval Augmented Generation), and how KnowRAG implements these technologies.

---

## Table of Contents

1. [Part 1: Conceptual Foundation (Beginner)](#part-1-conceptual-foundation-beginner)
2. [Part 2: Advanced Methodology](#part-2-advanced-methodology)
3. [Part 3: KnowRAG Implementation](#part-3-knowrag-implementation)

---

# Part 1: Conceptual Foundation (Beginner)

## What Problem Are We Solving?

Imagine you have a library of 16 investment books (like "The Intelligent Investor" by Benjamin Graham). You want to ask questions like:

> "What does Graham say about margin of safety?"

Traditional search (like Ctrl+F) would find exact word matches, but what if Graham talks about "safety margin" or "protecting your investment" without using those exact words? That's where **semantic search** comes in.

## The Big Idea: Teaching Computers to Understand Meaning

### What is an Embedding?

An **embedding** is a way to convert text (words, sentences, paragraphs) into a list of numbers that captures its *meaning*.

Think of it like coordinates on a map:
- "Dog" might become `[0.2, 0.8, 0.1, ...]`
- "Puppy" might become `[0.21, 0.79, 0.12, ...]` (very close to "Dog"!)
- "Airplane" might become `[0.9, 0.1, 0.7, ...]` (far from both)

```
                    Meaning Space
                         ^
                         |
          "airplane" •   |
                         |
                         |
    "dog" •  • "puppy"   |
                         |
         ----------------+---------------->
```

The closer two points are in this "meaning space," the more semantically similar they are.

### What is a Vector?

A **vector** is just a list of numbers: `[0.2, 0.8, 0.1, 0.5, ...]`

When we convert text to an embedding, we get a vector. That's why we call databases that store these "vector databases."

### What is a Vector Database?

A **vector database** is a specialized database designed to:
1. **Store** millions of vectors efficiently
2. **Search** for the most similar vectors to a query (very fast!)
3. **Attach metadata** to each vector (like "this came from page 42")

Traditional databases excel at exact matches:
```sql
SELECT * FROM books WHERE title = "The Intelligent Investor"
```

Vector databases excel at similarity:
```
"Find the 5 vectors most similar to the meaning of 'margin of safety'"
```

## What is RAG (Retrieval Augmented Generation)?

**RAG** is a technique that makes AI chatbots smarter by giving them access to your specific documents.

### The Problem with Plain LLMs

Large Language Models (like ChatGPT or Gemini) have two limitations:
1. **Knowledge cutoff**: They don't know about documents they weren't trained on
2. **Hallucination**: They might make things up when they don't know

### The RAG Solution

Instead of asking the AI to remember everything, we:
1. **Retrieve** relevant information from our documents first
2. **Augment** the AI's prompt with that information
3. **Generate** an answer based on the provided context

```
┌─────────────────────────────────────────────────────────────┐
│                        RAG Pipeline                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   User Question                                             │
│        │                                                    │
│        ▼                                                    │
│   ┌─────────────┐      ┌──────────────────┐                │
│   │  Embed the  │      │  Vector Database │                │
│   │  Question   │─────▶│  (Your Books)    │                │
│   └─────────────┘      └────────┬─────────┘                │
│                                 │                           │
│                    Top 5 Relevant Chunks                    │
│                                 │                           │
│                                 ▼                           │
│   ┌─────────────────────────────────────────┐              │
│   │              LLM (AI Model)              │              │
│   │  "Based on these chunks, answer..."      │              │
│   └─────────────────────────────┬───────────┘              │
│                                 │                           │
│                                 ▼                           │
│                         AI Response                         │
│           "Graham says margin of safety is..."              │
│                    (The Intelligent Investor, p. 512)       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Why This Works

1. **Accuracy**: The AI only answers based on your actual documents
2. **Citations**: The AI can tell you exactly where it found the information
3. **No hallucination**: If the answer isn't in your documents, it says so
4. **Always current**: Add new documents anytime - no retraining needed

## The Two Phases of RAG

### Phase A: Ingestion (One-Time Setup)

Prepare your documents for searching:

```
┌─────────────────────────────────────────────────────────────┐
│                     INGESTION PHASE                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   📄 PDF Document                                           │
│        │                                                    │
│        ▼                                                    │
│   ┌─────────────┐                                          │
│   │   Extract   │  "Chapter 1: Investment vs Speculation"  │
│   │    Text     │  "The distinction between investment..."  │
│   └──────┬──────┘                                          │
│          │                                                  │
│          ▼                                                  │
│   ┌─────────────┐                                          │
│   │   Chunk     │  Split into smaller pieces               │
│   │   Text      │  (512-1024 tokens each)                  │
│   └──────┬──────┘                                          │
│          │                                                  │
│          ▼                                                  │
│   ┌─────────────┐                                          │
│   │  Generate   │  Each chunk → [0.2, 0.8, 0.1, ...]       │
│   │  Embeddings │  (using embedding model)                  │
│   └──────┬──────┘                                          │
│          │                                                  │
│          ▼                                                  │
│   ┌─────────────┐                                          │
│   │   Store in  │  Vector + Metadata                       │
│   │ Vector DB   │  (filename, page, chunk text)            │
│   └─────────────┘                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Phase B: Query (Every Time a User Asks)

Find and answer using your prepared documents:

```
┌─────────────────────────────────────────────────────────────┐
│                       QUERY PHASE                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   "What is margin of safety?"                               │
│        │                                                    │
│        ▼                                                    │
│   ┌─────────────┐                                          │
│   │   Embed     │  Question → [0.3, 0.7, 0.2, ...]         │
│   │  Question   │  (same embedding model!)                  │
│   └──────┬──────┘                                          │
│          │                                                  │
│          ▼                                                  │
│   ┌─────────────┐                                          │
│   │  Similarity │  "Find 5 closest vectors"                │
│   │   Search    │                                           │
│   └──────┬──────┘                                          │
│          │                                                  │
│          ▼                                                  │
│   ┌─────────────────────────────────────┐                  │
│   │ Retrieved Chunks:                    │                  │
│   │ 1. "...margin of safety is..." p.512 │                  │
│   │ 2. "...protecting capital..." p.518  │                  │
│   │ 3. "...risk management..." p.520     │                  │
│   └──────┬──────────────────────────────┘                  │
│          │                                                  │
│          ▼                                                  │
│   ┌─────────────┐                                          │
│   │    LLM      │  "Use this context to answer..."         │
│   │  Generate   │                                           │
│   └──────┬──────┘                                          │
│          │                                                  │
│          ▼                                                  │
│   "Graham defines margin of safety as..."                   │
│   (The Intelligent Investor, p. 512)                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

# Part 2: Advanced Methodology

## Embedding Models Deep Dive

### How Embedding Models Work

Embedding models are neural networks trained on massive text datasets to understand language. They've learned that:
- "King" - "Man" + "Woman" ≈ "Queen"
- "Paris" is to "France" as "Tokyo" is to "Japan"

Modern embedding models produce vectors with **hundreds to thousands of dimensions** (not just 2D like our simplified examples).

### Popular Embedding Models

| Model | Dimensions | Provider | Cost (per 1M tokens) |
|-------|------------|----------|---------------------|
| `text-embedding-3-small` | 1536 | OpenAI | $0.02 |
| `text-embedding-3-large` | 3072 | OpenAI | $0.13 |
| `text-embedding-ada-002` | 1536 | OpenAI | $0.10 |
| `voyage-3` | 1024 | Voyage AI | $0.06 |
| `all-MiniLM-L6-v2` | 384 | HuggingFace | Free (local) |

### Embedding Quality Matters

Using the same embedding model for both ingestion and queries is **critical**. Different models create different "meaning spaces" - a vector from one model won't match correctly with vectors from another.

## Chunking Strategies

### Why Chunk?

LLMs have token limits (context windows). We can't feed an entire 600-page book at once. Chunks allow us to:
1. Retrieve only the relevant portions
2. Provide precise citations (page numbers)
3. Fit multiple relevant excerpts in the LLM's context

### Chunking Parameters

```
┌─────────────────────────────────────────────────────────────┐
│                    CHUNK PARAMETERS                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Chunk Size: 512-1024 tokens                               │
│   ├── Too small: loses context, fragments ideas             │
│   └── Too large: reduces precision, wastes tokens           │
│                                                             │
│   Chunk Overlap: 50-200 tokens                              │
│   └── Prevents ideas from being split at boundaries         │
│                                                             │
│   Example with overlap:                                     │
│   ┌──────────────────────┐                                 │
│   │      Chunk 1         │                                 │
│   │                 ┌────┼────────────────────┐            │
│   │    overlap      │    │     Chunk 2        │            │
│   └─────────────────┼────┘                    │            │
│                     │                    ┌────┼────────┐   │
│                     │     overlap        │    │Chunk 3 │   │
│                     └────────────────────┼────┘        │   │
│                                          └─────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Advanced Chunking Techniques

1. **Semantic Chunking**: Split at paragraph/section boundaries instead of fixed token counts
2. **Recursive Chunking**: Start with large chunks, subdivide if needed
3. **Document-Aware Chunking**: Respect headers, tables, and code blocks

## Similarity Search Algorithms

### Distance Metrics

How do we measure "similarity" between vectors?

**1. Cosine Similarity** (Most Common)
```
similarity = (A · B) / (||A|| × ||B||)
```
- Measures the angle between vectors
- Range: -1 (opposite) to 1 (identical)
- **Best for text**: Ignores magnitude, focuses on direction

**2. Euclidean Distance**
```
distance = √(Σ(Aᵢ - Bᵢ)²)
```
- Measures straight-line distance
- Smaller = more similar

**3. Dot Product**
```
similarity = Σ(Aᵢ × Bᵢ)
```
- Fast computation
- Used when vectors are normalized

### Approximate Nearest Neighbor (ANN)

With millions of vectors, checking every single one is too slow. ANN algorithms provide near-perfect results much faster:

| Algorithm | How It Works | Used By |
|-----------|--------------|---------|
| **HNSW** | Graph-based navigation | LanceDB, Pinecone |
| **IVF** | Clusters + inverted index | FAISS |
| **LSH** | Locality-sensitive hashing | Older systems |
| **ScaNN** | Quantization + reordering | Google |

```
Exact Search (Brute Force):
├── Check all 1,000,000 vectors
└── Time: O(n) = Slow 🐌

ANN with HNSW:
├── Navigate graph structure
├── Check ~100 vectors
└── Time: O(log n) = Fast 🚀
```

## LLM Integration Patterns

### Context Window Management

```
┌─────────────────────────────────────────────────────────────┐
│                    LLM CONTEXT WINDOW                        │
│                    (e.g., 128K tokens)                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────────────────────────────────┐                 │
│   │         System Prompt                 │  ~500 tokens   │
│   │ "You are an investment advisor..."    │                │
│   └──────────────────────────────────────┘                 │
│                                                             │
│   ┌──────────────────────────────────────┐                 │
│   │      Retrieved Context (5 chunks)     │  ~4000 tokens  │
│   │ Chunk 1: "Graham says..."             │                │
│   │ Chunk 2: "The margin of..."           │                │
│   │ ...                                   │                │
│   └──────────────────────────────────────┘                 │
│                                                             │
│   ┌──────────────────────────────────────┐                 │
│   │         User Question                 │  ~50 tokens    │
│   │ "What is margin of safety?"           │                │
│   └──────────────────────────────────────┘                 │
│                                                             │
│   ┌──────────────────────────────────────┐                 │
│   │     Reserved for Response             │  ~2000 tokens  │
│   │                                       │                │
│   └──────────────────────────────────────┘                 │
│                                                             │
│   [ Remaining space for more context if needed ]            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Prompt Engineering for RAG

A well-crafted system prompt ensures quality responses:

```
You are a research assistant with access to a knowledge base.

RULES:
1. ONLY answer based on the provided context
2. Cite every fact with format: (Book Title, p. XX)
3. If the context doesn't contain the answer, say:
   "I don't have information about this in my knowledge base."
4. NEVER make up page numbers or citations
5. Quote directly when relevant
```

### Reasoning Models

Some LLMs have built-in "thinking" capabilities:

| Model | Reasoning Feature | Cost Consideration |
|-------|-------------------|-------------------|
| Gemini 3 Flash | `thinking_level: high` | Thinking tokens FREE |
| OpenAI o4-mini | Chain-of-thought | Thinking tokens billed |
| Claude | Extended thinking | Thinking tokens billed |

## Advanced RAG Patterns

### 1. Hybrid Search

Combine semantic search with keyword search:

```
┌─────────────────────────────────────────────────────────────┐
│                     HYBRID SEARCH                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Query: "CAPM beta coefficient"                            │
│                                                             │
│   ┌─────────────────┐     ┌─────────────────┐              │
│   │ Semantic Search │     │ Keyword Search  │              │
│   │ (Meaning-based) │     │ (Exact match)   │              │
│   └────────┬────────┘     └────────┬────────┘              │
│            │                       │                        │
│            ▼                       ▼                        │
│   Results about          Results containing                 │
│   "risk measurement"     exactly "CAPM"                     │
│                                                             │
│            └───────────┬───────────┘                        │
│                        │                                    │
│                        ▼                                    │
│               ┌────────────────┐                           │
│               │ Merge & Rerank │                           │
│               └────────────────┘                           │
│                        │                                    │
│                        ▼                                    │
│               Best of Both Worlds                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2. Query Expansion

Improve retrieval by expanding the query:

```
Original: "margin of safety"

Expanded:
- "margin of safety"
- "safety margin"
- "investment protection"
- "downside protection"
- "Graham's safety principle"
```

### 3. Re-ranking

Use a secondary model to reorder retrieved chunks:

```
Initial Retrieval (by vector similarity):
1. Chunk about "safety regulations" (false positive!)
2. Chunk about "margin of safety"
3. Chunk about "investment margins"

After Re-ranking (by relevance model):
1. Chunk about "margin of safety"  ← promoted
2. Chunk about "investment margins"
3. Chunk about "safety regulations" ← demoted
```

---

# Part 3: KnowRAG Implementation

## Project Overview

KnowRAG is a local RAG application that lets you query a personal PDF knowledge base of investment books with AI-generated answers and precise citations.

```
┌─────────────────────────────────────────────────────────────┐
│                   KNOWRAG ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   /knowledge/                    Browser                    │
│   ├── The Intelligent Investor   ┌──────────────────────┐  │
│   ├── Principles                 │                      │  │
│   ├── Competitive Advantage      │   KnowRAG Chat UI    │  │
│   └── ...16 PDFs                 │   (Next.js + React)  │  │
│         │                        └──────────┬───────────┘  │
│         │                                   │              │
│         ▼                                   ▼              │
│   ┌─────────────┐              ┌────────────────────────┐  │
│   │  Ingestion  │              │      API Routes        │  │
│   │   Script    │              │  POST /api/chat        │  │
│   │ (One-time)  │              │  GET  /api/status      │  │
│   └──────┬──────┘              └───────────┬────────────┘  │
│          │                                 │               │
│          ▼                                 ▼               │
│   ┌──────────────────────────────────────────────────────┐ │
│   │                    RAG Engine                         │ │
│   │                  (LlamaIndexTS)                       │ │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │ │
│   │  │Embeddings│  │  Vector  │  │  LLM Generation  │   │ │
│   │  │ (OpenAI) │  │   Store  │  │ (Gemini/OpenAI)  │   │ │
│   │  └──────────┘  │(LanceDB) │  └──────────────────┘   │ │
│   │                └──────────┘                          │ │
│   └──────────────────────────────────────────────────────┘ │
│                                                             │
│   /data/lancedb/                                           │
│   └── [Persisted Vector Storage]                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 14+ (App Router) | React-based web interface |
| **Styling** | Tailwind CSS | Dark mode, responsive design |
| **Language** | TypeScript | Type safety throughout |
| **RAG Framework** | LlamaIndexTS | Document processing, retrieval |
| **Vector Database** | LanceDB | Local, embedded vector storage |
| **Embeddings** | OpenAI `text-embedding-3-small` | Text → Vector conversion |
| **LLM (Primary)** | Gemini 3 Flash | Reasoning with free thinking tokens |
| **LLM (Alternative)** | OpenAI o4-mini | Cost-effective reasoning model |

## File Structure

```
knowrag/
├── app/
│   ├── page.tsx                  # Main chat interface
│   ├── layout.tsx                # Root layout (dark mode)
│   └── api/
│       ├── chat/route.ts         # POST - Query endpoint
│       └── status/route.ts       # GET - Index status
│
├── components/
│   ├── ChatInput.tsx             # Question input box
│   ├── ChatMessage.tsx           # Message bubble (user/AI)
│   ├── ModelSelector.tsx         # Gemini/OpenAI dropdown
│   └── StatusIndicator.tsx       # "X documents indexed"
│
├── lib/
│   ├── rag/
│   │   ├── ingest.ts             # PDF → Chunks → Embeddings
│   │   ├── embeddings.ts         # OpenAI embedding wrapper
│   │   ├── vectordb.ts           # LanceDB operations
│   │   └── query.ts              # Retrieval pipeline
│   ├── llm/
│   │   ├── gemini.ts             # Gemini 3 Flash client
│   │   └── openai.ts             # o4-mini client
│   └── prompts/
│       └── rag-prompt.ts         # System prompts
│
├── scripts/
│   └── ingest.ts                 # CLI ingestion script
│
├── knowledge/                    # PDF knowledge base
│   ├── The Intelligent Investor.pdf
│   ├── Principles.pdf
│   └── ...16 investment books
│
├── data/
│   └── lancedb/                  # Vector storage (git-ignored)
│
├── docs/
│   └── PRD-v2.md                 # Product requirements
│
└── architecture.md               # This file
```

## Implementation Details

### 1. PDF Ingestion Pipeline

**File**: `lib/rag/ingest.ts`

```typescript
// Conceptual flow (not actual code)

async function ingestPDF(filepath: string): Promise<void> {
  // Step 1: Extract text with page numbers
  const pages = await extractTextFromPDF(filepath);

  // Step 2: Chunk into 512-1024 token segments
  const chunks = chunkDocument(pages, {
    chunkSize: 768,        // Target size
    chunkOverlap: 100,     // Overlap for continuity
    preservePageNumbers: true
  });

  // Step 3: Generate embeddings
  const embeddings = await Promise.all(
    chunks.map(chunk =>
      openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk.text
      })
    )
  );

  // Step 4: Store in LanceDB with metadata
  await vectordb.insert(
    chunks.map((chunk, i) => ({
      vector: embeddings[i],
      text: chunk.text,
      metadata: {
        filename: chunk.source,
        page: chunk.pageNumber,
        chunkIndex: i
      }
    }))
  );
}
```

**Usage**:
```bash
# Ingest a single PDF
npx ts-node scripts/ingest.ts --file "The Intelligent Investor.pdf"

# Ingest all PDFs (Phase 2)
npx ts-node scripts/ingest.ts --all
```

### 2. Vector Database (LanceDB)

**File**: `lib/rag/vectordb.ts`

LanceDB is an embedded vector database - no server required!

```typescript
// Conceptual flow (not actual code)

import * as lancedb from 'lancedb';

// Initialize database (local storage)
const db = await lancedb.connect('/data/lancedb');

// Create or open table
const table = await db.openTable('documents');

// Insert vectors
await table.add([
  {
    vector: [0.2, 0.8, 0.1, ...],  // 1536 dimensions
    text: "Graham defines margin of safety as...",
    filename: "The Intelligent Investor.pdf",
    page: 512
  }
]);

// Search for similar vectors
const results = await table.search([0.3, 0.7, 0.2, ...])
  .limit(5)
  .execute();
```

**Why LanceDB?**
- Embedded (no server to manage)
- Native Node.js support
- Persists to disk automatically
- Fast HNSW-based similarity search

### 3. Query Pipeline

**File**: `lib/rag/query.ts`

```typescript
// Conceptual flow (not actual code)

async function queryRAG(question: string, model: 'gemini' | 'openai') {
  // Step 1: Embed the question (SAME model as ingestion!)
  const questionEmbedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: question
  });

  // Step 2: Retrieve top-5 similar chunks
  const relevantChunks = await vectordb.search(questionEmbedding)
    .limit(5)
    .execute();

  // Step 3: Build context for LLM
  const context = relevantChunks.map(chunk =>
    `[From ${chunk.filename}, p. ${chunk.page}]\n${chunk.text}`
  ).join('\n\n');

  // Step 4: Generate response with chosen LLM
  const response = await llm.generate({
    model: model === 'gemini' ? 'gemini-3-flash' : 'o4-mini',
    systemPrompt: RAG_SYSTEM_PROMPT,
    userMessage: `Context:\n${context}\n\nQuestion: ${question}`
  });

  return response;
}
```

### 4. LLM Integration

**Files**: `lib/llm/gemini.ts`, `lib/llm/openai.ts`

**Gemini 3 Flash** (Primary):
```typescript
const response = await gemini.generate({
  model: "gemini-3-flash",
  thinking_level: "high",  // Free reasoning tokens!
  systemPrompt: RAG_SYSTEM_PROMPT,
  messages: [{ role: "user", content: prompt }]
});
```

**OpenAI o4-mini** (Alternative):
```typescript
const response = await openai.chat.completions.create({
  model: "o4-mini",
  messages: [
    { role: "system", content: RAG_SYSTEM_PROMPT },
    { role: "user", content: prompt }
  ],
  stream: true  // Stream for better UX
});
```

### 5. Citation System

**File**: `lib/prompts/rag-prompt.ts`

```typescript
export const RAG_SYSTEM_PROMPT = `
You are a knowledgeable research assistant with access to a library of
investment books. Your job is to answer questions accurately using ONLY
the provided context.

CITATION RULES:
1. Every claim must be cited with format: (Book Title, p. XX)
2. NEVER fabricate page numbers - only use pages from the context
3. Quote directly when the original wording is important
4. If the context doesn't contain the answer, respond:
   "I don't have information about this in my knowledge base."

RESPONSE FORMAT:
- Use clear, professional language
- Structure complex answers with bullet points
- Lead with the most relevant information
- Keep responses concise but complete
`;
```

**Example Output**:
```
Graham defines margin of safety as "the difference between the
intrinsic value of a stock and its market price" (The Intelligent
Investor, p. 512). He emphasizes that this margin protects investors
from errors in calculation and unforeseen events (The Intelligent
Investor, p. 518).
```

### 6. API Endpoints

**Chat Endpoint** (`app/api/chat/route.ts`):
```typescript
// POST /api/chat
// Request: { question: string, model: "gemini" | "openai" }
// Response: Streamed markdown text with citations

export async function POST(request: Request) {
  const { question, model } = await request.json();

  // Stream response for better UX
  const stream = await queryRAG(question, model);

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' }
  });
}
```

**Status Endpoint** (`app/api/status/route.ts`):
```typescript
// GET /api/status
// Response: { documents_indexed: number, total_chunks: number }

export async function GET() {
  const stats = await vectordb.getStats();

  return Response.json({
    documents_indexed: stats.uniqueDocuments,
    total_chunks: stats.totalVectors
  });
}
```

## Configuration

### Environment Variables

```bash
# .env.local (required, git-ignored)

# OpenAI - Required for embeddings + o4-mini
OPENAI_API_KEY=sk-...

# Google - Required for Gemini 3 Flash
GOOGLE_API_KEY=AIza...
```

### Tunable Parameters

| Parameter | Default | Location | Purpose |
|-----------|---------|----------|---------|
| Chunk size | 768 tokens | `lib/rag/ingest.ts` | Balance context vs precision |
| Chunk overlap | 100 tokens | `lib/rag/ingest.ts` | Prevent split ideas |
| Top-K results | 5 | `lib/rag/query.ts` | Number of chunks retrieved |
| Embedding model | `text-embedding-3-small` | `lib/rag/embeddings.ts` | Quality vs cost |

## Data Flow Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    COMPLETE DATA FLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────── INGESTION (One-time) ─────────────┐  │
│  │                                                       │  │
│  │  PDF → Extract → Chunk → Embed → Store in LanceDB    │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────── QUERY (Per-request) ──────────────┐  │
│  │                                                       │  │
│  │  User Question                                        │  │
│  │       ↓                                               │  │
│  │  Embed Question (text-embedding-3-small)              │  │
│  │       ↓                                               │  │
│  │  Vector Search in LanceDB (top-5 chunks)              │  │
│  │       ↓                                               │  │
│  │  Build Context with Citations                         │  │
│  │       ↓                                               │  │
│  │  Send to LLM (Gemini or OpenAI)                       │  │
│  │       ↓                                               │  │
│  │  Stream Response to UI                                │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Cost Estimates

| Operation | Model | Cost |
|-----------|-------|------|
| Embed 1 book (~100K tokens) | text-embedding-3-small | ~$0.002 |
| 1 query (question + context) | Gemini 3 Flash | ~$0.002 |
| 1 query (question + context) | o4-mini | ~$0.001 |
| Phase 1 total (~100 queries) | Mixed | < $1 |

## Success Metrics

| Metric | Target | How to Verify |
|--------|--------|---------------|
| Ingestion works | ✓ | Single PDF indexed successfully |
| Retrieval quality | ✓ | Top-5 chunks are relevant |
| Citation accuracy | 90%+ | Page numbers match source |
| Model switching | ✓ | Both Gemini and o4-mini work |
| Response streaming | ✓ | Tokens appear incrementally |

---

## Quick Reference

### Start Development
```bash
npm install           # Install dependencies
npm run dev          # Start Next.js dev server
```

### Ingest Documents
```bash
npx ts-node scripts/ingest.ts --file "The Intelligent Investor.pdf"
```

### Test Queries
1. "What is the margin of safety?" → Should cite specific pages
2. "Tell me about cryptocurrency" → Should say "no information"

---

## Further Reading

- [LlamaIndex Documentation](https://ts.llamaindex.ai/)
- [LanceDB Documentation](https://lancedb.github.io/lancedb/)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [RAG Paper (Lewis et al., 2020)](https://arxiv.org/abs/2005.11401)

---

*Last updated: Part of KnowRAG Phase 1 implementation*
