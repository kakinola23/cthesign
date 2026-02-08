from typing import Dict, List, Optional
from datetime import datetime
from app.models import ChatMessage, ChatHistory, Citation


class ChatService:
    def __init__(self):
        # In-memory storage for sessions (use Redis/DB in production)
        self.sessions: Dict[str, ChatHistory] = {}

    def get_or_create_session(self, session_id: str) -> ChatHistory:
        """Get existing session or create new one."""
        if session_id not in self.sessions:
            now = datetime.now()
            self.sessions[session_id] = ChatHistory(
                session_id=session_id, messages=[], created_at=now, last_updated=now
            )
        return self.sessions[session_id]

    def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        citations: Optional[List[Citation]] = None,
    ) -> ChatMessage:
        """Add message to session history."""
        session = self.get_or_create_session(session_id)
        # Validate role
        if role not in ("user", "assistant", "system"):
            raise ValueError(
                f"Invalid role: {role}. Must be 'user', 'assistant', or 'system'"
            )

        message = ChatMessage(
            role=role,  # type: ignore  # Pydantic will validate Literal
            content=content,
            citations=citations,
        )
        session.messages.append(message)
        session.last_updated = datetime.now()
        return message

    def get_history(self, session_id: str) -> Optional[ChatHistory]:
        """Retrieve session history."""
        return self.sessions.get(session_id)

    def delete_session(self, session_id: str) -> bool:
        """Delete session."""
        if session_id in self.sessions:
            del self.sessions[session_id]
            return True
        return False

    def format_history_for_prompt(self, session_id: str, last_n: int = 5) -> str:
        """Format recent history for inclusion in prompt."""
        session = self.sessions.get(session_id)
        if not session or not session.messages:
            return "No previous conversation."

        # Get last n exchanges (excluding system messages if any)
        recent = [m for m in session.messages if m.role != "system"][-last_n:]

        formatted = []
        for msg in recent:
            prefix = "User" if msg.role == "user" else "Assistant"
            formatted.append(f"{prefix}: {msg.content}")

        return "\n".join(formatted)

    def is_duplicate_message(self, session_id: str, content: str) -> bool:
        """Check if message is duplicate of last user message."""
        session = self.sessions.get(session_id)
        if not session or not session.messages:
            return False

        last_msg = session.messages[-1]
        return last_msg.role == "user" and last_msg.content.strip() == content.strip()

    def list_sessions(self) -> List[ChatHistory]:
        """List all active sessions."""
        return list(self.sessions.values())
