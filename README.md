# KnowRAG

**KnowRAG** is a local RAG (Retrieval Augmented Generation) application that enables users to query their personal PDF knowledge base using AI.

## Project Definition

- **Product Requirements**: [PRD v2](./docs/PRD-v2.md) - The authoritative source for requirements and goals.
- **Task Tracking**: [Phase 1 Tasks](./tasks/tasks-knowrag-phase1.md) - The execution roadmap.

## Quick Start

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Run Development Server**:
    ```bash
    npm run dev
    ```

## Architecture

- **Frontend**: Next.js 14+ (App Router), Tailwind CSS
- **Backend**: Next.js API Routes
- **RAG Engine**: LlamaIndexTS
- **Vector DB**: LanceDB (Local)
- **AI Models**: Gemini 3 Flash / OpenAI o4-mini

## Directory Structure

- `/app`: Application source code
- `/knowledge`: PDF documents for ingestion
- `/data`: Local vector database storage
- `/docs`: Project documentation
