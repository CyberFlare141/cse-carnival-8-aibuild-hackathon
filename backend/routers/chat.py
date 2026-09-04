from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.schemas import ChatRequest, ChatResponse
from backend.services import agent_service

router = APIRouter(tags=["AI Agent"])


@router.get("/chat/status", tags=["AI Agent"])
def chat_status():
    return {
        "backend": "ok",
        "gemini_configured": bool(agent_service.settings.GEMINI_API_KEY),
        "model": agent_service.settings.GEMINI_MODEL,
    }

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
    if result.get("error"):
        error_type = result.get("error_type")
        error_status = {
            "configuration": status.HTTP_503_SERVICE_UNAVAILABLE,
            "authentication": status.HTTP_502_BAD_GATEWAY,
            "quota": status.HTTP_429_TOO_MANY_REQUESTS,
            "provider": status.HTTP_503_SERVICE_UNAVAILABLE,
            "tool_execution": status.HTTP_502_BAD_GATEWAY,
            "request": status.HTTP_400_BAD_REQUEST,
        }.get(error_type, status.HTTP_503_SERVICE_UNAVAILABLE)
        raise HTTPException(
            status_code=error_status,
            detail=result["reply"]
        )
    tools = result.get("tools_called", [])
    return {
        "reply": result.get("reply", ""),
        "tools_called": tools,
        "toolCalls": tools,
        "tool_calls": tools
    }
