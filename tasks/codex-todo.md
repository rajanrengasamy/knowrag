# Codex TODO

Scope: Align implementation with PRD v2/v3, add PDF attachments (no DB writes), enforce citation badges, and add GPT-4o for vision.

## Phase 0 - Decisions / Prep
- [x] Confirm OpenAI model defaults: use `o4-mini` for text-only, `gpt-4o` for vision; auto-switch to `gpt-4o` when images are attached.
- [x] Define upload constraints: max PDF size (default 200MB, env-configurable), max pages, max concurrent uploads, and storage location (`data/uploads/`).
- [x] Note: PDF attachments use OpenAI embeddings (no chat model switch needed for embedding).
- [x] Decide whether PDFs uploaded via UI should be persisted on disk or kept temporary only (default: persist in `data/uploads/`).

## Phase 1 - RAG Prompt + Citation Alignment
- [x] Update chat API to build a system prompt using `lib/prompts/rag-prompt.ts` and pass that prompt to LLMs.
- [x] Align citation format in model output and UI badges: keep `[n]` markers in output, render tooltips with source/page metadata.
- [x] Ensure prompt instructions explicitly request `[n]` markers that map to citation metadata.
- [x] Add fallback when no chunks are returned and surface a clear "no info" message.

## Phase 2 - Vision Model Routing (GPT-4o)
- [x] Add `gpt-4o` model to LLM layer and UI model selector.
- [x] In OpenAI LLM integration, use `gpt-4o` for image messages; enforce text-only for `o4-mini`.
- [x] Add server-side validation: reject images when a non-vision model is selected, or auto-switch to `gpt-4o` (per decision).

## Phase 3 - Image Limits + Validation
- [x] Enforce upload limits client + server: max 5MB per image, max count per message.
- [x] Reject unsupported MIME types and overly large base64 payloads with clear errors.
- [x] Update UI with inline validation errors for images.

## Phase 4 - PDF Attachments (No DB Writes)
- [x] Add API route to upload PDFs with size/type validation and save them to disk.
- [x] Attach PDFs per message and include them in chat requests.
- [x] Build temporary in-memory PDF index for similarity search (TTL cache).
- [x] Merge PDF + knowledge base results before prompting the LLM.
- [ ] Add optional re-index controls if future persistent ingestion is needed.

## Phase 5 - Docs + Ops Readiness
- [x] Update README to match `tsx` scripts, Next.js version, and remove unused stack claims (LlamaIndex).
- [x] Add `.env.example` updates for GPT-4o or model-specific keys if needed.
- [x] Add `LICENSE` file if repo is meant to be public.

## Phase 6 - Tests / Validation
- [x] Add quick sanity scripts: attach PDF -> query -> citations with badges.
- [x] Update any existing test scripts to use new prompt + vision behavior.
- [x] Add cleanup utility to purge uploads and temp cache on demand.
