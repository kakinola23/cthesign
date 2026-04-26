import os
from typing import List, Dict, Any, Optional
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain_core.documents import Document
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

class RAGService:
    def __init__(self, db_path: str = "./chroma_db"):
        self.db_path = db_path
        self.embeddings = OpenAIEmbeddings(
            model="text-embedding-3-small"
        )
        self.vectorstore: Optional[Chroma] = None

    def initialize(self) -> "RAGService":
        if not os.path.exists(self.db_path):
            raise FileNotFoundError(
                f"Vector database not found at {self.db_path}. Run ingest.py first."
            )
        self.vectorstore = Chroma(
            persist_directory=self.db_path, embedding_function=self.embeddings
        )
        return self

    def _ensure_initialized(self) -> Chroma:
        if self.vectorstore is None:
            self.initialize()
        if self.vectorstore is None:
            raise RuntimeError("Failed to initialize vector store")
        return self.vectorstore

    def search(self, query: str, k: int = 5) -> List[Document]:
        store = self._ensure_initialized()
        results = store.similarity_search(query, k=k)
        return results

    def search_with_scores(self, query: str, k: int = 5) -> List[tuple]:
        store = self._ensure_initialized()
        return store.similarity_search_with_score(query, k=k)

    def format_context(self, docs: List[Document]) -> str:
        formatted = []
        for i, doc in enumerate(docs):
            page = doc.metadata.get("page", "unknown")
            source = f"[Page {page}]" if page != "unknown" else ""
            formatted.append(f"Excerpt {i+1} {source}:\n{doc.page_content}")
        return "\n\n---\n\n".join(formatted)

    def extract_citations(self, docs: List[Document]) -> List[Dict[str, Any]]:
        citations = []
        for doc in docs:
            citations.append(
                {
                    "source": "NG12 PDF",
                    "page": doc.metadata.get("page"),
                    "section": doc.metadata.get("section", "Unknown"),
                    "excerpt": (
                        doc.page_content[:200] + "..."
                        if len(doc.page_content) > 200
                        else doc.page_content
                    ),
                }
            )
        return citations