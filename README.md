# Edu-Ctl — O'quv Markazi Mini Management System

A web platform to manage staff (teachers), students, groups, lessons, and attendance of a learning center.

## Project Structure

- [`/backend`](file:///home/rss/Desktop/Code/edu-ctl/backend): FastAPI backend with SQLModel, SQLite, and JWT authentication.
- [`/frontend`](file:///home/rss/Desktop/Code/edu-ctl/frontend): Next.js 15 (App Router), Tailwind CSS, shadcn/ui.

---

## Backend Quickstart

For full details, see the [Backend README](file:///home/rss/Desktop/Code/edu-ctl/backend/README.md).

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

- API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health Check: [http://localhost:8000/api/health](http://localhost:8000/api/health)
