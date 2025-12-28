# Implementation Plan - KnowRAG (Node.js/React Edition)

## Goal
Build a local RAG (Retrieval Augmented Generation) application using existing PDF knowledge base. The app will feature a "slick" React-based web interface, run locally (Node.js), and utilize cloud LLMs (OpenAI/Gemini) for high-quality responses with citations.

## User Review Required
> [!IMPORTANT]
> **API Keys**: To use GPT-4 or Gemini Pro, you will need valid API keys for OpenAI (`OPENAI_API_KEY`) and Google (`GOOGLE_API_KEY`).
> **Node.js Environment**: Ensure you have Node.js (v18+) installed.

## Proposed Architecture

### 1. Technology Stack
- **Framework**: [Next.js](https://nextjs.org/) (App Router).
- **Language**: TypeScript.
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [Motion](https://motion.dev/) (formerly Framer Motion).
    - *Why?* The gold standard for slick React animations (requested by user).
- **Vector Database**: [LanceDB](https://lancedb.com/).
    - *Why?* High-performance, embedded vector search that runs locally in Node.js.
- **RAG Engine**: [LlamaIndexTS](https://ts.llamaindex.ai/).

### 2. Workflow
1.  **Ingestion**: A script scans the `/knowledge` folder, parses PDFs, and creates embeddings.
2.  **Storage**: Vectors are stored in the local LanceDB instance (inside the `/data` folder).
3.  **Query**:
    - User selects a model from the **Dropdown**:
        - `GPT-5.2 (Thinking)` (Targeting `gpt-5.2` / `o3` class models)
        - `Gemini 3 Pro` (Targeting `gemini-3.0-pro-001`)
        - `Gemini 3 Flash` (Targeting `gemini-3.0-flash-001`)
    - User asks a question.
4.  **Retrieval**: Backend queries LanceDB for the top semantically similar chunks.
5.  **Generation**: The selected Cloud LLM processes the chunks and generates an answer with citations.

### 3. Frontend Features (The "Vibe")
- **Control Center**:
    - **Model Selector**: Dropdown to toggle between OpenAI and Google models.
    - **Knowledge Status**: Indicator showing how many docs are indexed.
- **Chat Interface**:
    - Slick, dark-mode chat bubbles with `Motion` enter/exit animations.
    - **Citation Drawer**: Clickable sources that expand to show the PDF context.
    - Markdown rendering for rich text responses.

## Proposed Changes

### Structure
We will initialize a standard Next.js project structure in the root directory:
```text
/
  /app           # React Pages (Frontend)
  /app/api       # API Routes (Backend)
  /components    # UI Components
  /lib           # RAG Logic (LlamaIndex + LanceDB)
  /scripts       # Ingestion scripts
  /knowledge     # (Existing) Your PDFs
  /data/lancedb  # (New) Vector Database Files
```

### Steps
1.  Initialize Next.js project.
2.  Install dependencies: `lancedb`, `llamaindex`, `openai`, `@google/generative-ai`, `motion`.
3.  Implement `scripts/ingest.ts` to process PDFs into LanceDB.
4.  Create API route `/api/chat` to handle user queries.
5.  Build React Chat Component with model selector and streaming support.
