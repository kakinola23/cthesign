FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for ChromaDB and PDF processing
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libc6-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/
COPY ingest.py .
COPY data/ ./data/

# Create directory for ChromaDB
RUN mkdir -p /app/chroma_db

# Environment variables
ENV PYTHONPATH=/app
ENV CHROMA_DB_PATH=/app/chroma_db
ENV PDF_PATH=/app/data/n12.pdf
ENV GOOGLE_API_KEY=""

# Expose port
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
