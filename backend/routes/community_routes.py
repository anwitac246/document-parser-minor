from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Query
from typing import Dict, List, Set, Optional
from datetime import datetime
from pydantic import BaseModel
import json
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class Message(BaseModel):
    id: str
    userId: str
    userName: str
    content: str
    createdAt: str
    communityId: str

class CommunityManager:
    def __init__(self):
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}
        self.community_messages: Dict[str, List[Message]] = {}
        self.typing_users: Dict[str, Set[str]] = {}
        self.user_info: Dict[str, dict] = {}
    
    def add_connection(self, community_id: str, user_id: str, websocket: WebSocket):
        """Add a connection without accepting (accept is done in endpoint)"""
        if community_id not in self.active_connections:
            self.active_connections[community_id] = {}
            self.community_messages[community_id] = []
            self.typing_users[community_id] = set()
        
        self.active_connections[community_id][user_id] = websocket
        logger.info(f"User {user_id} connected to community {community_id}")
    
    def disconnect(self, community_id: str, user_id: str):
        if community_id in self.active_connections:
            self.active_connections[community_id].pop(user_id, None)
            
            if community_id in self.typing_users:
                self.typing_users[community_id].discard(user_id)
            
            if not self.active_connections[community_id]:
                del self.active_connections[community_id]
            
            logger.info(f"User {user_id} disconnected from community {community_id}")
    
    async def broadcast_message(self, community_id: str, message: dict, exclude_user: str = None):
        if community_id in self.active_connections:
            dead_connections = []
            for user_id, connection in self.active_connections[community_id].items():
                if exclude_user and user_id == exclude_user:
                    continue
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending to {user_id}: {e}")
                    dead_connections.append(user_id)
            
            for user_id in dead_connections:
                self.disconnect(community_id, user_id)
    
    def add_message(self, community_id: str, message: Message):
        if community_id not in self.community_messages:
            self.community_messages[community_id] = []
        
        self.community_messages[community_id].append(message)
        
        # Keep last 1000 messages per community
        if len(self.community_messages[community_id]) > 1000:
            self.community_messages[community_id] = self.community_messages[community_id][-1000:]
    
    def get_messages(self, community_id: str, limit: int = 50, before: str = None):
        if community_id not in self.community_messages:
            return []
        
        messages = self.community_messages[community_id]
        
        if before:
            messages = [m for m in messages if m.createdAt < before]
        
        return messages[-limit:]

# Global manager instance
manager = CommunityManager()

@router.get("/status")
async def community_status():
    """Get overall community service status"""
    return {
        "status": "running",
        "active_communities": len(manager.active_connections),
        "total_connections": sum(len(conns) for conns in manager.active_connections.values()),
        "total_messages": sum(len(msgs) for msgs in manager.community_messages.values())
    }

@router.get("/{community_id}/messages")
async def get_messages(
    community_id: str,
    limit: int = Query(50, ge=1, le=100),
    before: Optional[str] = None
):
    """Get message history for a community"""
    try:
        messages = manager.get_messages(community_id, limit, before)
        return {
            "messages": [msg.dict() for msg in messages],
            "count": len(messages),
            "communityId": community_id
        }
    except Exception as e:
        logger.error(f"Error getting messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{community_id}/stats")
async def get_community_stats(community_id: str):
    """Get statistics for a specific community"""
    return {
        "communityId": community_id,
        "activeUsers": len(manager.active_connections.get(community_id, {})),
        "totalMessages": len(manager.community_messages.get(community_id, [])),
        "typingUsers": len(manager.typing_users.get(community_id, set()))
    }

@router.websocket("/ws/{community_id}")
async def websocket_endpoint(websocket: WebSocket, community_id: str):
    """WebSocket endpoint for real-time community chat"""
    user_id = None
    user_name = None
    
    try:
        # Accept connection ONCE at the start
        await websocket.accept()
        
        # Wait for hello message
        data = await websocket.receive_json()
        
        if data.get("type") != "hello":
            await websocket.send_json({
                "type": "error",
                "error": "First message must be 'hello'"
            })
            await websocket.close()
            return
        
        user_id = data.get("userId")
        user_name = data.get("userName", "Anonymous")
        
        if not user_id:
            await websocket.send_json({
                "type": "error",
                "error": "userId is required"
            })
            await websocket.close()
            return
        
        # Add connection to manager
        manager.add_connection(community_id, user_id, websocket)
        
        # Store user info
        manager.user_info[user_id] = {
            "userName": user_name,
            "communityName": data.get("communityName", ""),
            "communityImage": data.get("communityImage", ""),
            "communityDescription": data.get("communityDescription", "")
        }
        
        # Send ready signal to this user
        await websocket.send_json({
            "type": "ready",
            "userId": user_id,
            "communityId": community_id
        })
        
        # Notify others that user joined
        await manager.broadcast_message(community_id, {
            "type": "user_joined",
            "userId": user_id,
            "userName": user_name
        }, exclude_user=user_id)
        
        logger.info(f"User {user_name} ({user_id}) joined community {community_id}")
        
        # Main message loop
        while True:
            data = await websocket.receive_json()
            message_type = data.get("type")
            
            if message_type == "message":
                content = data.get("content", "").strip()
                if not content:
                    continue
                
                message = Message(
                    id=str(uuid.uuid4()),
                    userId=user_id,
                    userName=user_name,
                    content=content,
                    createdAt=datetime.utcnow().isoformat(),
                    communityId=community_id
                )
                
                manager.add_message(community_id, message)
                
                # Broadcast to all users in community (including sender)
                await manager.broadcast_message(community_id, {
                    "type": "message",
                    "message": message.dict()
                })
                
                logger.info(f"Message from {user_name} in {community_id}: {content[:50]}")
            
            elif message_type == "typing":
                is_typing = data.get("isTyping", False)
                
                if is_typing:
                    manager.typing_users.setdefault(community_id, set()).add(user_id)
                else:
                    if community_id in manager.typing_users:
                        manager.typing_users[community_id].discard(user_id)
                
                # Broadcast typing status (exclude sender)
                await manager.broadcast_message(community_id, {
                    "type": "typing",
                    "userId": user_id,
                    "userName": user_name,
                    "isTyping": is_typing
                }, exclude_user=user_id)
            
            else:
                await websocket.send_json({
                    "type": "error",
                    "error": f"Unknown message type: {message_type}"
                })
    
    except WebSocketDisconnect:
        if user_id:
            manager.disconnect(community_id, user_id)
            await manager.broadcast_message(community_id, {
                "type": "user_left",
                "userId": user_id,
                "userName": user_name
            })
            logger.info(f"User {user_name} disconnected from {community_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        if user_id:
            manager.disconnect(community_id, user_id)

@router.delete("/{community_id}/messages")
async def clear_messages(community_id: str):
    """Clear all messages in a community (admin only - add auth later)"""
    if community_id in manager.community_messages:
        manager.community_messages[community_id] = []
        return {"message": f"Messages cleared for community {community_id}"}
    return {"message": "No messages to clear"}