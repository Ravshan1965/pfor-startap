# PFOR — Operational Solutions Platform

**PFOR** (Platform for Operational Resolutions) is a B2B SaaS web service that accepts a business problem in natural language and runs a multi-agent AI pipeline powered by Google Gemini to produce a structured 5-page strategic report.

---

## Architecture

```
pfor-startup/
├── frontend/          # Isolated web interface (HTML/CSS/JS)
└── src/pfor/          # Isolated backend (Python / FastAPI)
    ├── api/           # REST endpoints (auth, strategy)
    ├── core/          # Business logic (config, multi-agent pipeline)
    ├── db/            # SQLite database layer (SQLAlchemy)
    └── schemas/       # Pydantic schemas
```

### Multi-Agent Pipeline

A single **Google Gemini** model (`gemini-1.5-flash`) is used with four distinct role-based prompts executed sequentially:

| Agent | Role |
|-------|------|
| **Director** | Strategic goals and solution concept |
| **Marketer** | Positioning, sales funnels, acquisition channels |
| **Financier** | Unit economics, budget, financial risks |
| **Editor** | Consolidates all outputs into a 5-page structured report |

If `GEMINI_API_KEY` is not set, the system falls back to a **Mock Generator** that produces a realistic sample report so the UI is always functional.

---

## Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/Ravshan1965/pfor-startup.git
cd pfor-startup
```

### 2. Create virtual environment and install dependencies
```bash
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Configure environment (optional)
```bash
# Copy the example env file and add your Gemini API key
cp .env.example .env
# Edit .env and set GEMINI_API_KEY=your_key_here
```

### 4. Run the backend
```bash
cd src
uvicorn pfor.main:app --reload --port 8000
```

### 5. Open the frontend
Open `frontend/index.html` in your browser or serve it via any static file server.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login and receive JWT token |
| `POST` | `/api/strategy/generate` | Generate a strategic report |
| `GET`  | `/api/strategy/reports` | List reports for current user |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | No | Google Gemini API key. Falls back to mock if not set. |
| `SECRET_KEY` | No | JWT signing secret (defaults to a random key) |
| `DATABASE_URL` | No | SQLite URL (defaults to `sqlite:///./pfor_local.db`) |

---

## Tech Stack

- **Backend**: Python 3.11+, FastAPI, SQLAlchemy, Pydantic v2
- **Database**: SQLite (via SQLAlchemy ORM)
- **AI**: Google Gemini API (`google-generativeai`)
- **Auth**: JWT (python-jose) + bcrypt (passlib)
- **Frontend**: Vanilla HTML5 / CSS3 / JavaScript (no framework)
