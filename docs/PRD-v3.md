# Product Requirements Document: KnowRAG v3

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

### Phase 3 Goals (Modern UI)
1. Seamless Page Load Experience
2. Fluid Message Animations
3. Interactive Micro-interactions
4. Professional Loading States
5. Polished Visual Design

### Phase 4 Goals (Multimodal Image Understanding)
1. Allow users to attach and upload images in the chat.
2. Allow users to paste images directly from the clipboard.
3. Enable asking questions about the uploaded images.
4. Integrate multimodal capabilities of LLMs (Gemini 3 Flash, OpenAI o4-mini/gpt-4o) to understand and reason about images.

---

## User Stories

### Phase 1

1. **As a user**, I want to ask questions about The Intelligent Investor and receive answers based on the actual book content, so I can trust the information is accurate.

2. **As a user**, I want to see citations with book name and page numbers, so I can verify the source and read more context.

3. **As a user**, I want to choose between different AI models (Gemini 3 Flash Thinking, o4-mini), so I can compare response quality and speed.

4. **As a user**, I want to see the indexing status (how many documents/chunks are indexed), so I know the system is ready to answer questions.

5. **As a user**, I want to run this locally with `npm run dev`, so I don't need complex deployment setup.

### Phase 4 (New)

6. **As a user**, I want to attach an image file (JPG, PNG) to my message, so I can ask the AI to analyze it.
7. **As a user**, I want to paste an image from my clipboard into the chat input, so I can quickly share screenshots or copied images.
8. **As a user**, I want the AI to "look" at the image and answer my question about it, utilizing its multimodal capabilities.
9. **As a user**, I want to remove an attached image before sending if I change my mind.
10. **As a user**, I want to see the image I uploaded displayed in the chat history alongside my question.

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
| FR5.8 | **(New)** Chat input must support image attachments (clip icon) and drag-and-drop. |
| FR5.9 | **(New)** Chat input must support pasting images from clipboard. |
| FR5.10 | **(New)** Chat interface must display attached images in the message bubble. |

### FR6: Configuration

| ID | Requirement |
|----|-------------|
| FR6.1 | System must read API keys from environment variables (OPENAI_API_KEY, GOOGLE_API_KEY) |
| FR6.2 | System must provide a `.env.example` file documenting required variables |
| FR6.3 | System must fail gracefully with clear error if API keys are missing |

### FR13: Image Understanding (Phase 4)

| ID | Requirement |
|----|-------------|
| FR13.1 | System must accept image data (Base64) in the chat API endpoint. |
| FR13.2 | LLM integration (Gemini 3 Flash) must pass image data to the model for multimodal inference. |
| FR13.3 | LLM integration (OpenAI o4-mini) must pass image data to the model (if supported, or fallback/error). *Note: Ensure o4-mini supports vision or switch to gpt-4o for vision.* |
| FR13.4 | System must handle image upload size limits (e.g., max 5MB) to prevent payload issues. |

---

## Technical Considerations

### Technology Stack Updates (Phase 4)
- **Frontend Image Handling:** Native HTML `<input type="file">` or `react-dropzone` (optional) for handling uploads. Paste event listener for clipboard support.
- **Image Processing:** Convert images to Base64 strings to send via JSON payload to the API.
- **Backend API:** Update `POST /api/chat` to accept an optional `images` array (containing Base64 strings).
- **LLM Clients:**
    - **Google Generative AI SDK:** Use `inlineData` for sending images.
    - **OpenAI SDK:** Use `image_url` (with base64 data URL) in the message content.

### API Payload Structure Update

```json
{
  "query": "What is in this chart?",
  "model": "gemini",
  "images": ["data:image/png;base64,..."] // Optional
}
```

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| v1 | 2024-12-22 | Initial draft with GPT-5.2/Gemini 3 Pro |
| v2 | 2024-12-28 | Revised after discussion: o4-mini + Gemini 3 Flash Thinking, phased approach, validated pricing |
| v3 | 2024-12-29 | Added Phase 3: Slick Modern UI with Tailwind CSS + Motion |
| v3 (Update) | 2024-12-29 | Added Phase 4: Image Understanding & Multimodal capabilities |
