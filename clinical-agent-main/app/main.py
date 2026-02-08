import json
import os
import shutil
from typing import Optional, Union, List, Dict, Any
from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate

from app.models import (
    AssessmentResponse,
    ChatRequest,
    ChatResponse,
    ChatHistory,
    Citation,
)
from app.services.patient_service import PatientService
from app.services.rag_service import RAGService
from app.services.chat_service import ChatService

app = FastAPI(
    title="Clinical Decision Support Agent",
    description="NG12 Cancer Guidelines Assessment & Chat API",
    version="1.0.0",
)

# CORS for frontend integration later
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
patient_service = PatientService()
rag_service = RAGService()
chat_service = ChatService()


# Load prompts
def load_prompt(filename: str) -> str:
    prompt_path = os.path.join(os.path.dirname(__file__), "prompts", filename)
    try:
        with open(prompt_path, "r") as f:
            return f.read()
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail=f"Prompt file {filename} not found")


# Initialize LLM
llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash", temperature=0, convert_system_message_to_human=True
)


def extract_content(
    response_content: Union[str, List[Union[str, Dict[str, Any]]]],
) -> str:
    """Extract string content from LLM response which can be str or list."""
    if isinstance(response_content, str):
        return response_content
    elif isinstance(response_content, list):
        parts = []
        for item in response_content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict) and "text" in item:
                parts.append(str(item["text"]))
            else:
                parts.append(str(item))
        return "".join(parts)
    else:
        return str(response_content)


@app.on_event("startup")
async def startup_event():
    """Initialize vector store on startup."""
    try:
        rag_service.initialize()
        print("Vector store initialized")
    except Exception as e:
        print(f"Vector store initialization failed: {e}")
        print("Ensure you've run ingest.py first")


@app.post("/patients/import")
async def import_patients(file: UploadFile = File(...), overwrite: bool = False):
    """
    Import patients from uploaded JSON file.

    - **file**: JSON file with patient records
    - **overwrite**: If true, replaces existing patients; if false, merges with existing
    """
    if not file.filename or not file.filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="Only JSON files allowed")

    try:
        content = await file.read()
        new_patients = json.loads(content)

        # Validate structure
        if not isinstance(new_patients, list):
            raise HTTPException(
                status_code=400, detail="JSON must be a list of patients"
            )

        required_fields = [
            "patient_id",
            "name",
            "age",
            "gender",
            "smoking_history",
            "symptoms",
            "symptom_duration_days",
        ]
        for i, patient in enumerate(new_patients):
            missing = [f for f in required_fields if f not in patient]
            if missing:
                raise HTTPException(
                    status_code=400, detail=f"Patient {i} missing fields: {missing}"
                )

        # Save to file
        data_dir = "data"
        os.makedirs(data_dir, exist_ok=True)
        file_path = os.path.join(data_dir, "patients.json")

        if overwrite:
            # Replace existing
            with open(file_path, "w") as f:
                json.dump(new_patients, f, indent=2)
            message = f"Imported {len(new_patients)} patients (overwrote existing)"
        else:
            # Merge with existing
            existing = []
            if os.path.exists(file_path):
                with open(file_path, "r") as f:
                    existing = json.load(f)

            # Create dict by patient_id to avoid duplicates
            patient_dict = {p["patient_id"]: p for p in existing}
            added = 0
            updated = 0

            for p in new_patients:
                if p["patient_id"] in patient_dict:
                    updated += 1
                else:
                    added += 1
                patient_dict[p["patient_id"]] = p

            merged = list(patient_dict.values())
            with open(file_path, "w") as f:
                json.dump(merged, f, indent=2)

            message = f"Imported {len(new_patients)} patients ({added} new, {updated} updated, {len(existing)} total)"

        # Reload patient service
        patient_service.__init__(file_path)

        return {
            "success": True,
            "message": message,
            "total_patients": len(patient_service.get_all_patients()),
        }

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


@app.get("/patients/export")
async def export_patients():
    """Export all patients as JSON file."""
    patients = patient_service.get_all_patients()
    if not patients:
        raise HTTPException(status_code=404, detail="No patients found")

    return {
        "filename": "patients_export.json",
        "count": len(patients),
        "patients": patients,
    }


@app.post("/assess/{patient_id}", response_model=AssessmentResponse)
async def assess_patient(patient_id: str):
    """
    Assess patient against NG12 guidelines for cancer referral criteria.
    """
    # Retrieve patient
    patient = patient_service.get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")

    # RAG Retrieval
    query = f"Urgent referral criteria for {', '.join(patient['symptoms'])} in {patient['age']} year old {patient['gender'].lower()}"
    docs = rag_service.search(query, k=5)

    if not docs:
        raise HTTPException(status_code=503, detail="Guidelines retrieval failed")

    context = rag_service.format_context(docs)
    citations_data = rag_service.extract_citations(docs)

    # Load and format prompt
    prompt_template = load_prompt("assessment.md")
    prompt = PromptTemplate.from_template(prompt_template)

    chain = prompt | llm

    try:
        response = chain.invoke(
            {"patient_info": json.dumps(patient, indent=2), "context": context}
        )

        content = extract_content(response.content)

        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]

        result = json.loads(content.strip())
        result["patient_id"] = patient_id

        if not result.get("citations"):
            result["citations"] = citations_data

        return AssessmentResponse(**result)

    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to parse LLM response: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Assessment failed: {str(e)}")


@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Conversational query over NG12 guidelines with memory.
    """
    session_id = request.session_id

    if chat_service.is_duplicate_message(session_id, request.message):
        history = chat_service.get_history(session_id)
        if history and history.messages:
            last_response = history.messages[-1]
            return ChatResponse(
                session_id=session_id,
                answer=last_response.content,
                citations=last_response.citations or [],
                grounded=True,
            )

    chat_service.add_message(session_id, "user", request.message)

    docs = rag_service.search(request.message, k=request.top_k)

    if not docs:
        refusal_msg = "I couldn't find support in the NG12 text for that. Could you ask about specific symptoms or referral criteria mentioned in the guidelines?"
        chat_service.add_message(session_id, "assistant", refusal_msg)
        return ChatResponse(
            session_id=session_id, answer=refusal_msg, citations=[], grounded=False
        )

    context = rag_service.format_context(docs)
    history = chat_service.format_history_for_prompt(session_id)

    prompt_template = load_prompt("chat.md")
    prompt = PromptTemplate.from_template(prompt_template)

    chain = prompt | llm

    try:
        response = chain.invoke(
            {"context": context, "history": history, "question": request.message}
        )

        answer = extract_content(response.content)

        grounded = "I couldn't find support in the NG12 text" not in answer

        citations = [Citation(**c) for c in rag_service.extract_citations(docs)]

        chat_service.add_message(session_id, "assistant", answer, citations=citations)

        return ChatResponse(
            session_id=session_id, answer=answer, citations=citations, grounded=grounded
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat processing failed: {str(e)}")


@app.get("/chat/{session_id}/history", response_model=ChatHistory)
async def get_chat_history(session_id: str):
    """Retrieve conversation history for a session."""
    history = chat_service.get_history(session_id)
    if history is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return history


@app.get("/chat/sessions")
async def list_chat_sessions():
    """List all active chat sessions."""
    sessions = chat_service.list_sessions()
    return {
        "count": len(sessions),
        "sessions": sessions,
    }


@app.delete("/chat/{session_id}")
async def delete_chat_session(session_id: str):
    """Clear conversation history."""
    success = chat_service.delete_session(session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": f"Session {session_id} deleted successfully"}


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "vector_store": "connected" if rag_service.vectorstore else "disconnected",
        "services": ["assessment", "chat"],
    }


@app.get("/patients")
async def list_patients():
    """List all available patient IDs for testing."""
    patients = patient_service.get_all_patients()
    return patients


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
