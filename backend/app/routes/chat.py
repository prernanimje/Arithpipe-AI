from fastapi import APIRouter, HTTPException
from app.db.chat_ops import get_chat_history, get_session, create_session
import uuid

router = APIRouter()

@router.get("/chat/history")
def get_user_chat_history(user_id: str):
    try:
        if not user_id or user_id == "null":
            return []
        
        # We need integer user_id
        # Assuming user_id is integer in DB but string in query param
        try:
            user_id = int(user_id)
        except ValueError:
            return [] # Invalid user ID
             
        history = get_chat_history(user_id)
        return history
    except Exception as e:
        print(f"Error fetching history: {e}")
        return []

@router.get("/chat/session/{session_id}")
def get_chat_session(session_id: str, user_id: str):
    try:
        try:
            session_id = int(session_id)
            user_id = int(user_id)
        except: return None
        
        session = get_session(session_id, user_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return session
    except Exception as e:
        print(f"Error fetching session: {e}")
        raise HTTPException(status_code=500, detail=str(e))
