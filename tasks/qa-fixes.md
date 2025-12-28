# QA Fixes from Tasks 1-6 Review

**Created:** 2025-12-29  
**Source:** docs/Tasks1-6-QA-Report.md  
**Status:** In Progress

---

## 🟠 Major Issues (Should Fix)

### T5-1: Document thinkingConfig SDK Requirement
- [ ] **File:** `lib/llm/gemini.ts` (line 58)
- **Issue:** Uses `@ts-expect-error` for `thinkingConfig`
- **Fix:** Add JSDoc/comments explaining this is a new feature not yet in TS types, document SDK version requirements

### T5-2: Document reasoning_effort SDK Requirement
- [ ] **File:** `lib/llm/openai.ts` (line 77)
- **Issue:** `reasoning_effort` parameter may not be in TS types
- **Fix:** Add JSDoc/comments explaining SDK version dependency, ensure SDK version supports this

---

## 🟡 Minor Issues (Nice to Have)

### T1-1: Enhance .env.example Documentation
- [ ] **File:** `.env.example`
- **Issue:** Missing clear documentation about which model uses which key
- **Fix:** Add comments explaining OPENAI_API_KEY is for embeddings AND o4-mini model

### T2-1: Migrate require() to Dynamic Import
- [ ] **File:** `lib/rag/ingest.ts` (line 14)
- **Issue:** Uses `require()` for pdf-parse (ESM compatibility concern)
- **Fix:** Consider migrating to dynamic `import()` for better ESM compatibility

### T2-2: Async File Reading for Large PDFs
- [ ] **File:** `lib/rag/ingest.ts` (line 35)
- **Issue:** `fs.readFileSync` blocks event loop for large PDFs
- **Fix:** Change to `fs.promises.readFile` for non-blocking I/O

### T3-1: Add Proper Typing for LanceDB Records
- [ ] **File:** `lib/rag/vectordb.ts` (line 232-233)
- **Issue:** Uses `any` type for record mapping
- **Fix:** Add proper typing with LanceDB record type to eliminate `any` usage

### T3-2: Add Debug Logging for Delete Operations
- [ ] **File:** `lib/rag/vectordb.ts` (line 172-174)
- **Issue:** Silent catch when deleting non-existent source
- **Fix:** Add debug logging for transparency when delete fails

### T5-3: Use Gemini Native System Instruction Format
- [ ] **File:** `lib/llm/gemini.ts` (line 92)
- **Issue:** System prompt concatenated with user query
- **Fix:** Consider using Gemini's native system instruction format instead of concatenation

---

## Assignment

| Issue | Assigned Agent |
|-------|---------------|
| T5-1 + T5-2 | Agent 1 (LLM SDK Documentation) |
| T1-1 | Agent 2 (Env Documentation) |
| T2-1 + T2-2 | Agent 3 (PDF Ingest Improvements) |
| T3-1 + T3-2 | Agent 4 (VectorDB Typing & Logging) |
| T5-3 | Agent 5 (Gemini System Prompt) |

