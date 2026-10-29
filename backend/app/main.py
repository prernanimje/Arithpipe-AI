from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from dotenv import load_dotenv
import os

from app.routes.auth import router as auth_router
from app.routes.ask import router as ask_router
from app.routes.upload import router as upload_router
from app.routes.chat import router as chat_router
from app.routes.stock import router as stock_router

load_dotenv(override=True)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173",
                   "http://localhost:5174",
                   "http://localhost:5175",
                   "http://localhost:5176",
                   "http://127.0.0.1:5173",
                   "http://127.0.0.1:5174",
                   "http://127.0.0.1:5175",
                   "http://127.0.0.1:5176"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Gemini Client
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    GEMINI_API_KEY = GEMINI_API_KEY.strip().strip('"').strip("'")
print(f"INFO: GEMINI_API_KEY loaded: {'Yes' if GEMINI_API_KEY else 'No'}")
client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

from typing import Optional
from datetime import datetime
from app.db.chat_ops import create_session, save_message

class ChatRequest(BaseModel):
    message: str
    user_id: Optional[int] = None
    session_id: Optional[str] = None

# ROUTES
app.include_router(auth_router)
app.include_router(ask_router)
app.include_router(upload_router)
app.include_router(chat_router)
app.include_router(stock_router)

from starlette.concurrency import run_in_threadpool
import asyncio

async def generate_with_fallback(client, contents):
    models = [
        "gemini-2.0-flash-001", "gemini-flash-latest", "gemini-pro-latest",
        "gemini-3-flash-preview", "gemini-2.5-flash-lite", 
        "gemini-1.5-flash", "gemini-pro"
    ]
    last_error = None
    
    for model in models:
        for attempt in range(2): 
            try:
                return await run_in_threadpool(
                    client.models.generate_content,
                    model=model,
                    contents=contents
                )
            except Exception as e:
                last_error = e
                err_str = str(e)
                if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                     if attempt == 0: await asyncio.sleep(4); continue
                if any(x in err_str for x in ["404", "NOT_FOUND", "503", "429", "RESOURCE_EXHAUSTED"]): break
                raise e
    raise last_error

@app.post("/chat")
async def chat_with_ai(request: ChatRequest):
    if not request.message.strip():
        return {"reply": "I'm here! How can I help you with your data analysis today?"}
        
    if not client:
        return {"reply": "Gemini API Key is missing. Please check your .env file."}
    
    try:
        user_id = request.user_id
        session_id = request.session_id

        # HISTORY FEAT: Auto-create session if user is logged in
        if user_id:
            try:
                if not session_id:
                    new_session = create_session(user_id, title=request.message[:50])
                    if new_session: session_id = str(new_session["id"])
            
                if session_id:
                    save_message(session_id, {
                        "id": int(datetime.utcnow().timestamp() * 1000),
                        "type": "user",
                        "text": request.message,
                        "timestamp": datetime.now().strftime("%I:%M %p")
                    })
            except Exception as e:
                print(f"History Save Error (User): {e}")

        response = await generate_with_fallback(
            client=client,
            contents=f"You are Arithpipe AI, a friendly data expert. Respond concisely and professionally. User: {request.message}"
        )
        reply_text = response.text

        # HISTORY FEAT: Save Bot Response
        if user_id and session_id:
            try:
                save_message(session_id, {
                    "id": int(datetime.utcnow().timestamp() * 1000) + 1,
                    "type": "bot",
                    "text": reply_text, 
                    "timestamp": datetime.now().strftime("%I:%M %p")
                })
            except Exception as e:
                print(f"History Save Error (Bot): {e}")

        return {"reply": reply_text, "session_id": session_id}
    except Exception as e:
        error_msg = str(e)
        if "API_KEY_INVALID" in error_msg or "400" in error_msg:
             return {"reply": "The configured Gemini API key appears to be invalid. Please check your .env file."}
        return {"reply": f"I'm ready to help, but encountered a temporary issue: {error_msg}"}