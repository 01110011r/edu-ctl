# Edu-Ctl Backend

FastAPI backend for **O'quv markazi Mini Management System** with SQLModel (SQLite) and JWT Authentication.

---

## 🛠 Tech Stack

- **Python:** 3.11+ (tested on Python 3.12)
- **Framework:** FastAPI
- **ORM / Database:** SQLModel (SQLAlchemy) with SQLite
- **Authentication:** JWT (`PyJWT`), password hashing (`passlib[bcrypt]`)
- **Server:** Uvicorn

---

## 🚀 Quickstart

### 1. Navigate to the backend directory

```bash
cd backend
```

### 2. Create and activate a virtual environment

On Linux / macOS:
```bash
python3 -m venv venv
source venv/bin/activate
```

On Windows:
```cmd
python -m venv venv
venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

---

## ⚙️ Configuration (Optional)

The backend works out-of-the-box with sensible defaults. You can optionally customize settings using environment variables:

| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET` | `edu-ctl-jwt-secret-key-replace-in-production-2026` | Secret key for signing JWT tokens |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `10080` (7 days) | Access token expiration in minutes |

---

## ▶️ Running the Backend Server

Start the development server with live reload:

```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at:
- **Base URL:** `http://localhost:8000`
- **Health Check:** `http://localhost:8000/api/health`
- **Interactive Swagger Docs:** `http://localhost:8000/docs`
- **Alternative ReDoc:** `http://localhost:8000/redoc`

> [!NOTE]
> Database tables are automatically initialized and created in `database.db` upon server startup.

---

## 🧪 Testing Authentication at `/docs`

1. Open [http://localhost:8000/docs](http://localhost:8000/docs) in your browser.
2. Expand the `POST /api/auth/login` endpoint and click **Try it out**.
3. Send a login payload in the request body:
   ```json
   {
     "email": "admin@demo.uz",
     "password": "demo1234"
   }
   ```
4. Click **Execute**. You will receive an HTTP 200 response with `access_token` and `user` data.
5. Copy the `access_token` from the response body.
6. Scroll to the top and click the green **Authorize** button.
7. Paste your token into the **Value** field and click **Authorize**, then **Close**.
8. Test the protected endpoint:
   - Expand `GET /api/auth/me`
   - Click **Try it out** and **Execute**
   - The response will return the authenticated user's profile.

---

## 📁 Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py        # FastAPI app, CORS, lifespan startup, router inclusion
│   ├── models.py      # SQLModel table definitions (User, Teacher, Student, Group, Lesson, Attendance)
│   ├── schemas.py     # Pydantic request/response models
│   ├── auth.py        # Password hashing, JWT utils, get_current_user, require_role
│   ├── db.py          # SQLite engine, session dependency, PRAGMA foreign keys
│   └── routers/
│       ├── __init__.py
│       └── auth.py    # POST /api/auth/login, GET /api/auth/me
├── database.db        # SQLite database (auto-generated)
└── requirements.txt
```
