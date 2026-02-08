from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime


# Assessment Models
class Patient(BaseModel):
    patient_id: str
    name: str
    age: int
    gender: str
    smoking_history: str
    symptoms: List[str]
    symptom_duration_days: int


class Citation(BaseModel):
    source: str = "NG12 PDF"
    page: Optional[int] = None
    section: Optional[str] = None
    excerpt: str


class AssessmentResponse(BaseModel):
    prediction: Literal[
        "Urgent Referral", "Urgent Investigation", "Routine/GP Management"
    ]
    risk_level: Literal["High", "Moderate", "Low"]
    reasoning: str
    recommended_action: str
    citations: List[Citation]
    patient_id: str


# Chat Models
class ChatRequest(BaseModel):
    session_id: str = Field(..., description="Unique session identifier")
    message: str = Field(..., description="User question")
    top_k: int = Field(
        default=5, ge=1, le=10, description="Number of chunks to retrieve"
    )


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str
    timestamp: datetime = Field(default_factory=datetime.now)
    citations: Optional[List[Citation]] = None


class ChatResponse(BaseModel):
    session_id: str
    answer: str
    citations: List[Citation]
    grounded: bool = Field(..., description="Whether answer was found in guidelines")


class ChatHistory(BaseModel):
    session_id: str
    messages: List[ChatMessage]
    created_at: datetime
    last_updated: datetime
