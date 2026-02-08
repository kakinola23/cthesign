# Docker Setup Guide

This guide explains how to dockerize and run the Clinical Decision Support Agent application.

## Prerequisites

- Docker (version 20.10 or higher)
- Docker Compose (version 1.29 or higher)
- `.env` file with `GOOGLE_API_KEY` set

## Quick Start

### 1. Create Environment File

```bash
echo "GOOGLE_API_KEY=your_key_here" > .env
```

### 2. Download NG12 PDF

Download the PDF from:
https://www.nice.org.uk/guidance/ng12/resources/suspected-cancer-recognition-and-referral-pdf-1837268071621

Save it to: `data/n12.pdf`

### 3. Ingest PDF Data (One-time setup)

```bash
docker-compose --profile ingest run --rm ingest
```

This will:
- Process the NG12 PDF
- Create embeddings using ChromaDB
- Store the vector database in a Docker volume

### 4. Start the Application

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode (background)
docker-compose up -d --build
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Docker Architecture

### Services

1. **api** (Backend)
   - FastAPI application
   - Port: 8000
   - Handles all API requests
   - Uses ChromaDB for vector storage

2. **frontend** (Frontend)
   - React application built with Nginx
   - Port: 3000 (mapped to Nginx port 80)
   - Serves static files
   - Proxies API requests to backend

3. **ingest** (Optional)
   - One-time PDF ingestion service
   - Runs with profile: `--profile ingest`

### Volumes

- `chroma_data`: Persistent storage for ChromaDB vector database

### Networks

- `clinical-network`: Bridge network connecting all services

## Docker Commands

### Build

```bash
# Build all services
docker-compose build

# Build specific service
docker-compose build api
docker-compose build frontend

# Force rebuild without cache
docker-compose build --no-cache
```

### Run

```bash
# Start all services
docker-compose up

# Start in detached mode
docker-compose up -d

# Start specific services
docker-compose up api frontend

# Rebuild and start
docker-compose up --build
```

### Stop

```bash
# Stop services (keeps containers)
docker-compose stop

# Stop and remove containers
docker-compose down

# Stop and remove containers + volumes (clears ChromaDB)
docker-compose down -v
```

### Logs

```bash
# View all logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f api
docker-compose logs -f frontend

# View last 100 lines
docker-compose logs --tail=100
```

### Other Useful Commands

```bash
# Check service status
docker-compose ps

# Execute command in running container
docker-compose exec api bash
docker-compose exec frontend sh

# View resource usage
docker-compose top

# Restart a service
docker-compose restart api
```

## Development vs Production

### Development Mode

For development, you can run:
- Backend in Docker
- Frontend locally with `npm start`

This allows hot-reloading for frontend changes.

```bash
# Terminal 1: Start backend
docker-compose up api

# Terminal 2: Start frontend locally
cd frontend
npm install
npm start
```

### Production Mode

For production, use Docker for both services:

```bash
docker-compose up -d --build
```

## Troubleshooting

### Port Already in Use

If ports 3000 or 8000 are already in use:

```bash
# Change ports in docker-compose.yml
ports:
  - "3001:8000"  # Change 8000 to 3001
  - "3002:80"    # Change 3000 to 3002
```

### ChromaDB Not Initialized

If you see vector store errors:

```bash
# Re-run ingestion
docker-compose --profile ingest run --rm ingest
```

### Frontend Can't Connect to API

Check that:
1. Both services are running: `docker-compose ps`
2. Services are on the same network: `docker network ls`
3. API is accessible: `curl http://localhost:8000/health`

### Rebuild After Code Changes

```bash
# Rebuild and restart
docker-compose up --build

# Or rebuild specific service
docker-compose build frontend
docker-compose up frontend
```

## Environment Variables

### Backend (.env file)

```bash
GOOGLE_API_KEY=your_google_api_key_here
```

### Frontend (docker-compose.yml)

The frontend uses build-time environment variables:
- `REACT_APP_API_URL`: Set to `/api` in Docker (proxied by Nginx)

## File Structure

```
.
├── Dockerfile              # Backend Dockerfile
├── docker-compose.yml      # Docker Compose configuration
├── .dockerignore           # Files to ignore in Docker builds
├── frontend/
│   ├── Dockerfile          # Frontend Dockerfile
│   ├── nginx.conf          # Nginx configuration
│   └── .dockerignore       # Frontend-specific ignore
└── data/
    └── n12.pdf            # NG12 PDF (must be downloaded)
```

## Production Deployment

For production deployment:

1. **Update environment variables** in `.env`
2. **Remove `--reload` flag** from docker-compose.yml (line 15)
3. **Use production build** (already configured)
4. **Set up reverse proxy** (Nginx/Traefik) if needed
5. **Configure SSL/TLS** certificates
6. **Set up monitoring** and logging

Example production docker-compose.yml change:

```yaml
command: uvicorn app.main:app --host 0.0.0.0 --port 8000
# Remove --reload for production
```

## Clean Up

```bash
# Remove all containers, networks, and volumes
docker-compose down -v

# Remove images
docker-compose down --rmi all

# Complete cleanup (containers, volumes, images)
docker-compose down -v --rmi all
```

