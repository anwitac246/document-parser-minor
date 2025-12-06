from fastapi import APIRouter, Form, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional
import json
from services.groq_service import groq_service
from datetime import datetime

router = APIRouter()

temporary_chats = {}

@router.post("/")
async def chat_endpoint(
    message: str = Form(""),
    temporaryMode: str = Form("false"),
    userId: str = Form(...),
    context: Optional[str] = Form(None)
):
    try:
        is_temporary = temporaryMode.lower() == "true"
        
        if not message.strip():
            raise HTTPException(status_code=400, detail="Message is required")
        
        if not userId:
            raise HTTPException(status_code=400, detail="User ID is required")
        
        context_data = []
        if context:
            try:
                context_data = json.loads(context)
            except:
                pass
        
        if is_temporary:
            if userId not in temporary_chats:
                temporary_chats[userId] = []
            
            temporary_chats[userId].append({
                "role": "user",
                "content": message,
                "timestamp": datetime.now().isoformat()
            })
            
            if len(temporary_chats[userId]) > 1:
                context_data = [
                    {"role": msg["role"], "content": msg["content"]}
                    for msg in temporary_chats[userId][-6:]
                ]
        
        try:
            ai_response = groq_service.chat_response(message, context_data)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")
        
        if is_temporary and userId in temporary_chats:
            temporary_chats[userId].append({
                "role": "assistant",
                "content": ai_response,
                "timestamp": datetime.now().isoformat()
            })
            
            if len(temporary_chats[userId]) > 20:
                temporary_chats[userId] = temporary_chats[userId][-10:]
        
        return JSONResponse({
            "response": ai_response,
            "timestamp": datetime.now().isoformat(),
            "temporary_mode": is_temporary
        })
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.delete("/temporary/{user_id}")
async def clear_temporary_chat(user_id: str):
    if user_id in temporary_chats:
        message_count = len(temporary_chats[user_id])
        del temporary_chats[user_id]
        return {
            "message": "Temporary chat cleared",
            "user_id": user_id,
            "cleared_messages": message_count
        }
    return {"message": "No temporary chat found", "user_id": user_id}

@router.get("/temporary/{user_id}")
async def get_temporary_chat(user_id: str):
    if user_id in temporary_chats:
        return {
            "messages": temporary_chats[user_id],
            "user_id": user_id,
            "message_count": len(temporary_chats[user_id])
        }
    return {"messages": [], "user_id": user_id, "message_count": 0}