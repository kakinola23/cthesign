import os
import sys
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma
from dotenv import load_dotenv

load_dotenv()

DB_PATH = os.getenv("CHROMA_DB_PATH", "./chroma_db")
PDF_PATH = os.getenv("PDF_PATH", "data/n12.pdf")

def ingest_guidelines():
    if os.path.exists(DB_PATH) and os.listdir(DB_PATH):
        print(f"Vector database found at {DB_PATH}. Skipping embedding.")
        return

    if not os.path.exists(PDF_PATH):
        print(f"PDF not found at {PDF_PATH}")
        sys.exit(1)

    print("Loading PDF...")
    loader = PyPDFLoader(PDF_PATH)
    docs = loader.load()
    print(f"Loaded {len(docs)} pages")

    for doc in docs:
        doc.metadata["section"] = infer_section(doc.page_content)

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", ". ", " ", ""]
    )
    splits = text_splitter.split_documents(docs)
    print(f"Created {len(splits)} chunks")

    print("Creating embeddings with OpenAI...")
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

    vectorstore = Chroma.from_documents(
        documents=splits,
        embedding=embeddings,
        persist_directory=DB_PATH
    )
    print(f"Ingestion complete. Database saved to {DB_PATH}")

def infer_section(text: str) -> str:
    text_lower = text.lower()
    sections = {
        "lung": "Lung Cancer",
        "breast": "Breast Cancer",
        "colorectal": "Colorectal Cancer",
        "haematuria": "Urological Cancer",
        "hoarseness": "Head and Neck Cancer",
        "dysphagia": "Upper GI Cancer",
        "dyspepsia": "Upper GI Cancer",
        "anaemia": "Lower GI Cancer",
        "cough": "Lung Cancer"
    }
    for keyword, section in sections.items():
        if keyword in text_lower:
            return section
    return "General"

if __name__ == "__main__":
    ingest_guidelines()