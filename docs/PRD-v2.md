# Product Requirements Document: KnowRAG v2

## Introduction/Overview

KnowRAG is a local RAG (Retrieval Augmented Generation) application that enables users to query their personal PDF knowledge base using AI. The system extracts information from PDF documents, stores them in a vector database, and uses LLMs to answer questions with accurate citations.

**Problem Statement:** General-purpose LLMs don't have access to your personal documents. When you ask about specific content from your books (e.g., "What does Benjamin Graham say about margin of safety?"), they provide generic answers rather than citing your actual sources.

**Solution:** Build a local RAG pipeline that:
1. Extracts and chunks PDF content
2. Creates semantic embeddings for search
3. Retrieves relevant passages when you ask questions
4. Sends context to an LLM that answers with book + page citations

This is a learning project to understand RAG, vector databases, and LLM integration.

---

## Goals

### Phase 1 Goals (Validation)
1. Successfully ingest and index one PDF (The Intelligent Investor by Benjamin Graham)
2. Implement semantic search that retrieves relevant passages
3. Generate answers with accurate citations (book title + page number)
4. Provide a simple web interface with chat, model selection, and indexing status
5. Support two reasoning models: Gemini 3 Flash (Thinking) and OpenAI o4-mini

### Phase 2 Goals (Expansion)
1. Ingest all 16 PDFs in the knowledge base (~150MB)
2. Add additional models (GPT-5.2, o3, Gemini 3 Pro)
3. Enhanced UI with animations and better UX
4. OCR support for scanned PDF pages
5. Advanced citation features (direct quotes, highlights)

---

## User Stories

### Phase 1

1. **As a user**, I want to ask questions about The Intelligent Investor and receive answers based on the actual book content, so I can trust the information is accurate.

2. **As a user**, I want to see citations with book name and page numbers, so I can verify the source and read more context.

3. **As a user**, I want to choose between different AI models (Gemini 3 Flash Thinking, o4-mini), so I can compare response quality and speed.

4. **As a user**, I want to see the indexing status (how many documents/chunks are indexed), so I know the system is ready to answer questions.

5. **As a user**, I want to run this locally with `npm run dev`, so I don't need complex deployment setup.

---

## Functional Requirements

### FR1: PDF Ingestion Pipeline

| ID | Requirement |
|----|-------------|
| FR1.1 | System must scan the `/knowledge` folder for PDF files |
| FR1.2 | System must extract text content from PDFs, preserving page numbers |
| FR1.3 | System must chunk documents into smaller segments (target: 512-1024 tokens per chunk) |
| FR1.4 | System must preserve metadata: source file name, page number, chunk index |
| FR1.5 | System must handle PDFs with mixed text/image content gracefully |

### FR2: Vector Database

| ID | Requirement |
|----|-------------|
| FR2.1 | System must use LanceDB as the embedded vector database |
| FR2.2 | System must store vectors locally in `/data/lancedb` folder |
| FR2.3 | System must use OpenAI embeddings (text-embedding-3-small) for vectorization |
| FR2.4 | System must support similarity search returning top-k relevant chunks |
| FR2.5 | System must persist vectors between application restarts |

### FR3: Query & Retrieval

| ID | Requirement |
|----|-------------|
| FR3.1 | System must accept natural language questions from users |
| FR3.2 | System must embed the query using the same embedding model |
| FR3.3 | System must retrieve top 5 most relevant chunks from the vector database |
| FR3.4 | System must pass retrieved chunks as context to the selected LLM |

### FR4: LLM Integration

| ID | Requirement |
|----|-------------|
| FR4.1 | System must support Gemini 3 Flash with thinking mode (thinking_level: high) |
| FR4.2 | System must support OpenAI o4-mini reasoning model |
| FR4.3 | System must stream responses to the UI for better UX |
| FR4.4 | System must instruct the LLM to cite sources with book title + page number |
| FR4.5 | System must handle API errors gracefully with user-friendly messages |

### FR5: Web Interface

| ID | Requirement |
|----|-------------|
| FR5.1 | System must provide a chat input for user questions |
| FR5.2 | System must display AI responses with markdown rendering |
| FR5.3 | System must show citations inline with format: (Book Title, p. XX) |
| FR5.4 | System must provide a dropdown to select between available models |
| FR5.5 | System must display document status: number of documents indexed, total chunks |
| FR5.6 | System must indicate loading state while generating responses |
| FR5.7 | System must work in dark mode (default) |

### FR6: Configuration

| ID | Requirement |
|----|-------------|
| FR6.1 | System must read API keys from environment variables (OPENAI_API_KEY, GOOGLE_API_KEY) |
| FR6.2 | System must provide a `.env.example` file documenting required variables |
| FR6.3 | System must fail gracefully with clear error if API keys are missing |

---

## Non-Goals (Out of Scope for Phase 1)

1. **No CLI interface** - Web UI only
2. **No user authentication** - Single user, local access
3. **No PDF upload through UI** - PDFs are placed in `/knowledge` folder manually
4. **No real-time re-indexing** - Ingestion is a manual script run
5. **No conversation memory** - Each question is independent (no chat history context)
6. **No OCR for scanned pages** - Deferred to Phase 2
7. **No fancy animations** - Simple, functional UI for Phase 1
8. **No mobile optimization** - Desktop browser only
9. **No deployment/hosting** - Local development only

---

## Design Considerations

### UI Layout (Simple)

```
+----------------------------------------------------------+
|  KnowRAG                          [Model: Gemini 3 Flash v] |
+----------------------------------------------------------+
|  Status: 1 document indexed | 245 chunks                  |
+----------------------------------------------------------+
|                                                          |
|  [User Question Bubble]                                  |
|  What does Benjamin Graham say about margin of safety?   |
|                                                          |
|  [AI Response Bubble]                                    |
|  Benjamin Graham defines margin of safety as...          |
|  (The Intelligent Investor, p. 512)                      |
|                                                          |
|  He further explains that...                             |
|  (The Intelligent Investor, p. 518)                      |
|                                                          |
+----------------------------------------------------------+
|  [Type your question here...]                    [Send]  |
+----------------------------------------------------------+
```

### Color Scheme
- Dark mode by default
- Neutral grays for background
- Accent color for interactive elements
- Clear distinction between user and AI messages

---

## Technical Considerations

### Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Framework | Next.js 14+ (App Router) | Full-stack React, API routes, good DX |
| Language | TypeScript | Type safety, better tooling |
| Styling | Tailwind CSS | Rapid UI development, dark mode support |
| Vector DB | LanceDB | Embedded, no external server, Node.js native |
| RAG Engine | LlamaIndexTS | Mature RAG library for TypeScript |
| Embeddings | OpenAI text-embedding-3-small | High quality, cost-effective ($0.02/1M tokens) |
| LLM: Google | Gemini 3 Flash (thinking_level: high) | $0.50/$3.00 per 1M tokens |
| LLM: OpenAI | o4-mini | $0.15/$0.60 per 1M tokens |

### Project Structure

```
knowrag/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Main chat interface
│   ├── layout.tsx         # Root layout with dark mode
│   └── api/
│       ├── chat/
│       │   └── route.ts   # POST /api/chat - Query endpoint
│       └── status/
│           └── route.ts   # GET /api/status - Index status
├── components/
│   ├── ChatInput.tsx      # Message input component
│   ├── ChatMessage.tsx    # Message bubble component
│   ├── ModelSelector.tsx  # Dropdown for model selection
│   └── StatusIndicator.tsx # Document index status
├── lib/
│   ├── rag/
│   │   ├── ingest.ts      # PDF processing logic
│   │   ├── embeddings.ts  # OpenAI embedding wrapper
│   │   ├── vectordb.ts    # LanceDB operations
│   │   └── query.ts       # RAG query pipeline
│   ├── llm/
│   │   ├── gemini.ts      # Gemini 3 Flash integration
│   │   └── openai.ts      # o4-mini integration
│   └── prompts/
│       └── rag-prompt.ts  # System prompts for citation format
├── scripts/
│   └── ingest.ts          # CLI script: npx ts-node scripts/ingest.ts
├── knowledge/              # Your PDF files (already exists)
├── data/
│   └── lancedb/           # Vector database storage
├── .env.local             # API keys (git-ignored)
├── .env.example           # Template for required env vars
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

### API Keys Required

```bash
# .env.example
OPENAI_API_KEY=sk-...        # Required for embeddings + o4-mini
GOOGLE_API_KEY=AIza...       # Required for Gemini 3 Flash
```

### Ingestion Script Usage

```bash
# Index a specific PDF (Phase 1)
npx ts-node scripts/ingest.ts --file "The Intelligent Investor - BENJAMIN GRAHAM.pdf"

# Index all PDFs (Phase 2)
npx ts-node scripts/ingest.ts --all
```

### RAG Prompt Strategy

The system prompt must instruct the LLM to:
1. Only answer based on provided context
2. Cite every claim with (Book Title, p. XX)
3. Say "I don't have information about this" if context doesn't contain the answer
4. Never make up page numbers

---

## Success Metrics

### Phase 1 Complete When:

| Metric | Target |
|--------|--------|
| PDF Ingestion | The Intelligent Investor successfully chunked and embedded |
| Vector Search | Queries return relevant chunks (manual verification) |
| Citation Accuracy | 90%+ of citations have correct page numbers |
| Model Switching | Both Gemini 3 Flash and o4-mini work via dropdown |
| UI Functional | Can ask questions and receive streamed responses |
| Local Dev | `npm run dev` starts the app on localhost |

### Validation Test Questions

1. "What is the margin of safety?" - Should cite specific pages
2. "What does Graham say about Mr. Market?" - Should cite the allegory section
3. "What is the difference between investment and speculation?" - Should cite Chapter 1
4. "Tell me about cryptocurrency" - Should respond that it has no information

---

## Open Questions

1. **Chunk Size Optimization:** What's the optimal chunk size for investment book content? Start with 512 tokens and adjust based on retrieval quality.

2. **Overlap Strategy:** Should chunks overlap? (e.g., 50-token overlap) This may improve retrieval for questions spanning chunk boundaries.

3. **Re-ranking:** Should we add a re-ranking step after initial retrieval? May improve relevance but adds latency/cost.

4. **Hybrid Search:** Should we combine semantic search with keyword search for better results? Defer to Phase 2.

5. **PDF Parsing Quality:** The Intelligent Investor PDF - is it text-based or scanned? Need to verify extraction quality before full implementation.

---

## Appendix: Model Pricing Reference

| Model | Input | Output | Notes |
|-------|-------|--------|-------|
| OpenAI text-embedding-3-small | $0.02/1M | - | Embeddings |
| Gemini 3 Flash (thinking: high) | $0.50/1M | $3.00/1M | Thinking tokens free |
| OpenAI o4-mini | $0.15/1M | $0.60/1M | Reasoning model |

**Estimated Phase 1 Costs:**
- Embedding The Intelligent Investor (~200 pages): ~$0.01
- 100 test queries: ~$0.25
- Total Phase 1 experimentation: < $5

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| v1 | 2024-12-22 | Initial draft with GPT-5.2/Gemini 3 Pro |
| v2 | 2024-12-28 | Revised after discussion: o4-mini + Gemini 3 Flash Thinking, phased approach, validated pricing |
