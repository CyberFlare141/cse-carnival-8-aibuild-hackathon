from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.schemas import ChatRequest, ChatResponse
from backend.services import agent_service

router = APIRouter(prefix="/chat", tags=["AI Agent"])

@router.post("", response_model=ChatResponse)
def chat_with_agent(payload: ChatRequest, db: Session = Depends(get_db)):
    history_dicts = [msg.model_dump() for msg in payload.conversation_history]
    result = agent_service.process_chat(
        message=payload.message,
        conversation_history=history_dicts,
        db=db
    )
    return result
