from fastapi import APIRouter, UploadFile, File, Form
import asyncio
from starlette.concurrency import run_in_threadpool
import csv
import io
import json
import os
import re
from dotenv import load_dotenv
from google import genai
from google.genai import types
from datetime import datetime
from typing import Optional
from app.db.chat_ops import create_session, save_message

load_dotenv(override=True)

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    # Ensure no surrounding quotes or whitespace
    GEMINI_API_KEY = GEMINI_API_KEY.strip().strip('"').strip("'")
    client = genai.Client(api_key=GEMINI_API_KEY)
else:
    client = None

router = APIRouter()

async def generate_with_fallback(client, contents):
    # Priority list of models to try
    # 1. Lite (Fastest/Newest) -> 2. Flash 2.5 (Standard) -> 3. Flash 1.5 (Legacy/Backup)
    # The 'lite' model has a very low quota (20/day) so fallback is essential.
    models = [
        "gemini-2.0-flash-001", "gemini-flash-latest", "gemini-pro-latest",
        "gemini-3-flash-preview", "gemini-2.5-flash-lite", 
        "gemini-1.5-flash", "gemini-pro"
    ]
    last_error = None
    
    for model in models:
        # Try each model with a small retry on 429 (Rate Limit) before switching
        for attempt in range(2): 
            try:
                # print(f"DEBUG: Attempting {model} (Try {attempt+1})...")
                return await run_in_threadpool(
                    client.models.generate_content,
                    model=model,
                    contents=contents
                )
            except Exception as e:
                last_error = e
                err_str = str(e)
                
                # Check for Rate Limit (429) - Retry same model once if it's a momentary spike
                if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                     if attempt == 0: 
                         # print(f"DEBUG: 429 on {model}. Retrying...")
                         await asyncio.sleep(4)
                         continue
                
                # If it's a hard failure (Quota Exceeded, Not Found, Overloaded), break to next model
                if any(x in err_str for x in ["404", "NOT_FOUND", "503", "429", "RESOURCE_EXHAUSTED"]):
                    print(f"DEBUG: {model} unavailable ({err_str[:50]}...). Switching model...")
                    break # Break inner loop, go to next model in outer loop
                
                # Other errors (Auth, Bad Request) -> Raise immediately
                raise e
    
    # If all models fail
    print("DEBUG: All models failed.")
    raise last_error

@router.post("/ask/analyze_file")
async def analyze_file(file: UploadFile = File(...), message: str = Form(""), user_id: Optional[str] = Form(None), session_id: Optional[str] = Form(None)):
    try:
        # Convert IDs safely
        if user_id and user_id.lower() == 'null': user_id = None
        if user_id: user_id = int(user_id)
        if session_id and session_id.lower() == 'null': session_id = None
    except: pass
    filename = file.filename.lower()
    content = await file.read()
    
    analysis_text = ""
    chart_data = None

    # Base analysis for Charts (CSV)
    if filename.lower().endswith(".csv"):
        try:
            decoded = content.decode("utf-8")
        except UnicodeDecodeError:
            decoded = content.decode("latin-1")
            
        try:
            reader = csv.DictReader(io.StringIO(decoded))
            rows = list(reader)
            if rows:
                keys = [k.strip() for k in rows[0].keys()]
                # Better Heuristics for determining Chart Columns
                keys = [k.strip() for k in rows[0].keys()]
                
                # 1. Find Label Key (X-axis): Look for common names, or first non-numeric column
                label_options = ['label', 'name', 'category', 'date', 'month', 'year', 'item', 'product', 'city', 'state']
                label_key = next((k for k in keys if k.lower() in label_options), None)
                
                if not label_key:
                    # Fallback: scan for first text-like column
                    for k in keys:
                         is_numeric_col = True
                         for row in rows[:5]:
                             try:
                                 float(str(row[k]).replace(',', '').replace('$', '').strip())
                             except:
                                 is_numeric_col = False
                                 break
                         if not is_numeric_col:
                             label_key = k
                             break
                if not label_key: label_key = keys[0] # Ultimate fallback

                # 2. Find Value Key (Y-axis): Look for common names, or first numeric column
                value_options = ['value', 'count', 'amount', 'price', 'total', 'sales', 'profit', 'revenue', 'score']
                value_key = next((k for k in keys if k.lower() in value_options), None)
                
                if not value_key:
                    # Fallback: scan for first numeric column
                    for k in keys:
                         is_numeric_col = True
                         for row in rows[:5]:
                             try:
                                 float(str(row[k]).replace(',', '').replace('$', '').strip())
                             except:
                                 is_numeric_col = False
                                 break
                         if is_numeric_col:
                             value_key = k
                             break
                
                if value_key:
                    chart_data = [] # Default basic parsing
                    for row in rows[:30]:
                        try:
                            # Preserve all columns
                            item = row.copy()
                            # Normalize essential keys for Chart
                            val = str(row[value_key]).replace('$', '').replace(',', '')
                            item["name"] = str(row[label_key])
                            item["value"] = float(val)
                            chart_data.append(item)
                        except: continue
        except: pass

    # AI Analysis & Advanced Chart Extraction
    if client:
        try:
            prompt = f"Analyze this file: {file.filename}. User Request: {message}\n"
            prompt += "Identify the key data trends. AUTOMATICALLY extract the most relevant data points for a chart. "
            prompt += "IMPORTANT: If the user request specifies a quantity (e.g., 'top 5', 'best 3'), STRICTLY respect that number. Otherwise, default to max 10 items. "
            prompt += "Format as valid JSON: {'chart_type': 'bar|line|area|pie', 'data': [{'name': 'category', 'value': 123}]}. "
            prompt += "Choose the best chart_type based on the data (e.g., 'line' for trends, 'pie' for proportions). Default to 'bar'."
            prompt += "Wrap the JSON in [[[JSON_START]]] and [[[JSON_END]]] markers. Do this even if the user didn't explicitly ask for a chart."

            response = await generate_with_fallback(
                client=client,
                contents=[
                    prompt,
                    types.Part.from_bytes(data=content, mime_type=file.content_type) if file.content_type.startswith(('image/', 'application/pdf')) else f"File Content: {content[:4000].decode('utf-8', errors='ignore')}"
                ]
            )
            analysis_text = response.text
            
            # Extract JSON if present and override basic CSV parsing
            # Extract JSON: Try Custom Markers first, then partial markers, then Markdown blocks
            extracted_json = None
            clean_text_pattern = None

            # 1. Try Strict Markers
            match = re.search(r"\[\[\[JSON_START\]\]\](.*?)\[\[\[JSON_END\]\]\]", analysis_text, re.DOTALL)
            if match:
                extracted_json = match.group(1).strip()
                clean_text_pattern = match.group(0)
            
            # 2. Key Fallback: Look for standard Markdown JSON blocks if markers missing
            if not extracted_json:
                match = re.search(r"```(?:json|JSON)?\s*(\{.*?\})\s*```", analysis_text, re.DOTALL)
                if match:
                    extracted_json = match.group(1).strip()
                    clean_text_pattern = match.group(0)

            if extracted_json:
                try:
                    # Cleanup Markdown if it was inside the markers
                    extracted_json = re.sub(r"^```(?:json|JSON)?", "", extracted_json).strip()
                    extracted_json = extracted_json.replace("```", "").strip()
                    
                    ai_response_json = json.loads(extracted_json)
                    
                    # Handle new structure or fallback to list
                    if isinstance(ai_response_json, list):
                         if len(ai_response_json) > 0 and 'name' in ai_response_json[0]:
                            chart_data = ai_response_json
                    elif isinstance(ai_response_json, dict):
                        if 'data' in ai_response_json:
                            chart_data = ai_response_json['data']
                        if 'chart_type' in ai_response_json:
                             # Capture chart type to return it
                             # Note: We need to make sure final_chart_type below can see this
                             pass 

                    # Remove the JSON block from visible text so users don't see code
                    if clean_text_pattern:
                        analysis_text = analysis_text.replace(clean_text_pattern, "").strip()
                except Exception as e:
                    print(f"JSON Parsing Error: {e}")

        except Exception as e:
            error_msg = str(e)
            if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
                 analysis_text = "⚠️ **AI Rate Limit Reached**: Please try again in 30 seconds."
            elif "404" in error_msg or "NOT_FOUND" in error_msg:
                 analysis_text = "⚠️ **AI Model Not Found**: The configured AI model is unavailable for your region or account."
            else:
                 analysis_text += f"\n(AI Analysis Error: {error_msg})"
            
    else:
        if not analysis_text:
             analysis_text = f"I've received your file: **{file.filename}**. (Connect Gemini API for AI insights)"

    # Get chart_type if available in local scope from AI parsing
    final_chart_type = "bar"
    try:
        if 'ai_response_json' in locals() and isinstance(ai_response_json, dict):
            final_chart_type = ai_response_json.get('chart_type', 'bar')
    except: pass

    # HISTORY FEAT: Save interaction
    if user_id:
        try:
            if not session_id:
                new_session = create_session(user_id, title=f"File: {file.filename}")
                if new_session: session_id = str(new_session["id"])
            
            if session_id:
                # Save user msg
                save_message(session_id, {
                    "id": int(datetime.utcnow().timestamp() * 1000),
                    "type": "user", 
                    "text": f"[File: {file.filename}] {message}",
                    "timestamp": datetime.now().strftime("%I:%M %p")
                })
                # Save bot msg
                save_message(session_id, {
                    "id": int(datetime.utcnow().timestamp() * 1000) + 1,
                    "type": "bot",
                    "text": analysis_text,
                    "chart_data": chart_data,
                    "chart_type": final_chart_type,
                    "timestamp": datetime.now().strftime("%I:%M %p")
                })
        except Exception as e:
            print(f"History Save Error (File): {e}")

    return {
        "answer": analysis_text, 
        "chart_data": chart_data, 
        "chart_type": final_chart_type,
        "session_id": session_id
    }

@router.post("/ask")
async def ask_bot(payload: dict):
    question = payload.get("question", "")
    context = payload.get("context", {})
    user_id = payload.get("user_id")
    session_id = payload.get("session_id")

    data_summary = context.get("data_summary", [])
    history = context.get("history", []) # Get conversation history
    
    # Limit data summary to first 30 rows context for token efficiency
    context_data = data_summary[:30]
    
    # Construct a context-aware prompt
    system_prompt = f"""
    You are 'Arithpipe AI', a world-class Data Analyst.
    
    CAPABILITIES:
    1. Data Analysis: Provide insights and summaries (Text only).
    2. Visualization: Create Charts (Bar, Line, Area, Pie) on demand.
    3. Filtering: Show specific data points (e.g. "Top 5", "Sales > 100", "Show Profit column").
    4. Prediction: Forecast future trends based on historical data.
    5. Navigation: Move between dashboard pages.

    CONTEXT:
    The user is looking at a dataset with the following summary (first 30 rows):
    {json.dumps(context_data)}
    
    YOUR GOAL:
    Answer the user's question based on this data and the previous conversation history.
    
    RULES:
    1. Respond in natural, helpful language.
    3. If the user asks to CHANGE the chart type (e.g. "show as pie chart", "make it a line graph"), append strictly this block at the end:
       [[[ACTION_START]]]
       type: update_chart
       chart_type: [bar|line|area|pie]
       [[[ACTION_END]]]
    4. If the user asks to creates a NEW chart or FILTER data (e.g. "show top 3 items", "plot sales for 2024", "show me a bar chart"):
       - ONLY generate this block if the user EXPLICITLY asks for a visualization/chart/plot.
       - If they just ask for analysis or "what is top 3", provide TEXT ONLY.
       - Extract relevant data from the context.
       - STRICTLY respect any quantity limits (e.g. if "top 3", data list MUST have exactly 3 items).
       - Format as valid JSON list of objects with 'name' and 'value'.
       - Append strictly this block at the end:
       [[[ACTION_START]]]
       type: create_chart
       chart_type: [bar|line|area|pie]
       data: [{{"name": "Item A", "value": 10}}, {{"name": "Item B", "value": 20}}]
       [[[ACTION_END]]]
    5. If the user asks to PREDICT or FORECAST future data (e.g. "predict sales for next year", "forecast the next 3 months"):
       - Generate plausible future data points based on the trends.
       - Provide a descriptive explanation of the prediction.
       - Append strictly this block at the end. CRITICAL: Use 'value' for history and 'forecast' for prediction. The last historical point must be included as the first 'forecast' point to connect the lines:
       [[[ACTION_START]]]
       type: predict_data
       chart_type: line
       data: [{{"name": "Jan", "value": 10}}, {{"name": "Feb", "value": 12}}, {{"name": "Feb", "forecast": 12}}, {{"name": "Mar", "forecast": 15}}]
       [[[ACTION_END]]]
    6. If the user asks to NAVIGATE to a page (e.g. "go to dashboard"), append strictly this block at the end:
       [[[ACTION_START]]]
       type: navigate
       path: [/finbro-dashboard|/|/chart-config]
       [[[ACTION_END]]]
    7. Keep the text response separate from the action block.
    """

    # Add History Context
    history_text = ""
    if history:
        history_text = "\nPREVIOUS CONVERSATION:\n"
        for msg in history[-10:]: # Keep last 10 messages for context
            role = msg.get('role', 'user')
            content = msg.get('content', '')
            history_text += f"{role.capitalize()}: {content}\n"

    print(f"DEBUG: ask_bot called with question: {question}")
    
    answer_text = "I'm ready to help! I can visualize your data or help you navigate the app."
    action_data = {}

    if client:
        try:
            print("DEBUG: Calling Gemini API...")
            final_prompt = f"{system_prompt}\n{history_text}\nCURRENT QUESTION:\nUser: {question}"
            
            response = await generate_with_fallback(
                client=client,
                contents=final_prompt
            )
            raw_text = response.text
            print(f"DEBUG: Gemini Response: {raw_text[:100]}...")

            # Parse Action Block
            match = re.search(r"\[\[\[ACTION_START\]\]\](.*?)\[\[\[ACTION_END\]\]\]", raw_text, re.DOTALL)
            if match:
                action_content = match.group(1).strip()
                # Parse key-value pairs
                for line in action_content.split('\n'):
                    if ':' in line and not line.strip().startswith('data:'):
                        key, val = line.split(':', 1)
                        action_data[key.strip()] = val.strip()
                
                # Extract 'data' JSON array if present (Robust regex)
                data_match = re.search(r"data:\s*(\[.*\])", action_content, re.DOTALL)
                if data_match:
                    try:
                        action_data['data'] = json.loads(data_match.group(1).strip())
                    except Exception as e:
                        print(f"DEBUG: Failed to parse action data JSON: {e}")

                # Remove action block from visible text
                answer_text = raw_text.replace(match.group(0), "").strip()
            else:
                answer_text = raw_text

            # HISTORY FEAT: Save Interaction
            if user_id:
                try:
                    if not session_id:
                        new_session = create_session(user_id, title=question[:50])
                        if new_session: session_id = str(new_session["id"])
                    
                    if session_id:
                        # User 
                        save_message(session_id, {
                            "id": int(datetime.utcnow().timestamp() * 1000),
                            "type": "user",
                            "text": question,
                            "timestamp": datetime.now().strftime("%I:%M %p")
                        })
                        # Bot
                        save_message(session_id, {
                             "id": int(datetime.utcnow().timestamp() * 1000) + 1,
                             "type": "bot",
                             "text": answer_text,
                             "chart_data": action_data.get("data"),
                             "chart_type": action_data.get("chart_type"),
                             "timestamp": datetime.now().strftime("%I:%M %p")
                        })
                except Exception as e:
                    print(f"History Save Error (Ask): {e}")

            return {
                "answer": answer_text,
                "action": action_data.get("type"),
                "chart_type": action_data.get("chart_type"),
                "navigate_path": action_data.get("path"),
                "chart_data": action_data.get("data"),
                "session_id": session_id
            }

        except Exception as e:
            print(f"DEBUG: Gemini API ERROR: {str(e)}")
            error_msg = str(e)
            
            # If we already have chart_data from the file, we can still show that
            if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
                 wait_time = "30 seconds"
                 match = re.search(r"retry in (\d+(\.\d+)?)s", error_msg)
                 if match:
                     wait_time = f"{int(float(match.group(1)) + 1)} seconds"
                 analysis_text = f"⚠️ **AI Rate Limit Reached**: Please try again in {wait_time}."
                 if chart_data:
                     analysis_text += "\n\n(Showing basic chart from file data)"
            elif "404" in error_msg or "NOT_FOUND" in error_msg:
                 return {"answer": "⚠️ **AI Model Error**: The requested AI model is not available. Please contact support."}
            return {"answer": f"I encountered an error: {error_msg}"}
    else:
        print("DEBUG: Gemini Client is NOT initialized (API Key missing?)")
        return {"answer": "Gemini API is not connected. Please check your configuration."}


