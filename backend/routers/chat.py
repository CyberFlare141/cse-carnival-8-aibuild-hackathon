from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.schemas import ChatRequest, ChatResponse
from backend.services import agent_service

router = APIRouter(tags=["AI Agent"])

@router.post("/chat", response_model=ChatResponse)
@router.post("/agent/chat", response_model=ChatResponse)
def chat_with_agent(payload: ChatRequest, db: Session = Depends(get_db)):
    history_items = payload.get_history()
    history_dicts = [
        {"role": msg.role, "content": msg.get_content()}
        for msg in history_items
    ]
    result = agent_service.process_chat(
        message=payload.message,
        conversation_history=history_dicts,
        db=db
    )
    tools = result.get("tools_called", [])
    return {
        "reply": result.get("reply", ""),
        "tools_called": tools,
        "toolCalls": tools,
        "tool_calls": tools
    }

