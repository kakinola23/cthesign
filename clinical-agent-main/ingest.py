import os
import sys
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_chroma import Chroma
from dotenv import load_dotenv

load_dotenv()

DB_PATH = os.getenv("CHROMA_DB_PATH", "./chroma_db")
PDF_PATH = os.getenv("PDF_PATH", "data/n12.pdf")

def ingest_guidelines():
    # Check if already exists
    if os.path.exists(DB_PATH) and os.listdir(DB_PATH):
        print(f"✓ Vector database found at {DB_PATH}. Skipping embedding.")
        return

    if not os.path.exists(PDF_PATH):
        print(f"✗ PDF not found at {PDF_PATH}")
        print("Please download the NG12 PDF from:")
        print("https://www.nice.org.uk/guidance/ng12/resources/suspected-cancer-recognition-and-referral-pdf-1837268071621")
        print(f"And place it at {PDF_PATH}")
        sys.exit(1)

    print("📄 Loading PDF...")
    loader = PyPDFLoader(PDF_PATH)
    docs = loader.load()
    print(f"✓ Loaded {len(docs)} pages")

    # Add section metadata based on content analysis (optional enhancement)
    for doc in docs:
        # PyPDFLoader already adds 'page' and 'source' to metadata
        doc.metadata["section"] = infer_section(doc.page_content)

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000, 
        chunk_overlap=200,
        separators=["\n\n", "\n", ". ", " ", ""]
    )
    splits = text_splitter.split_documents(docs)

    print(f"✓ Created {len(splits)} chunks")

    print("🔮 Creating embeddings...")
    embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")

    vectorstore = Chroma.from_documents(
        documents=splits,
        embedding=embeddings,
        persist_directory=DB_PATH
    )

    print(f"✓ Ingestion complete. Database saved to {DB_PATH}")

def infer_section(text: str) -> str:
    """Simple heuristic to identify guideline sections."""
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
