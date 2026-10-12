# Grove

A notes and knowledge workspace with a FastAPI backend and a plain HTML, CSS, and JavaScript frontend. Store knowledge in a persistent local Qdrant database, search by meaning, and analyze new notes with relevant previous knowledge using Groq.

The interface follows the **Material 3 Forest** design guide in `frontend/DESIGN.md`, with sage colors, forest green buttons, and a responsive message panel.

## Requirements

- Python 3.10 or newer.
- A Groq API key from [Groq Console](https://console.groq.com/keys).
- An internet connection for the first embedding model download and Groq analysis requests.
- Disk space for Python dependencies, the embedding model, and database files.

Embeddings use `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` and run locally after the model downloads. Qdrant runs in embedded mode; no separate server or Docker container is needed.

No Node.js installation or frontend build step is needed.

## Setup

Run these commands from the project directory in PowerShell:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

If your virtual environment already exists, activate it and install the dependencies.

Create a `.env` file in the project root:

```dotenv
GROQ_API_KEY=your-groq-api-key
```

The backend loads this file automatically. The key is required when the application initializes the Groq client, including when you only want to store or search notes. Keep your key private; `.env` is excluded by `.gitignore`.

## Run

From the project root, with the virtual environment active:

```powershell
python -m uvicorn main:app --reload
```

Alternatively, use `fastapi dev main.py`.

Open:

- Website: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- Interactive API docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

The first startup may take longer while the embedding model downloads and loads. The `grove_notes` collection is created automatically if missing. Database files are stored in `qdrant_data/`, relative to the working directory, so always start the server from the project root to use the same database.

Press **Ctrl + C** in the terminal to stop the server. `--reload` restarts it when backend files change and is intended for local development. Run a single application process against the embedded database; multiple processes cannot share the same Qdrant storage directory.

## Use the website

Choose one of the three tabs:

| Tab | Action | Result |
|---|---|---|
| **Analyze** | Paste meeting or project notes and select **Analyze & save** | Brief analysis using previous knowledge, related notes with IDs and scores, and automatic storage of the submitted note |
| **Store knowledge** | Paste knowledge and select **Save knowledge** | Store the note in Qdrant and display its ID |
| **Search knowledge** | Enter a question or topic and select **Search knowledge** | Up to three closest notes, including text, IDs, and similarity scores |

Each tab includes **Try an example**. Submit with **Ctrl + Enter** (**Cmd + Enter** on macOS). Drafts and results are preserved when switching tabs, but disappear on page refresh. **Clear results** removes displayed history for the active tab; it does not delete knowledge from Qdrant. There is currently no API or UI for deleting saved notes.

Search uses semantic similarity rather than exact keyword matching. Scores are cosine similarity values, not confidence percentages. There is no minimum score filter, so matches may be only loosely related to the query.

## Analysis and persistence

For each `/analyze` request, the backend:

1. Retrieves up to three previous notes related to the submitted text.
2. Sends the current note and retrieved note text to Groq, asking for brief bullet points about important changes, resolved issues, or recurring problems. Previous notes should be used only when relevant.
3. Stores the submitted text in Qdrant after Groq returns successfully.
4. Returns the analysis and retrieved notes.

The generated analysis itself is not stored. UI conversation history is not sent to the model; context comes from the database. Knowledge persists across page refreshes and server restarts. Submitting identical text again creates a new note with a new ID; there is no deduplication.

Storage and search generate embeddings locally. Analysis sends the current note and retrieved note text to Groq through the backend; the API key stays on the server.

## API

| Method | Route | Purpose |
|---|---|---|
| GET | `/` | Serve the website |
| POST | `/notes` | Store supplied text in Qdrant |
| POST | `/search` | Retrieve up to three semantically similar notes |
| POST | `/analyze` | Analyze using previous notes, then store the submitted text |
| GET | `/health` | Return `{"status":"OK"}`; does not test Groq or Qdrant connectivity |
| GET | `/hello` | Return a sample greeting |
| GET | `/docs` | Open the interactive API documentation |

All three POST endpoints accept JSON with a required string field named `text`. The UI rejects blank input; the backend currently does not enforce a nonempty string. IDs, scores, and analysis wording below are illustrative.

### Store knowledge

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/notes" -Method Post -ContentType "application/json" -Body '{"text":"Website project: Launch is scheduled for Friday. Maya owns the homepage."}'
```

```json
{
  "message": "Note stored",
  "id": "0e8e6edc-c52c-4db3-9608-772f510f88bf"
}
```

### Search knowledge

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/search" -Method Post -ContentType "application/json" -Body '{"text":"When is the website launch?"}'
```

```json
{
  "results": [
    {
      "id": "0e8e6edc-c52c-4db3-9608-772f510f88bf",
      "text": "Website project: Launch is scheduled for Friday. Maya owns the homepage.",
      "score": 0.82
    }
  ]
}
```

An empty database returns `{"results":[]}`. Searching does not save the query or generate an AI answer.

### Analyze and save

Example request from PowerShell:

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/analyze" -Method Post -ContentType "application/json" -Body '{"text":"The website launches Friday. Maya will finish the homepage Wednesday. Alex will review it Thursday."}'
```

The JSON response has this shape; wording varies:

```json
{
  "result": "- Website launches Friday.\n- Maya finishes the homepage Wednesday.\n- Alex reviews it Thursday.",
  "related_notes": [
    {
      "id": "0e8e6edc-c52c-4db3-9608-772f510f88bf",
      "text": "Website project: Launch is scheduled for Friday. Maya owns the homepage.",
      "score": 0.86
    }
  ]
}
```

`related_notes` is empty when no previous notes exist. It contains retrieval matches, which are not necessarily all used in the analysis. The newly stored note's ID is not included in this response.

## Project structure

```text
llm-test/
├── main.py               # FastAPI routes, website serving, and Groq analysis
├── vector_store.py       # Local embeddings, Qdrant storage, and semantic search
├── requirements.txt      # Python dependencies
├── app.py                # Standalone Groq command-line example
├── frontend/
│   ├── DESIGN.md         # UI design guide
│   ├── index.html        # Three-tab workspace markup
│   ├── styles.css        # Design tokens and responsive styles
│   └── scripts.js        # Tab state, API requests, and result rendering
├── qdrant_data/           # Persistent local database (not committed)
├── .env                  # Local API key (not committed)
├── .gitignore
└── README.MD
```

The model is currently `openai/gpt-oss-120b`. Change the `model` value or system prompt in `main.py` to adjust analysis behavior. To run the separate command-line example, use `python app.py`; it does not use the knowledge database.

## Troubleshooting

- **Missing API key:** Confirm `.env` is in the project root and contains `GROQ_API_KEY=...`, then restart the server.
- **Module not found:** Activate `venv` and run `python -m pip install -r requirements.txt` again.
- **Slow startup or model download failure:** Check internet access and disk space. The embedding model must finish downloading before the app starts.
- **Qdrant storage is locked:** Stop other processes using the same `qdrant_data/` directory and start a single server process.
- **Previously saved notes are missing:** Start the server from the project root. A different working directory uses a different relative database path.
- **No such command 'main.py':** Use `fastapi dev main.py`, including the `dev` subcommand.
- **Request fails:** Check the FastAPI terminal for embedding, storage, API key, Groq rate limit, model access, or connection errors.
- **Timeout or connection lost:** The server may still finish saving or analyzing. Search for the note before retrying to avoid duplicates. The frontend timeout is 120 seconds.
- **Port 8000 is in use:** Run `python -m uvicorn main:app --reload --port 8001` and open `http://127.0.0.1:8001`.
