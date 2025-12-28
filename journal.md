# KnowRAG Project Journal

This file maintains session history for continuity across coding sessions.

**Reference Documents:**
- PRD: `docs/PRD-v2.md`
- Tasks: `tasks/tasks-knowrag-phase1.md`

---

## Session: 2025-12-28 ~22:30 AEST

### Summary
Initial planning session for KnowRAG - a local RAG application to query investment book PDFs. Evolved PRD-v1 into PRD-v2 through discussion, established technology choices, and created the implementation task list.

### Work Completed
- Reviewed existing `/docs/PRD-v1.md` and identified outdated model references
- Researched current LLM pricing (OpenAI GPT-5.x, o-series, Gemini 3)
- Created `/docs/PRD-v2.md` with validated requirements
- Created `/tasks/tasks-knowrag-phase1.md` with 9 parent tasks
- Created `/docs/journal.md` (this journal command template)
- Git initialized, feature branch created (Task 0.0 complete)

### Issues & Resolutions
| Issue | Resolution | Status |
|:------|:-----------|:-------|
| PRD-v1 referenced non-existent models (GPT-5.2, Gemini 3 Pro) | Web searched for current models, updated to o4-mini + Gemini 3 Flash | Resolved |
| Unclear whether reasoning models are better for RAG | Discussed trade-offs; reasoning better for synthesis, not needed for simple Q&A | Resolved |

### Key Decisions
- **Models for Phase 1:** Gemini 3 Flash (thinking_level: high) + o4-mini - both cheap, good for experimentation
- **Embeddings:** OpenAI text-embedding-3-small ($0.02/1M tokens)
- **Vector DB:** LanceDB (embedded, local, no server needed)
- **Phase 1 validation PDF:** The Intelligent Investor (Benjamin Graham)
- **Citation format:** Book title + page number
- **UI scope:** Simple - chat + model selector + document status indicator
- **Phased approach:** Phase 1 validates with 1 PDF before scaling to all 16

### Learnings
- Gemini 3 Flash thinking tokens are NOT billed (only final output) - cheaper than OpenAI for reasoning
- o4-mini is 90% cheaper than o3 while still being a capable reasoning model
- RAG retrieval quality depends heavily on chunk size and embedding model choice

### Open Items / Blockers
- [ ] Generate sub-tasks for tasks-knowrag-phase1.md (waiting for "Go")
- [ ] Verify The Intelligent Investor PDF is text-extractable (not scanned images)
- [ ] Task 1.0 (Project Setup) in progress with Gemini

### Context for Next Session
PRD-v2 is complete and approved. Task list has parent tasks defined. User is currently working with Gemini on Task 1.0 (Project Setup). Next step with Claude: say "Go" to generate detailed sub-tasks, or continue journaling progress.

---
