from app.db.database import get_connection
import json
from datetime import datetime

def parse_messages(msgs):
    if msgs is None:
        return []
    if isinstance(msgs, str):
        try:
            return json.loads(msgs)
        except:
            return []
    return msgs

def get_chat_history(user_id):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT id, title, created_at, updated_at, messages 
            FROM conversations 
            WHERE user_id = %s 
            ORDER BY updated_at DESC
        """, (user_id,))
        rows = cur.fetchall()
        
        history = []
        for row in rows:
            history.append({
                "id": str(row[0]),
                "title": row[1] or "New Chat",
                "timestamp": row[3].strftime("%Y-%m-%d %H:%M:%S") if row[3] else "",
                "messages": parse_messages(row[4])
            })
        return history
    finally:
        cur.close()
        conn.close()

def get_session(session_id, user_id):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT id, title, created_at, updated_at, messages 
            FROM conversations 
            WHERE id = %s AND user_id = %s
        """, (session_id, user_id))
        row = cur.fetchone()
        
        if row:
            return {
                "id": str(row[0]),
                "title": row[1],
                "messages": parse_messages(row[4]),
                "timestamp": row[3].strftime("%Y-%m-%d %H:%M:%S") if row[3] else ""
            }
        return None
    finally:
        cur.close()
        conn.close()

def create_session(user_id, title="New Chat"):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO conversations (user_id, title, messages)
            VALUES (%s, %s, %s)
            RETURNING id, title, messages, created_at
        """, (user_id, title, json.dumps([])))
        row = cur.fetchone()
        conn.commit()
        return {
            "id": row[0],
            "title": row[1],
            "messages": [],
            "created_at": row[3].strftime("%Y-%m-%d %H:%M:%S")
        }
    finally:
        cur.close()
        conn.close()

def save_message(session_id, message_obj):
    conn = get_connection()
    cur = conn.cursor()
    try:
        # Append message to JSON array and update timestamp
        msg_str = json.dumps([message_obj])
        cur.execute("""
            UPDATE conversations 
            SET messages = messages || %s::jsonb, 
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (msg_str, session_id))
        
        # Auto-update title if it's the first user message for a new chat
        if message_obj.get("type") == "user":
            title_candidate = message_obj.get("text", "")[:50]
            if title_candidate:
                cur.execute("""
                    UPDATE conversations 
                    SET title = %s
                    WHERE id = %s AND (title = 'New Chat' OR title IS NULL) AND jsonb_array_length(messages) <= 2
                """, (title_candidate, session_id))
            
        conn.commit()
    finally:
        cur.close()
        conn.close()
