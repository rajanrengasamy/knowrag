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

- [x] **1.0 Project Setup & Configuration**
  - [x] 1.1 Initialize Next.js project with TypeScript and App Router (`npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"`)
  - [x] 1.2 Install RAG dependencies (`npm install llamaindex @lancedb/lancedb openai`)
  - [x] 1.3 Install Google AI SDK (`npm install @google/generative-ai`)
  - [x] 1.4 Install PDF parsing dependencies (`npm install pdf-parse`)
  - [x] 1.5 Create `.env.example` with required API keys template
  - [x] 1.6 Create `.env.local` with actual API keys (OPENAI_API_KEY, GOOGLE_API_KEY)
  - [x] 1.7 Create folder structure: `lib/rag/`, `lib/llm/`, `lib/prompts/`, `scripts/`, `data/lancedb/`
  - [x] 1.8 Add `/data/lancedb/` and `.env.local` to `.gitignore`
  - [x] 1.9 Verify `npm run dev` starts successfully on localhost:3000

- [x] **2.0 PDF Ingestion Pipeline**
  - [x] 2.1 Create `lib/rag/ingest.ts` with PDF loading function
  - [x] 2.2 Implement text extraction using pdf-parse with page number tracking
  - [x] 2.3 Implement chunking strategy (target 512 tokens, 50 token overlap)
  - [x] 2.4 Create chunk metadata structure: `{ source: string, page: number, chunkIndex: number, text: string }`
  - [x] 2.5 Create `scripts/ingest.ts` CLI with `--file` flag for single PDF
  - [x] 2.6 Add console logging for ingestion progress (pages processed, chunks created)
  - [x] 2.7 Test extraction on "The Intelligent Investor - BENJAMIN GRAHAM.pdf"
  - [x] 2.8 Verify page numbers are correctly preserved in chunk metadata

- [x] **3.0 Vector Database Integration (LanceDB + OpenAI Embeddings)**
  - [x] 3.1 Create `lib/rag/embeddings.ts` with OpenAI text-embedding-3-small wrapper
  - [x] 3.2 Create `lib/rag/vectordb.ts` with LanceDB initialization
  - [x] 3.3 Implement `createTable()` function with schema: id, text, embedding, source, page, chunkIndex
  - [x] 3.4 Implement `upsertChunks()` function to embed and store chunks
  - [x] 3.5 Implement `getStats()` function returning document count and chunk count
  - [x] 3.6 Update `scripts/ingest.ts` to call embedding and storage functions
  - [x] 3.7 Verify vectors persist in `/data/lancedb/` between restarts
  - [x] 3.8 Test full ingestion pipeline: PDF → chunks → embeddings → LanceDB

- [x] **4.0 RAG Query Pipeline**
  - [x] 4.1 Create `lib/rag/query.ts` with main query function
  - [x] 4.2 Implement query embedding using same OpenAI model
  - [x] 4.3 Implement `searchSimilar()` in vectordb.ts returning top-k chunks (k=5)
  - [x] 4.4 Format retrieved chunks with source and page metadata
  - [x] 4.5 Create context string for LLM: combine chunks with citation markers
  - [x] 4.6 Test retrieval with sample query: "What is margin of safety?"
  - [x] 4.7 Verify returned chunks are semantically relevant

- [x] **5.0 LLM Integration (Gemini 3 Flash + o4-mini)**
  - [x] 5.1 Create `lib/prompts/rag-prompt.ts` with system prompt template
  - [x] 5.2 System prompt must instruct: cite with "(Book Title, p. XX)", only use provided context, say "I don't have information" if not found
  - [x] 5.3 Create `lib/llm/gemini.ts` with Gemini 3 Flash integration
  - [x] 5.4 Configure Gemini with `thinking_level: "high"` for reasoning
  - [x] 5.5 Create `lib/llm/openai.ts` with o4-mini integration
  - [x] 5.6 Implement streaming response generator for both providers
  - [x] 5.7 Create unified interface: `generateResponse(model: string, context: string, query: string)`
  - [x] 5.8 Add error handling for API failures with user-friendly messages
  - [x] 5.9 Test both models with hardcoded context to verify citation format

- [x] **6.0 API Routes (Chat + Status)**
  - [x] 6.1 Create `app/api/chat/route.ts` with POST handler
  - [x] 6.2 Parse request body: `{ query: string, model: "gemini" | "openai" }`
  - [x] 6.3 Validate required fields, return 400 if missing
  - [x] 6.4 Integrate RAG pipeline: embed query → search → generate response
  - [x] 6.5 Return streaming response using Next.js streaming API
  - [x] 6.6 Create `app/api/status/route.ts` with GET handler
  - [x] 6.7 Return JSON: `{ documents: number, chunks: number, ready: boolean }`
  - [x] 6.8 Add try/catch with 500 error responses
  - [x] 6.9 Test endpoints with curl or Postman

- [x] **7.0 Web Interface (Chat UI + Model Selector + Status)**
  - [x] 7.1 Update `app/layout.tsx` with dark mode class on html element
  - [x] 7.2 Configure Tailwind for dark mode (`darkMode: 'class'`)
  - [x] 7.3 Create `components/ModelSelector.tsx` - dropdown with Gemini 3 Flash, o4-mini options
  - [x] 7.4 Create `components/StatusIndicator.tsx` - displays "X documents | Y chunks" from /api/status
  - [x] 7.5 Create `components/ChatInput.tsx` - text input with send button
  - [x] 7.6 Create `components/ChatMessage.tsx` - message bubble (user vs assistant styling)
  - [x] 7.7 Update `app/page.tsx` - compose all components into chat interface
  - [x] 7.8 Implement state management: messages array, selected model, loading state
  - [x] 7.9 Implement streaming response display (append chunks as they arrive)
  - [x] 7.10 Add loading spinner/indicator while waiting for response
  - [x] 7.11 Style according to PRD mockup: header with logo + model selector, status bar, chat area, input

- [x] **8.0 Testing & Validation**
  - [x] 8.1 Run full ingestion on "The Intelligent Investor - BENJAMIN GRAHAM.pdf"
  - [x] 8.2 Verify status endpoint shows correct document and chunk count
  - [x] 8.3 Test query: "What is the margin of safety?" - verify relevant citations
  - [x] 8.4 Test query: "What does Graham say about Mr. Market?" - verify allegory section cited
  - [x] 8.5 Test query: "What is the difference between investment and speculation?" - verify Chapter 1 cited
  - [x] 8.6 Test query: "Tell me about cryptocurrency" - should respond "I don't have information"
  - [x] 8.7 Verify citation page numbers match actual PDF pages (spot check 3-5 citations)
  - [x] 8.8 Test model switching: ask same question with Gemini, then o4-mini
  - [x] 8.9 Verify streaming works for both models
  - [x] 8.10 Document any issues or improvements needed for Phase 2 in journal.md

---

## Phase 1 Complete Checklist

Before marking Phase 1 complete, verify:

- [x] `npm run dev` starts without errors
- [x] `npm run build` compiles without TypeScript errors
- [x] The Intelligent Investor is fully indexed
- [x] Both models (Gemini 3 Flash, o4-mini) return responses with citations
- [x] UI displays status, allows model selection, shows streamed responses
- [x] At least 3 of 4 validation queries return accurate, cited answers

---

# Phase 3: Modern UI with Motion Animations

## Overview

Phase 3 focuses on transforming KnowRAG into a **premium, delightful user experience** using **Motion** (formerly Framer Motion) for React animations. The goal is to make the interface feel responsive, alive, and modern with smooth spring-physics animations, micro-interactions, and polished visual design.

**Key References:**
- PRD-v2.md (Phase 3 section) - Detailed requirements and specifications
- Motion library already installed (`motion: ^12.23.26`)
- Current Tailwind CSS 4 setup

---

## Phase 3 Tasks

- [x] **9.0 Motion Animation Foundation**
  - [x] 9.1 Create `lib/motion/` directory for shared animation utilities
  - [x] 9.2 Create `lib/motion/presets.ts` with transition presets (spring, springGentle, springQuick, fade, fadeSlow)
  - [x] 9.3 Add animation variant exports (fadeInUp, fadeInSlide, scaleIn, staggerContainer)
  - [x] 9.4 Add hover/tap state exports (hoverLift, hoverScale, tapScale) with proper TypeScript types
  - [x] 9.5 Create `lib/motion/hooks.ts` with `useReducedMotion` hook for accessibility
  - [x] 9.6 Verify Motion imports work correctly (`import { motion, AnimatePresence } from "motion/react"`)
  - [x] 9.7 Test presets compile without TypeScript errors

- [x] **10.0 ChatMessage Animation Enhancement**
  - [x] 10.1 Import Motion and shared presets in `components/ChatMessage.tsx`
  - [x] 10.2 Convert message container `<div>` to `<motion.div>`
  - [x] 10.3 Add directional slide animation (user: slide from right, assistant: slide from left)
  - [x] 10.4 Add subtle scale animation on appear (scale: 0.95 → 1)
  - [x] 10.5 Add hover lift effect (translateY: -2px with shadow increase)
  - [x] 10.6 Add `layout` prop for smooth message reordering animations
  - [x] 10.7 Enhance streaming cursor with smooth opacity transition (not sudden blink)
  - [x] 10.8 Add subtle pulse animation to citation badges on first appearance
  - [x] 10.9 Update `TypingIndicator` with staggered bouncing dots using Motion
  - [x] 10.10 Test message animations with both user and assistant messages

- [x] **11.0 ModelSelector Animation Enhancement**
  - [x] 11.1 Import Motion and AnimatePresence in `components/ModelSelector.tsx`
  - [x] 11.2 Wrap dropdown with `<AnimatePresence>` for exit animations
  - [x] 11.3 Convert dropdown container to `<motion.div>` with scale + opacity animation
  - [x] 11.4 Set transform origin to top-right for natural dropdown appearance
  - [x] 11.5 Add staggered fade-in for dropdown options with delay per item
  - [x] 11.6 Add `whileHover` and `whileTap` states to option buttons
  - [x] 11.7 Animate chevron rotation smoothly when dropdown opens/closes
  - [x] 11.8 Add subtle scale feedback on trigger button tap
  - [x] 11.9 Test dropdown animation open/close behavior

- [x] **12.0 ChatInput Animation Enhancement**
  - [x] 12.1 Import Motion and shared presets in `components/ChatInput.tsx`
  - [x] 12.2 Add focus state tracking with useState
  - [x] 12.3 Convert input container to `<motion.div>` with animated box-shadow on focus
  - [x] 12.4 Convert send button to `<motion.button>` with scale animations
  - [x] 12.5 Add `whileHover` (scale: 1.05) and `whileTap` (scale: 0.95) to send button
  - [x] 12.6 Add animated focus ring transition (ring-offset smooth transition)
  - [x] 12.7 Add subtle entrance animation for keyboard hint text
  - [x] 12.8 Test input focus/unfocus animation and send button feedback

- [x] **13.0 StatusIndicator Animation Enhancement**
  - [x] 13.1 Import Motion in `components/StatusIndicator.tsx`
  - [x] 13.2 Create loading skeleton state with shimmer animation
  - [x] 13.3 Add `<AnimatePresence>` wrapper for status transitions
  - [x] 13.4 Add fade-in animation when status loads
  - [x] 13.5 Enhance "Ready" badge pulse animation using Motion
  - [x] 13.6 Add subtle scale animation to status dot on state change
  - [x] 13.7 Test skeleton → loaded state transition

- [x] **14.0 Page Layout Orchestration**
  - [x] 14.1 Import Motion in `app/page.tsx`
  - [x] 14.2 Create container animation variants with stagger config
  - [x] 14.3 Create item animation variants for header, status, main, footer
  - [x] 14.4 Convert main layout elements to motion components
  - [x] 14.5 Implement orchestrated entrance sequence (header → status → main → footer)
  - [x] 14.6 Add floating animation to empty state icon using Motion
  - [x] 14.7 Add staggered entrance for suggestion pills in empty state
  - [x] 14.8 Wrap message list with `<AnimatePresence>` for exit animations
  - [x] 14.9 Verify entrance animation completes within 600ms
  - [x] 14.10 Test page load feels cohesive and polished

- [ ] **15.0 Enhanced CSS & Visual Polish**
  - [x] 15.1 Add `.glass-premium` class with enhanced blur (20px) and saturation
  - [x] 15.2 Add `.shimmer` keyframe animation for loading skeletons
  - [x] 15.3 Add `.float` keyframe animation for subtle vertical oscillation
  - [x] 15.4 Add `.ambient-glow` class for premium shadow effects
  - [x] 15.5 Add animated gradient border utility (`.gradient-border`)
  - [x] 15.6 Enhance scrollbar with smooth color transition on hover
  - [x] 15.7 Update header to use `.glass-premium` class
  - [x] 15.8 Add refined shadows to message bubbles with accent color tinting
  - [x] 15.10 Verify all CSS utilities work correctly in dark mode

- [x] **16.0 Testing & Validation - Phase 3**
  - [x] 16.1 Verify `npm run dev` starts without errors after all changes
  - [x] 16.2 Verify `npm run build` compiles without TypeScript errors
  - [x] 16.3 Test page load animation sequence completes smoothly
  - [x] 16.4 Test user messages animate from right, assistant from left
  - [x] 16.5 Test model selector dropdown animates open/close correctly
  - [x] 16.6 Test send button has satisfying spring tap feedback
  - [x] 16.7 Test typing indicator has smooth wave animation across dots
  - [x] 16.8 Verify hover states feel responsive (< 100ms reaction time)
  - [x] 16.9 Test with `prefers-reduced-motion: reduce` enabled in system settings
  - [x] 16.10 Verify no animation jank or dropped frames during interactions
  - [x] 16.11 Confirm all animations use GPU-accelerated properties (transform, opacity)
  - [x] 16.12 Verify no layout shift (CLS) during animations
  - [x] 16.13 Document any issues or future improvements in journal.md

---

## Phase 3 Complete Checklist

Before marking Phase 3 complete, verify:

- [x] All 4 components use Motion for animations (ChatMessage, ModelSelector, ChatInput, StatusIndicator)
- [x] Page load has orchestrated entrance sequence
- [x] Shared motion presets are used consistently across components
- [x] All animations run at 60fps without jank
- [x] Reduced motion preference is respected
- [x] TypeScript compiles without errors
- [x] Interface feels "alive" and premium to use

