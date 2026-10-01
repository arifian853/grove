from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv
load_dotenv()
from groq import AsyncGroq

client = AsyncGroq()

class Item(BaseModel):
    text: str

app = FastAPI()
frontend_dir = Path(__file__).resolve().parent / "frontend"
app.mount("/assets", StaticFiles(directory=frontend_dir), name="assets")

@app.get("/") # GET Method / Route dengan metode GET
def main():
    return FileResponse(frontend_dir / "index.html")

@app.get("/hello") # GET Method / Route dengan metode GET
def hello():
    return {"message" : "Hello everyone!"}

@app.get("/health") # GET Method / Route dengan metode GET
def health():
    return {"status" : "OK"}

@app.post("/analyze") # POST Method / Route dengan metode POST
async def analyze_meeting(request: Item):
    response = await client.chat.completions.create(
        model = "openai/gpt-oss-120b",
        messages = [
            {
                "role":"system", # System Prompt untuk memberikan konteks atau instruksi kepada model
                "content": "Please give me a very brief summary and use bullet points only"
            },
            {
                "role":"user",
                "content":request.text
            }
        ]
    )
    result = response.choices[0].message.content
    return {
        "result": result
        }
