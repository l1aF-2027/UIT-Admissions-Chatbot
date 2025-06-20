# 🤖 UIT Admissions Chatbot

![image](https://github.com/user-attachments/assets/7c319d4e-21ed-47b5-98a5-79731f46aa0b)

## Project Overview

This application uses natural language processing and knowledge retrieval to provide information about university admissions. The chatbot collects data from UIT's official website, processes it, and answers user queries based on that data.

### Key Features

- Two main branches for information retrieval:
  - **main** (also `hybrid_search_bm25`): Combines BM25 score and semantic score for hybrid search.
  - **hard-filter**: Uses hard metadata filtering (with hand-crafted keywords, suitable for admissions) and semantic score only.
- Utilizes Google Cloud API for large language model (LLM) responses  
- Processes documents with chunking and keyword filtering  
- Web-based interface 

---

## System Architecture

The project has separate frontend and backend components:

### Backend

- Vector database: Qdrant for semantic search  
- NLP processing:  
  - LangChain SemanticChunker for chunking  
  - Sentence Transformer [AITeamVN/Vietnamese_Embedding](https://huggingface.co/AITeamVN/Vietnamese_Embedding) from Hugging Face for embeddings  
  - Custom keyword filtering  

### Frontend

- Framework: React with TypeScript  
- UI: Custom chat interface  
- State management: React hooks  

---

## Installation & Setup
### Backend Setup

```bash
git clone https://github.com/l1aF-2027/UIT-Admissions-Chatbot.git
cd rag

python3.10 -m venv venv
# On Linux/macOS:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

pip install -r requirements.txt
# Create a .env file in backend directory with necessary variables of Qdrant Client
python crawler.py
python chunking.py
python embedding.py

```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Project Structure
```bash
root/
├── frontend/ # Web frontend (Next.js)
│ ├── app
│ │ ├── api/ # API routes (server functions)
│ │ └── page.tsx # Main landing page
│ ├── components/ # React components
│ │ │ ├── chat-interface.tsx
│ │ │ ├── footer.tsx
│ │ │ ├── header.tsx
│ │ │ ├── hero-section.tsx
│ │ │ ├── link-preview.tsx
│ │ │ ├── mobile-menu.tsx
│ │ │ ├── news-section.tsx
│ │ │ └── theme-provider.tsx
│ ├── lib/ # Logic, utilities, embeddings
│ │ ├── actions.ts
│ │ ├── embedding.ts
│ │ ├── gemini.ts
│ │ ├── markdown.ts
│ │ ├── qdrant.ts
│ │ └── utils.ts
│ └── markdown_data/ # Markdown content (copied here at runtime)
│
├── rag/ # RAG system (Retrieval-Augmented Generation)
│ ├── markdown_data/ # Markdown content (source)
│ ├── chunking.py # Logic for splitting documents into chunks
│ ├── crawler.py # Web crawler to gather content
│ ├── embedding.py # Embedding generator for documents
│
└── requirements.txt # Python dependencies for RAG system
```

### RAG Implementation

The project implements a Retrieval Augmented Generation system:

- **Data Collection**: Crawls UIT's website for admissions information
- **Content Processing**: Cleans and converts HTML to markdown format
- **Chunking Strategy**: Segments documents into chunks using LangChain's RecursiveCharacterTextSplitter
- **Embedding Generation**: Creates vector embeddings using Hugging Face models
- **Semantic Search**: Uses Qdrant for vector similarity search
- **Response Generation**: Combines retrieved context with Google Cloud API for answer generation
