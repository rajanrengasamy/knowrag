# Task: Increase Knowledge Base with New PDFs

## Overview

**Objective:** Ingest all new PDF documents from the `knowledge/` folder into the LanceDB vector database to expand the RAG knowledge base.

**Current State:**
- **Indexed Documents:** 1
- **Total Chunks:** 1,707
- **Document:** The Intelligent Investor - BENJAMIN GRAHAM.pdf

**Target State:**
- All 20 PDFs fully indexed and searchable
- Estimated 25,000-35,000+ chunks (based on document sizes)

---

## New PDFs to Ingest (19 documents)

| # | Filename | Category |
|---|----------|----------|
| 1 | Competitive advantage - creating and sustaining superior -- Michael E. Porter -- ( WeLib.org ) (1).pdf | Strategy |
| 2 | Competitive advantage - creating and sustaining superior -- Michael E. Porter -- ( WeLib.org ).pdf | Strategy |
| 3 | Competitive strategy - techniques for analyzing industries -- Michael E. Porter -- ( WeLib.org ).pdf | Strategy |
| 4 | Geopolitical alpha - an investment framework for predicting -- Marko Papic -- ( WeLib.org ).pdf | Investing |
| 5 | Guide to Economic Indicators- Making Sense of Economics - -- The Economist, -- ( WeLib.org ).pdf | Economics |
| 6 | Irrational Exuberance -- Robert J. Shiller -- ( WeLib.org ).pdf | Behavioral Economics |
| 7 | Mapping the Markets- A Guide to Stock Market Analysis -- Deborah Owen, Robin Griffiths -- ( WeLib.org ).pdf | Technical Analysis |
| 8 | Misbehaving - the making of behavioral economics -- Thaler, Richard H., 1945- -- ( WeLib.org ).pdf | Behavioral Economics |
| 9 | Principles- Life and Work -- Ray Dalio -- ( WeLib.org ).pdf | Investing/Philosophy |
| 10 | Prisoners_of_geography_ten_maps_that_exp.pdf | Geopolitics |
| 11 | The Investment Checklist - The Art of In-Depth Research -- Michael Shearn -- ( WeLib.org ).pdf | Investing |
| 12 | The education of a value investor - my transformative quest -- Guy Spier -- ( WeLib.org ).pdf | Investing |
| 13 | Warren Buffett and the interpretation of financial -- Mary Buffett and David Clark -- ( WeLib.org ).pdf | Investing |
| 14 | common-stock-for-uncommon-profit-FSF1fsZtrk20180601-ios.pdf | Investing |
| 15 | security-analysis-benjamin-graham-6th-edition-pdf-february-24-2010-12-08-am-3-0-meg.pdf | Investing |

**Note:** There appear to be 2 duplicate Michael Porter PDFs (same content, "(1)" suffix on one). The ingestion process should handle these gracefully.

---

## Task Breakdown

### Pre-Flight Checks

- [x] **0.1** Verify OPENAI_API_KEY is set in `.env` or `.env.local` ✅
- [x] **0.2** Verify sufficient disk space (estimate: ~500MB for embeddings) ✅
- [x] **0.3** Confirm internet connectivity for OpenAI API calls ✅
- [x] **0.4** Run current stats to confirm baseline: `npx tsx scripts/ingest.ts --stats` ✅
  - **Baseline:** 1 document, 1,707 chunks

### Phase 1: Batch Ingestion (Core Task)

- [x] **1.0 Execute Full Ingestion** ✅ COMPLETED
  
  Command executed:
  
  ```bash
  npx tsx scripts/ingest.ts --all
  ```
  
  **Results:**
  - PDFs processed: 16
  - Total pages extracted: 6,252
  - Total chunks created: 14,232
  - Duration: ~5 minutes

  - [x] **1.1** Monitor ingestion progress in terminal output ✅
  - [x] **1.2** Watch for any failed PDFs (extraction errors, API failures) ✅
    - **Issues Noted:**
      - `Warren Buffett and the interpretation of financial...pdf` - 0 chunks extracted (possible image-based PDF)
      - `Competitive advantage...(1).pdf` - Duplicate, skipped
  - [x] **1.3** Note total chunks created per document for verification ✅

### Phase 2: Verify Ingestion Success

- [x] **2.1** Run stats to verify all documents indexed: ✅
  ```
  Documents indexed: 14
  Total chunks: 14,232
  ```

- [x] **2.2** Verify each document appears in the "Documents:" list ✅
- [x] **2.3** Check for any missing documents compared to source list ✅
  - **Missing:** 
    - `Warren Buffett and the interpretation of financial...pdf` (0 chunks - likely image-based PDF)
    - `Competitive advantage...(1).pdf` (duplicate)
    - CBA Annual Reports in `data/uploads/` (not in knowledge folder)

### Phase 3: Quality Validation

- [x] **3.1** Test a query against the **new** content: ✅
  ```bash
  npx tsx scripts/test-query.ts "What are Porter's five forces?"
  ```
  **Result:** Successfully retrieved chunks from Competitive Advantage and Competitive Strategy books

- [x] **3.2** Test cross-document retrieval: ✅
  ```bash
  npx tsx scripts/test-query.ts "What are Ray Dalio's principles for decision making?"
  ```
  **Result:** Successfully retrieved chunks from Principles: Life and Work

- [ ] **3.3** Test behavioral economics content:
  ```bash
  npx tsx scripts/test-query.ts "What is loss aversion?"
  ```
  Should retrieve from Misbehaving or Irrational Exuberance

- [x] **3.4** Verify citation format includes source filename and page number ✅

### Phase 4: UI Verification

- [ ] **4.1** Start the development server:
  ```bash
  npm run dev
  ```

- [ ] **4.2** Navigate to http://localhost:3000
- [ ] **4.3** Verify StatusIndicator shows updated document and chunk counts
- [ ] **4.4** Ask a question about new content through the chat UI
- [ ] **4.5** Verify citations reference the newly ingested documents

### Phase 5: Documentation & Cleanup

- [ ] **5.1** Update `journal.md` with ingestion results:
  - Total documents indexed
  - Total chunks created
  - Any PDFs that failed or require re-processing
  - Notable observations

- [ ] **5.2** If any PDFs failed, attempt individual re-ingestion:
  ```bash
  npx tsx scripts/ingest.ts --file "filename.pdf"
  ```

- [ ] **5.3** Mark this task complete

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| `OPENAI_API_KEY not set` | Add key to `.env.local` |
| Memory errors during ingestion | Process PDFs in smaller batches |
| PDF extraction fails | Check if PDF is corrupted or password-protected |
| Rate limiting from OpenAI | Wait and retry; script handles retries internally |
| Duplicate content warnings | Normal for duplicate PDFs; can be cleaned up later |

### Manual Recovery Commands

```bash
# Check current database stats
npx tsx scripts/ingest.ts --stats

# Ingest a single PDF
npx tsx scripts/ingest.ts --file "Principles- Life and Work -- Ray Dalio -- ( WeLib.org ).pdf"

# Test extraction without embedding (debugging)
npx tsx scripts/ingest.ts --file "book.pdf" --skip-embed

# Query the database
npx tsx scripts/test-query.ts "your query here"
```

---

## Success Criteria

✅ All 20 PDFs successfully ingested  
✅ Database stats show 20 documents  
✅ Test queries return relevant results from new content  
✅ UI displays updated status  
✅ No orphaned or corrupted chunks in database  

---

## Notes

- The `--all` flag will **not** re-embed already indexed documents; it only adds new content
- If embeddings need to be regenerated, delete `data/lancedb/` folder first
- Each PDF generates approximately 1,500-2,500 chunks depending on length
