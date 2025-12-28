Begin a new session by loading project context for the KnowRAG project.

## Instructions

1. Read `docs/PRD-v2.md` for product requirements
2. Read `tasks/tasks-knowrag-phase1.md` for the master task list (source of truth)
3. Read `journal.md` for session history (focus on last 2-3 entries)
4. Summarize current state:
   - How many tasks are complete vs remaining
   - What was accomplished in the last session
   - Any open blockers or issues
5. State: "Ready to proceed with the next task"
6. Identify and display the next incomplete task

## Project Overview

KnowRAG is a local RAG application that queries a PDF knowledge base (investment books) using LLMs with citations.

**Pipeline:** Ingest PDFs → Chunk & Embed → Store in LanceDB → Query → Retrieve → LLM Response with Citations

## Key Files

- `docs/PRD-v2.md` - Product requirements document
- `tasks/tasks-knowrag-phase1.md` - Master task list for Phase 1 implementation
- `journal.md` - Session history for continuity

## Response Format

After reading the files, respond with:

```
## Session Initialized

**Last Session:** [Date] - [Brief summary]

**Progress:** X/Y tasks complete

**Current Status:**
- [What's done]
- [What's in progress]

**Next Task:** [Task number and description]

Ready to proceed. What would you like to focus on?
```
