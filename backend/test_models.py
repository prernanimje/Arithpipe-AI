import os
from dotenv import load_dotenv
from google import genai

load_dotenv(override=True)
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    api_key = api_key.strip().strip('"').strip("'")
client = genai.Client(api_key=api_key)

test_list = [
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-2.5-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-3-flash-preview",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-pro-latest",
    "gemini-2.5-pro",
    "gemini-3.1-flash-lite",
]

for m in test_list:
    try:
        res = client.models.generate_content(model=m, contents="Reply with 'OK'")
        print(f"PASS: {m} -> {res.text.strip()[:20]}")
    except Exception as e:
        print(f"FAIL: {m} -> {str(e)[:70]}")
