# KnowRAG Phase 1 - Implementation Tasks

## Relevant Files

### Configuration
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.ts` - Tailwind CSS with dark mode
- `next.config.js` - Next.js configuration
- `.env.example` - Template for required API keys
- `.env.local` - Actual API keys (git-ignored)

### RAG Pipeline
- `lib/rag/ingest.ts` - PDF parsing and chunking logic
- `lib/rag/embeddings.ts` - OpenAI embedding wrapper
- `lib/rag/vectordb.ts` - LanceDB operations (store, search)
- `lib/rag/query.ts` - RAG query pipeline (embed → search → format)

### LLM Integration
- `lib/llm/gemini.ts` - Gemini 3 Flash (thinking: high) integration
- `lib/llm/openai.ts` - o4-mini integration
- `lib/prompts/rag-prompt.ts` - System prompts for citation format

### API Routes
- `app/api/chat/route.ts` - POST /api/chat - Query endpoint
- `app/api/status/route.ts` - GET /api/status - Index status

### UI Components
- `app/layout.tsx` - Root layout with dark mode
- `app/page.tsx` - Main chat interface
- `components/ChatInput.tsx` - Message input component
- `components/ChatMessage.tsx` - Message bubble component
- `components/ModelSelector.tsx` - Model dropdown component
- `components/StatusIndicator.tsx` - Document index status

### Scripts
- `scripts/ingest.ts` - CLI script for PDF ingestion

### Data
- `data/lancedb/` - Vector database storage (git-ignored)
- `knowledge/` - PDF files (already exists)

### Notes

- Unit tests should typically be placed alongside the code files they are testing
- Use `npm run build` to verify TypeScript compiles without errors
- Use `npm run dev` to start the development server

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:
- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

---

## Tasks

- [x] **0.0 Create feature branch**
  - [x] 0.1 Initialize git repository (`git init`)

- [ ] **1.0 Project Setup & Configuration**
  - [ ] 1.1 Initialize Next.js project with TypeScript and App Router (`npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"`)
  - [ ] 1.2 Install RAG dependencies (`npm install llamaindex @lancedb/lancedb openai`)
  - [ ] 1.3 Install Google AI SDK (`npm install @google/generative-ai`)
  - [ ] 1.4 Install PDF parsing dependencies (`npm install pdf-parse`)
  - [ ] 1.5 Create `.env.example` with required API keys template
  - [ ] 1.6 Create `.env.local` with actual API keys (OPENAI_API_KEY, GOOGLE_API_KEY)
  - [ ] 1.7 Create folder structure: `lib/rag/`, `lib/llm/`, `lib/prompts/`, `scripts/`, `data/lancedb/`
  - [ ] 1.8 Add `/data/lancedb/` and `.env.local` to `.gitignore`
  - [ ] 1.9 Verify `npm run dev` starts successfully on localhost:3000

- [ ] **2.0 PDF Ingestion Pipeline**
  - [ ] 2.1 Create `lib/rag/ingest.ts` with PDF loading function
  - [ ] 2.2 Implement text extraction using pdf-parse with page number tracking
  - [ ] 2.3 Implement chunking strategy (target 512 tokens, 50 token overlap)
  - [ ] 2.4 Create chunk metadata structure: `{ source: string, page: number, chunkIndex: number, text: string }`
  - [ ] 2.5 Create `scripts/ingest.ts` CLI with `--file` flag for single PDF
  - [ ] 2.6 Add console logging for ingestion progress (pages processed, chunks created)
  - [ ] 2.7 Test extraction on "The Intelligent Investor - BENJAMIN GRAHAM.pdf"
  - [ ] 2.8 Verify page numbers are correctly preserved in chunk metadata

- [ ] **3.0 Vector Database Integration (LanceDB + OpenAI Embeddings)**
  - [ ] 3.1 Create `lib/rag/embeddings.ts` with OpenAI text-embedding-3-small wrapper
  - [ ] 3.2 Create `lib/rag/vectordb.ts` with LanceDB initialization
  - [ ] 3.3 Implement `createTable()` function with schema: id, text, embedding, source, page, chunkIndex
  - [ ] 3.4 Implement `upsertChunks()` function to embed and store chunks
  - [ ] 3.5 Implement `getStats()` function returning document count and chunk count
  - [ ] 3.6 Update `scripts/ingest.ts` to call embedding and storage functions
  - [ ] 3.7 Verify vectors persist in `/data/lancedb/` between restarts
  - [ ] 3.8 Test full ingestion pipeline: PDF → chunks → embeddings → LanceDB

- [ ] **4.0 RAG Query Pipeline**
  - [ ] 4.1 Create `lib/rag/query.ts` with main query function
  - [ ] 4.2 Implement query embedding using same OpenAI model
  - [ ] 4.3 Implement `searchSimilar()` in vectordb.ts returning top-k chunks (k=5)
  - [ ] 4.4 Format retrieved chunks with source and page metadata
  - [ ] 4.5 Create context string for LLM: combine chunks with citation markers
  - [ ] 4.6 Test retrieval with sample query: "What is margin of safety?"
  - [ ] 4.7 Verify returned chunks are semantically relevant

- [ ] **5.0 LLM Integration (Gemini 3 Flash + o4-mini)**
  - [ ] 5.1 Create `lib/prompts/rag-prompt.ts` with system prompt template
  - [ ] 5.2 System prompt must instruct: cite with "(Book Title, p. XX)", only use provided context, say "I don't have information" if not found
  - [ ] 5.3 Create `lib/llm/gemini.ts` with Gemini 3 Flash integration
  - [ ] 5.4 Configure Gemini with `thinking_level: "high"` for reasoning
  - [ ] 5.5 Create `lib/llm/openai.ts` with o4-mini integration
  - [ ] 5.6 Implement streaming response generator for both providers
  - [ ] 5.7 Create unified interface: `generateResponse(model: string, context: string, query: string)`
  - [ ] 5.8 Add error handling for API failures with user-friendly messages
  - [ ] 5.9 Test both models with hardcoded context to verify citation format

- [ ] **6.0 API Routes (Chat + Status)**
  - [ ] 6.1 Create `app/api/chat/route.ts` with POST handler
  - [ ] 6.2 Parse request body: `{ query: string, model: "gemini" | "openai" }`
  - [ ] 6.3 Validate required fields, return 400 if missing
  - [ ] 6.4 Integrate RAG pipeline: embed query → search → generate response
  - [ ] 6.5 Return streaming response using Next.js streaming API
  - [ ] 6.6 Create `app/api/status/route.ts` with GET handler
  - [ ] 6.7 Return JSON: `{ documents: number, chunks: number, ready: boolean }`
  - [ ] 6.8 Add try/catch with 500 error responses
  - [ ] 6.9 Test endpoints with curl or Postman

- [ ] **7.0 Web Interface (Chat UI + Model Selector + Status)**
  - [ ] 7.1 Update `app/layout.tsx` with dark mode class on html element
  - [ ] 7.2 Configure Tailwind for dark mode (`darkMode: 'class'`)
  - [ ] 7.3 Create `components/ModelSelector.tsx` - dropdown with Gemini 3 Flash, o4-mini options
  - [ ] 7.4 Create `components/StatusIndicator.tsx` - displays "X documents | Y chunks" from /api/status
  - [ ] 7.5 Create `components/ChatInput.tsx` - text input with send button
  - [ ] 7.6 Create `components/ChatMessage.tsx` - message bubble (user vs assistant styling)
  - [ ] 7.7 Update `app/page.tsx` - compose all components into chat interface
  - [ ] 7.8 Implement state management: messages array, selected model, loading state
  - [ ] 7.9 Implement streaming response display (append chunks as they arrive)
  - [ ] 7.10 Add loading spinner/indicator while waiting for response
  - [ ] 7.11 Style according to PRD mockup: header with logo + model selector, status bar, chat area, input

- [ ] **8.0 Testing & Validation**
  - [ ] 8.1 Run full ingestion on "The Intelligent Investor - BENJAMIN GRAHAM.pdf"
  - [ ] 8.2 Verify status endpoint shows correct document and chunk count
  - [ ] 8.3 Test query: "What is the margin of safety?" - verify relevant citations
  - [ ] 8.4 Test query: "What does Graham say about Mr. Market?" - verify allegory section cited
  - [ ] 8.5 Test query: "What is the difference between investment and speculation?" - verify Chapter 1 cited
  - [ ] 8.6 Test query: "Tell me about cryptocurrency" - should respond "I don't have information"
  - [ ] 8.7 Verify citation page numbers match actual PDF pages (spot check 3-5 citations)
  - [ ] 8.8 Test model switching: ask same question with Gemini, then o4-mini
  - [ ] 8.9 Verify streaming works for both models
  - [ ] 8.10 Document any issues or improvements needed for Phase 2 in journal.md

---

## Phase 1 Complete Checklist

Before marking Phase 1 complete, verify:

- [ ] `npm run dev` starts without errors
- [ ] `npm run build` compiles without TypeScript errors
- [ ] The Intelligent Investor is fully indexed
- [ ] Both models (Gemini 3 Flash, o4-mini) return responses with citations
- [ ] UI displays status, allows model selection, shows streamed responses
- [ ] At least 3 of 4 validation queries return accurate, cited answers
