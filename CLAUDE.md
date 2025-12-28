# KnowRAG - Project Context for Claude

## What This Project Is

KnowRAG is a local RAG (Retrieval Augmented Generation) application for querying a personal PDF knowledge base (investment/finance books). It extracts text from PDFs, stores embeddings in a vector database, and uses LLMs to answer questions with citations.

**Current Phase:** Phase 1 - Validation with single PDF (The Intelligent Investor)

## Key Files

| File | Purpose |
|------|---------|
| `docs/PRD-v2.md` | Product requirements - full spec |
| `tasks/tasks-knowrag-phase1.md` | Implementation task list with checkboxes |
| `journal.md` | Session history and decisions |

**Always read these files at the start of a session for context.**

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (dark mode)
- **Vector DB:** LanceDB (embedded, local)
- **RAG Engine:** LlamaIndexTS
- **Embeddings:** OpenAI text-embedding-3-small
- **LLMs:** Gemini 3 Flash (thinking: high), OpenAI o4-mini

## Project Structure

```
knowrag/
├── app/                    # Next.js App Router
│   ├── api/chat/          # POST /api/chat
│   └── api/status/        # GET /api/status
├── components/            # React UI components
├── lib/
│   ├── rag/               # Ingest, embeddings, vectordb, query
│   ├── llm/               # Gemini, OpenAI integrations
│   └── prompts/           # System prompts
├── scripts/               # CLI ingestion script
├── knowledge/             # PDF files (source documents)
├── data/lancedb/          # Vector database (git-ignored)
├── docs/                  # PRD, documentation
├── tasks/                 # Task lists
└── journal.md             # Session history
```

## Commands Available

| Command | Purpose |
|---------|---------|
| `/dev [task]` | Senior developer agent - implements features, writes code |
| `/journal` | Creates session retrospective entry in journal.md |

## Conventions

1. **Citations:** Always format as `(Book Title, p. XX)`
2. **Task tracking:** Check off tasks in `tasks/tasks-knowrag-phase1.md` as completed
3. **Environment:** API keys in `.env.local` (OPENAI_API_KEY, GOOGLE_API_KEY)
4. **Dark mode:** Default UI theme
5. **Streaming:** LLM responses must stream to UI

## Current Status

Check `tasks/tasks-knowrag-phase1.md` for current progress. Look for:
- `[x]` = completed
- `[/]` = in progress
- `[ ]` = not started

## Session Workflow

1. **Start:** Read `journal.md` for last session context
2. **Work:** Use `/dev` to implement tasks, update checkboxes
3. **End:** Run `/journal` to capture session summary
