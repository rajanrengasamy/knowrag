/**
 * KnowRAG - Type Definitions for RAG Pipeline
 */

/**
 * Metadata for a single chunk of text extracted from a PDF
 */
export interface ChunkMetadata {
    /** Original PDF filename */
    source: string;
    /** Page number in the PDF (1-indexed) */
    page: number;
    /** Index of this chunk within the document */
    chunkIndex: number;
    /** The actual text content */
    text: string;
}

/**
 * Result from PDF text extraction
 */
export interface PDFExtractionResult {
    /** Total number of pages in the PDF */
    totalPages: number;
    /** Array of text content per page (index 0 = page 1) */
    pages: PageContent[];
    /** Original filename */
    source: string;
}

/**
 * Content extracted from a single PDF page
 */
export interface PageContent {
    /** Page number (1-indexed) */
    pageNumber: number;
    /** Raw text content of the page */
    text: string;
}

/**
 * Statistics from the ingestion process
 */
export interface IngestionStats {
    /** Source PDF filename */
    source: string;
    /** Total pages processed */
    pagesProcessed: number;
    /** Total chunks created */
    chunksCreated: number;
    /** Average chunk size in characters */
    avgChunkSize: number;
    /** Processing time in milliseconds */
    processingTimeMs: number;
}
