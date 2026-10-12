from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv
load_dotenv()
from groq import AsyncGroq

from vector_store import (
    store_note,
    search_notes
)

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

@app.post("/notes")
def add_note(request: Item):
    note_id = store_note(
        request.text
    )
    return {
        "message": "Note stored",
        "id": note_id
    }

@app.post("/search")
def search(request: Item):
    results = search_notes(
        request.text
    )
    return {
        "results": results
    }

@app.post("/analyze")
async def analyze_meeting(request: Item):

    related_notes = search_notes(
        request.text,
        limit=3
    )

    context = "\n".join(
        note["text"]
        for note in related_notes
    )

    response = await client.chat.completions.create(
        model="openai/gpt-oss-120b",

        messages=[
            {
                "role": "system",
                "content": """
You analyze project and meeting notes.

Give a very brief summary using bullet points.

Use previous notes only when relevant.

Mention important changes,
resolved issues,
or recurring problems.
"""
            },

            {
                "role": "user",
                "content": f"""
CURRENT NOTE:

{request.text}


RELEVANT PREVIOUS NOTES:

{context}
"""
            }
        ]
    )

    result = response.choices[0].message.content

    store_note(
        request.text
    )

    return {
        "result": result,
        "related_notes": related_notes
    }



