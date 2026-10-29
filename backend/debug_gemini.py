
import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv(override=True)

api_key = os.getenv("GEMINI_API_KEY")
print(f"API Key found: {'Yes' if api_key else 'No'}")
if api_key:
    print(f"API Key (first 5 chars): {api_key[:5]}...")

if not api_key:
    print("ERROR: No API Key found in .env")
    exit(1)

genai.configure(api_key=api_key)

print("\nListing available models...")
try:
    found_any = False
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"- {m.name}")
            found_any = True
    
    if not found_any:
        print("No models found that support 'generateContent'.")
    else:
        try:
            model = genai.GenerativeModel('gemini-flash-latest')
            response = model.generate_content("Hello, can you hear me?")
            print(f"Success! Response: {response.text}")
        except Exception as e:
            print(f"Generation failed with gemini-flash-latest: {e}")
            
except Exception as e:
    print(f"Error listing models: {e}")
