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
| v3 | 2024-12-29 | Added Phase 3: Slick Modern UI with Tailwind CSS + Motion |

---

# PHASE 3: Slick Modern UI - Motion & Enhanced Styling

## Overview

Phase 3 transforms KnowRAG from a functional application into a **premium, delightful user experience**. Using **Motion** (formerly Framer Motion) - the gold standard for React animations - combined with refined Tailwind CSS styling, we'll create an interface that feels responsive, alive, and modern.

**Why Motion?**
- Industry-standard library for production-grade React animations
- Declarative API with powerful layout animations
- Spring physics for natural-feeling motion
- Built-in gesture support (hover, tap, drag)
- Optimized performance with automatic GPU acceleration

---

## Phase 3 Goals

1. **Seamless Page Load Experience** - Orchestrated entrance animations that guide user attention
2. **Fluid Message Animations** - Natural, physics-based chat message transitions
3. **Interactive Micro-interactions** - Delightful hover states, button feedback, and focus indicators
4. **Professional Loading States** - Skeleton loaders and shimmer effects during data fetching
5. **Polished Visual Design** - Refined color palette, enhanced glassmorphism, subtle gradients
6. **Accessibility Preserved** - All animations respect `prefers-reduced-motion`

---

## Design Philosophy

### Animation Principles

| Principle | Implementation |
|-----------|----------------|
| **Purpose** | Every animation must serve a purpose: guide attention, provide feedback, or indicate state change |
| **Subtlety** | Prefer 200-400ms durations; avoid jarring or slow animations |
| **Physics** | Use spring animations for natural feel (stiffness: 300, damping: 25) |
| **Consistency** | Reusable animation variants across all components |
| **Performance** | Animate only `transform` and `opacity` for 60fps |

### Motion Design Tokens

```typescript
// Shared animation presets for consistency
export const motionPresets = {
  // Standard spring for UI elements
  spring: { type: "spring", stiffness: 300, damping: 25 },
  
  // Gentle spring for larger elements
  gentleSpring: { type: "spring", stiffness: 200, damping: 30 },
  
  // Quick spring for micro-interactions
  quickSpring: { type: "spring", stiffness: 500, damping: 30 },
  
  // Standard fade duration
  fade: { duration: 0.2 },
  
  // Stagger delay for lists
  stagger: { staggerChildren: 0.05 },
};
```

---

## Functional Requirements - Phase 3

### FR7: Entrance Animations

| ID | Requirement |
|----|-------------|
| FR7.1 | Header must fade in and slide down on initial page load (translateY: -20px → 0) |
| FR7.2 | Status bar must animate in after header with staggered delay (100ms) |
| FR7.3 | Empty state (welcome message) must scale in from center with spring physics |
| FR7.4 | Chat input must slide up from bottom with fade |
| FR7.5 | All entrance animations must complete within 600ms of page load |
| FR7.6 | AnimatePresence must wrap dynamic content for exit animations |

### FR8: Message Animations

| ID | Requirement |
|----|-------------|
| FR8.1 | User messages must slide in from right (translateX: 30px → 0) with fade |
| FR8.2 | Assistant messages must slide in from left (translateX: -30px → 0) with fade |
| FR8.3 | Messages must have subtle scale animation on appear (scale: 0.95 → 1) |
| FR8.4 | Typing indicator dots must have staggered bounce animation with spring physics |
| FR8.5 | Message bubbles must have hover state with subtle lift effect (translateY: -2px, shadow increase) |
| FR8.6 | Citations within messages must have subtle pulse animation on first appearance |
| FR8.7 | Streaming cursor must have smooth blink animation (opacity transition, not sudden) |

### FR9: Interactive Elements

| ID | Requirement |
|----|-------------|
| FR9.1 | Send button must have scale animation on tap (0.95) with spring bounce-back |
| FR9.2 | Model selector dropdown must animate open/close with scale + opacity (origin: top-right) |
| FR9.3 | Model selector options must stagger fade-in when dropdown opens |
| FR9.4 | Suggestion pills (empty state) must have hover scale (1.02) and glow effect |
| FR9.5 | All focusable elements must have animated focus ring (ring-offset transition) |
| FR9.6 | Status indicator "Ready" badge must have subtle pulse animation |

### FR10: Loading & Skeleton States

| ID | Requirement |
|----|-------------|
| FR10.1 | Status indicator must show animated skeleton on initial load (shimmer effect) |
| FR10.2 | Typing indicator must have wave animation across dots (not simultaneous) |
| FR10.3 | "Thinking" state must show animated gradient background on assistant bubble |
| FR10.4 | Loading states must use consistent shimmer animation (45deg gradient sweep) |

### FR11: Enhanced Visual Design

| ID | Requirement |
|----|-------------|
| FR11.1 | Background must have subtle animated noise texture for depth |
| FR11.2 | Header glass effect must have increased blur (16px) with refined opacity |
| FR11.3 | Message bubbles must have refined shadows with color tinting (accent color for user) |
| FR11.4 | Scrollbar must have smooth color transition on hover |
| FR11.5 | Input focus state must have animated border gradient |
| FR11.6 | Empty state icon must have floating animation (subtle translateY oscillation) |

### FR12: Reduced Motion Support

| ID | Requirement |
|----|-------------|
| FR12.1 | All animations must respect `prefers-reduced-motion: reduce` media query |
| FR12.2 | Reduced motion mode must disable all transform animations |
| FR12.3 | Reduced motion mode must retain opacity transitions (fade only) |
| FR12.4 | Essential feedback (button press state) must still function in reduced motion |

---

## Component Specifications

### 1. Motion-Enhanced ChatMessage

```tsx
// Target animation behavior for ChatMessage.tsx
<motion.div
  initial={{ opacity: 0, x: isUser ? 30 : -30, scale: 0.95 }}
  animate={{ opacity: 1, x: 0, scale: 1 }}
  exit={{ opacity: 0, scale: 0.95 }}
  transition={{ type: "spring", stiffness: 300, damping: 25 }}
  whileHover={{ y: -2, transition: { duration: 0.2 } }}
  layout // Enable layout animations for smooth reordering
>
  {/* Message content */}
</motion.div>
```

### 2. Motion-Enhanced ModelSelector

```tsx
// Dropdown animation with AnimatePresence
<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      style={{ transformOrigin: "top right" }}
    >
      {models.map((model, i) => (
        <motion.button
          key={model.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          whileHover={{ backgroundColor: "var(--muted)" }}
          whileTap={{ scale: 0.98 }}
        >
          {/* Option content */}
        </motion.button>
      ))}
    </motion.div>
  )}
</AnimatePresence>
```

### 3. Motion-Enhanced ChatInput

```tsx
// Send button with tap feedback
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  transition={{ type: "spring", stiffness: 500, damping: 30 }}
>
  {/* Send icon */}
</motion.button>

// Input container with focus animation
<motion.div
  animate={{
    boxShadow: isFocused 
      ? "0 0 0 3px rgba(99, 102, 241, 0.3)"
      : "0 0 0 0px rgba(99, 102, 241, 0)"
  }}
  transition={{ duration: 0.2 }}
>
  {/* Input field */}
</motion.div>
```

### 4. Enhanced TypingIndicator

```tsx
// Staggered bouncing dots with spring physics
const dotVariants = {
  initial: { y: 0 },
  animate: { 
    y: [0, -8, 0],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

<motion.div className="flex gap-1">
  {[0, 1, 2].map((i) => (
    <motion.div
      key={i}
      variants={dotVariants}
      initial="initial"
      animate="animate"
      style={{ animationDelay: `${i * 0.15}s` }}
      className="w-2 h-2 rounded-full bg-accent"
    />
  ))}
</motion.div>
```

### 5. Page Layout Orchestration

```tsx
// Orchestrated entrance animations in page.tsx
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 25 }
  }
};

<motion.div variants={containerVariants} initial="hidden" animate="visible">
  <motion.header variants={itemVariants}>...</motion.header>
  <motion.div variants={itemVariants}>Status Bar</motion.div>
  <motion.main variants={itemVariants}>...</motion.main>
  <motion.footer variants={itemVariants}>...</motion.footer>
</motion.div>
```

---

## CSS Enhancements

### New Utility Classes

```css
/* globals.css additions for Phase 3 */

/* Enhanced glassmorphism */
.glass-premium {
  background: rgba(20, 20, 32, 0.6);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* Shimmer loading effect */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.shimmer {
  background: linear-gradient(
    90deg,
    var(--muted) 0%,
    var(--muted-foreground) 50%,
    var(--muted) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

/* Floating animation */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.float {
  animation: float 3s ease-in-out infinite;
}

/* Ambient glow for premium feel */
.ambient-glow {
  box-shadow: 
    0 0 40px rgba(99, 102, 241, 0.15),
    0 0 80px rgba(168, 85, 247, 0.1);
}

/* Animated gradient border */
@keyframes gradient-rotate {
  0% { --rotation: 0deg; }
  100% { --rotation: 360deg; }
}

.gradient-border {
  position: relative;
  background: var(--card);
}

.gradient-border::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  background: conic-gradient(
    from var(--rotation, 0deg),
    var(--accent),
    #a855f7,
    #ec4899,
    var(--accent)
  );
  z-index: -1;
  animation: gradient-rotate 3s linear infinite;
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  
  /* Keep opacity transitions for essential feedback */
  .motion-safe {
    transition: opacity 0.15s ease !important;
  }
}
```

---

## New Shared Utilities

### lib/motion/presets.ts

Create a shared file for Motion animation presets to ensure consistency:

```typescript
// lib/motion/presets.ts

import type { Transition, Variants } from "motion/react";

// Transition presets
export const transitions = {
  spring: { type: "spring", stiffness: 300, damping: 25 } as Transition,
  springGentle: { type: "spring", stiffness: 200, damping: 30 } as Transition,
  springQuick: { type: "spring", stiffness: 500, damping: 30 } as Transition,
  fade: { duration: 0.2 } as Transition,
  fadeSlow: { duration: 0.4 } as Transition,
} as const;

// Common animation variants
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: transitions.spring
  },
  exit: { opacity: 0, y: 10 }
};

export const fadeInSlide: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: transitions.spring
  },  
  exit: { opacity: 0, x: -10 }
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: transitions.spring
  },
  exit: { opacity: 0, scale: 0.95 }
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

// Hover states
export const hoverLift = {
  y: -2,
  transition: { duration: 0.2 }
};

export const hoverScale = {
  scale: 1.02,
  transition: transitions.springQuick
};

export const tapScale = {
  scale: 0.95,
  transition: transitions.springQuick
};
```

---

## Success Metrics - Phase 3

| Metric | Target |
|--------|--------|
| Animation Performance | All animations run at 60fps (no jank) |
| Motion Library Integration | All 4 components use Motion for animations |
| Entrance Orchestration | Page load feels cohesive and polished |
| Reduced Motion | All animations respect system preferences |
| User Delight | Interface feels "alive" and responsive to interaction |
| Code Quality | Shared presets used across all components |

---

## Testing Checklist - Phase 3

- [ ] Page load animation sequence completes smoothly
- [ ] Messages animate correctly (user from right, assistant from left)
- [ ] Model selector dropdown animates open/close
- [ ] Send button has satisfying tap feedback
- [ ] Typing indicator has smooth wave animation
- [ ] Hover states feel responsive (< 100ms reaction)
- [ ] Test with `prefers-reduced-motion: reduce` enabled
- [ ] No animation jank on low-end devices
- [ ] All animations use GPU acceleration (`transform`, `opacity`)
- [ ] No layout shift during animations
