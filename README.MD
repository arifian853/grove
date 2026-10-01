# Grove

A small text summarizer with a FastAPI backend and a plain HTML, CSS, and JavaScript frontend. Paste notes, an article, or a message to get a brief bullet summary from Groq.

The interface follows the **Material 3 Forest** design guide in `frontend/DESIGN.md`, with sage colors, forest green buttons, and a responsive message panel.

## Requirements

- Python 3.10 or newer.
- A Groq API key from [Groq Console](https://console.groq.com/keys).
- An internet connection for Groq requests.

No Node.js installation or frontend build step is needed.

## Setup

Run these commands from the project directory in PowerShell:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install "fastapi[standard]" groq python-dotenv
```

If your virtual environment already exists, activate it and install the dependencies.

Create a `.env` file in the project root:

```dotenv
GROQ_API_KEY=your-groq-api-key
```

The backend loads this file automatically. Keep your key private; `.env` is excluded by `.gitignore`.

## Run

From the project root, with the virtual environment active:

```powershell
python -m uvicorn main:app --reload
```

Alternatively, use `fastapi dev main.py`.

Open:

- Website: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- Interactive API docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

Press **Ctrl + C** in the terminal to stop the server. `--reload` restarts it when backend files change and is intended for local development.

## Use the website

1. Paste or type text into the message box, or select **Try an example**.
2. Click **Summarize**, or press **Ctrl + Enter** (**Cmd + Enter** on macOS).
3. Read the summary in the message panel. Select **Clear** to remove displayed messages.

Each request summarizes only the submitted text; previous messages are not sent to the model. Messages are kept in the page and disappear when you refresh. Submitted text is sent to Groq through the backend, and the API key stays on the server.

## API

| Method | Route | Purpose |
|---|---|---|
| GET | `/` | Serve the website |
| POST | `/analyze` | Summarize the supplied text |
| GET | `/health` | Return `{"status":"OK"}`; does not check Groq connectivity |
| GET | `/hello` | Return a sample greeting |
| GET | `/docs` | Open the interactive API documentation |

Example request from PowerShell:

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/analyze" -Method Post -ContentType "application/json" -Body '{"text":"The website launches Friday. Maya will finish the homepage Wednesday. Alex will review it Thursday."}'
```

The JSON response has this shape; wording varies:

```json
{
  "result": "- Website launches Friday.\n- Maya finishes the homepage Wednesday.\n- Alex reviews it Thursday."
}
```

## Project structure

```text
llm-test/
├── main.py               # FastAPI app, website serving, and summary endpoint
├── app.py                # Standalone Groq command-line example
├── frontend/
│   ├── DESIGN.md         # UI design guide
│   ├── index.html        # Website markup
│   ├── styles.css        # Design tokens and responsive styles
│   └── scripts.js        # Message handling and API requests
├── .env                  # Local API key (not committed)
├── .gitignore
└── README.MD
```

The model is currently `openai/gpt-oss-120b`. Change the `model` value or system prompt in `main.py` to adjust the summary behavior. To run the separate command-line example, use `python app.py`.

## Troubleshooting

- **Missing API key:** Confirm `.env` is in the project root and contains `GROQ_API_KEY=...`, then restart the server.
- **Module not found:** Activate `venv` and run the dependency installation command again.
- **No such command 'main.py':** Use `fastapi dev main.py`, including the `dev` subcommand.
- **Summary request fails:** Check the FastAPI terminal for details, including invalid keys, Groq limits, model access, or connection errors.
- **Port 8000 is in use:** Run `python -m uvicorn main:app --reload --port 8001` and open `http://127.0.0.1:8001`.
