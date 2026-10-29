import os
from dotenv import load_dotenv
from google import genai

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    api_key = api_key.strip().strip('"').strip("'")

print(f"Checking models with key: {api_key[:5]}...")

try:
    client = genai.Client(api_key=api_key)
    # The SDK might have a different way to list models depending on version.
    # Trying the standard V1 way or the new client way.
    # For google-genai library (not google-generativeai):
    
    print("Attempting to list models...")
    # Based on recent SDK usages:
    try:
        # Pager object
        pager = client.models.list() 
        for model in pager:
            print(f"Model: {model.name} | Supported methods: {model.supported_generation_methods}")
    except Exception as e:
        print(f"Error listing with client.models.list(): {e}")

except Exception as e:
    print(f"Fatal error: {e}")
