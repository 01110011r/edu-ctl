# CONTEXT.md — O'quv markazi Mini Management System

> Paste this file at the start of every AI session. Update the "Handoff" section at the end of each session.

## 1. Goal

Small, beautiful, intuitive web platform to manage staff (teachers), students and groups of a learning center.
Grading: UI design 35, UX 30, Responsive 15, Functionality 15, Code order 5.
**Out of scope:** payments, AI, complex analytics, extra modules. Keep it small and polished.

## 2. Stack (fixed, do not change)

- **Backend:** Python 3.11+, FastAPI, SQLModel (SQLAlchemy), SQLite, JWT auth (PyJWT), passlib[bcrypt]
- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui, lucide-react, sonner (toasts)
- **Rule:** Frontend is a client-side app. Use `"use client"` on pages. NO Server Components for data, NO Server Actions, NO Next API routes. All data comes from FastAPI at `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`).
- Do not add libraries without asking.

## 3. Repo layout

```
/backend
  app/main.py        # FastAPI app, CORS, routers
  app/models.py      # SQLModel tables
  app/schemas.py     # request/response models
  app/auth.py        # login, JWT, role guard dependency
  app/routers/       # auth.py teachers.py students.py groups.py lessons.py attendance.py dashboard.py
  app/db.py
  seed.py
  requirements.txt
/frontend
  app/login/
  app/(app)/layout.tsx          # sidebar + topbar, role guard
  app/(app)/dashboard/ teachers/ students/ groups/ schedule/ attendance/
  components/ui/                # shadcn
  components/shared/            # DataTable, FormModal, ConfirmDialog, EmptyState, TableSkeleton, PageHeader, StatusBadge
  lib/api.ts                    # fetch wrapper, adds Bearer token, handles 401
  lib/auth.ts                   # token + user in localStorage, useAuth()
  lib/types.ts
```

## 4. Data model

- **User**: id, email (unique), password_hash, role (`admin|teacher|student`), full_name
- **Teacher**: id, user_id (FK), phone, subject
- **Student**: id, user_id (FK), phone, group_id (FK, nullable), joined_at
- **Group**: id, name, teacher_id (FK), subject, level (optional)
- **Lesson**: id, group_id (FK), weekday (0=Mon..6=Sun), start_time, end_time, room
- **Attendance**: id, lesson_id (FK), student_id (FK), date, status (`present|absent|late`); unique (lesson_id, student_id, date)

Creating a Teacher/Student also creates its User (default password set by admin in the form).

## 5. Roles and permissions

| Feature | Admin | Teacher | Student |
| --- | --- | --- | --- |
| Teachers CRUD | yes | no | no |
| Students CRUD | yes | view own groups' students | no |
| Groups CRUD + assign teacher | yes | view own | view own |
| Schedule manage | yes | view own groups | view own group |
| Attendance mark | no (view all) | own groups only | view own history only |
| Dashboard | counters + today's lessons | own groups + today's lessons | own next lessons + attendance summary |

Sidebar shows only the pages allowed for the role. Backend enforces the same rules (403).

## 6. API contract (prefix `/api`, JSON, `Authorization: Bearer <jwt>`)

All list responses return plain JSON arrays. Standard error response format is `{"detail": "message"}`.

### 6.1 Authentication (`/api/auth`)

#### `POST /api/auth/login`
- **Roles:** Public
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "access_token": "string",
    "token_type": "bearer",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "full_name": "Full Name",
      "role": "admin" // "admin" | "teacher" | "student"
    }
  }
  ```
- **Errors:**
  - `401 Unauthorized`: `{"detail": "Invalid email or password"}`

#### `GET /api/auth/me`
- **Roles:** `admin`, `teacher`, `student`
- **Headers:** `Authorization: Bearer <jwt>`
- **Response (200 OK):**
  ```json
  {
    "id": 1,
    "email": "user@example.com",
    "full_name": "Full Name",
    "role": "admin"
  }
  ```
- **Errors:**
  - `401 Unauthorized`: `{"detail": "Not authenticated"}` | `{"detail": "Could not validate credentials"}` | `{"detail": "Token has expired"}` | `{"detail": "User not found"}`

---

### 6.2 Teachers (`/api/teachers`)

#### `GET /api/teachers`
- **Roles:** `admin`
- **Query Params:** `search` (optional string, matches `full_name`, `email`, `phone`, or `subject`)
- **Response (200 OK):**
  ```json
  [
    {
      "id": 1,
      "user_id": 2,
      "full_name": "Anvar Qodirov",
      "email": "teacher1@demo.uz",
      "phone": "+998901234567",
      "subject": "Ingliz tili"
    }
  ]
  ```

#### `GET /api/teachers/{id}`
- **Roles:** `admin`
- **Response (200 OK):** single Teacher object (same as above)
- **Errors:**
  - `404 Not Found`: `{"detail": "Teacher not found"}`

#### `POST /api/teachers`
- **Roles:** `admin`
- **Request Body:**
  ```json
  {
    "full_name": "Anvar Qodirov",
    "email": "teacher1@demo.uz",
    "password": "password123",
    "phone": "+998901234567",
    "subject": "Ingliz tili"
  }
  ```
- **Response (201 Created):** single Teacher object
- **Errors:**
  - `409 Conflict`: `{"detail": "Email is already registered"}`

#### `PUT /api/teachers/{id}`
- **Roles:** `admin`
- **Request Body:** (all fields optional, password updated only if provided)
  ```json
  {
    "full_name": "Anvar Qodirov",
    "email": "newemail@demo.uz",
    "password": "newpassword123",
    "phone": "+998901234567",
    "subject": "IELTS"
  }
  ```
- **Response (200 OK):** updated Teacher object
- **Errors:**
  - `404 Not Found`: `{"detail": "Teacher not found"}` | `{"detail": "Associated user not found"}`
  - `409 Conflict`: `{"detail": "Email is already taken"}`

#### `DELETE /api/teachers/{id}`
- **Roles:** `admin`
- **Response (200 OK):** `{"detail": "Teacher deleted successfully"}`
- **Errors:**
  - `404 Not Found`: `{"detail": "Teacher not found"}`
  - `400 Bad Request`: `{"detail": "Cannot delete teacher assigned to active groups. Reassign or delete groups first."}`

---

### 6.3 Students (`/api/students`)

#### `GET /api/students`
- **Roles:** `admin` (all), `teacher` (own groups only)
- **Query Params:**
  - `search`: optional string (matches `full_name`, `email`, or `phone`)
  - `group_id`: optional integer (filters by group; teachers can only filter by their own groups)
- **Response (200 OK):**
  ```json
  [
    {
      "id": 1,
      "user_id": 7,
      "full_name": "Rustam Ibragimov",
      "email": "student1@demo.uz",
      "phone": "+998901000000",
      "group_id": 1, // integer | null
      "group_name": "IELTS 6.5 - Ertalab", // string | null
      "joined_at": "2026-09-01" // "YYYY-MM-DD"
    }
  ]
  ```

#### `GET /api/students/{id}`
- **Roles:** `admin`, `teacher` (own groups only)
- **Response (200 OK):** single Student object
- **Errors:**
  - `404 Not Found`: `{"detail": "Student not found"}`
  - `403 Forbidden`: `{"detail": "Forbidden: Student does not belong to your groups"}`

#### `POST /api/students`
- **Roles:** `admin`
- **Request Body:**
  ```json
  {
    "full_name": "Rustam Ibragimov",
    "email": "student1@demo.uz",
    "password": "password123",
    "phone": "+998901000000",
    "group_id": 1, // integer | null
    "joined_at": "2026-09-01" // optional date "YYYY-MM-DD", defaults to today
  }
  ```
- **Response (201 Created):** single Student object
- **Errors:**
  - `409 Conflict`: `{"detail": "Email is already registered"}`
  - `404 Not Found`: `{"detail": "Group not found"}`

#### `PUT /api/students/{id}`
- **Roles:** `admin`
- **Request Body:** (all fields optional, password updated only if provided)
  ```json
  {
    "full_name": "string",
    "email": "string",
    "password": "string",
    "phone": "string",
    "group_id": 1, // integer | null
    "joined_at": "YYYY-MM-DD"
  }
  ```
- **Response (200 OK):** updated Student object
- **Errors:**
  - `404 Not Found`: `{"detail": "Student not found"}` | `{"detail": "Associated user not found"}` | `{"detail": "Group not found"}`
  - `409 Conflict`: `{"detail": "Email is already taken"}`

#### `DELETE /api/students/{id}`
- **Roles:** `admin`
- **Response (200 OK):** `{"detail": "Student deleted successfully"}`
- **Errors:**
  - `404 Not Found`: `{"detail": "Student not found"}`

---

### 6.4 Groups (`/api/groups`)

#### `GET /api/groups`
- **Roles:** `admin` (all), `teacher` (own groups), `student` (own group)
- **Query Params:** `search` (optional string, matches `name` or `subject`)
- **Response (200 OK):**
  ```json
  [
    {
      "id": 1,
      "name": "IELTS 6.5 - Ertalab",
      "subject": "Ingliz tili",
      "level": "Upper-Intermediate", // string | null
      "teacher_id": 1,
      "teacher_name": "Anvar Qodirov",
      "student_count": 5
    }
  ]
  ```

#### `GET /api/groups/{id}`
- **Roles:** `admin`, `teacher` (own group only), `student` (own group only)
- **Response (200 OK):**
  ```json
  {
    "id": 1,
    "name": "IELTS 6.5 - Ertalab",
    "subject": "Ingliz tili",
    "level": "Upper-Intermediate",
    "teacher_id": 1,
    "teacher_name": "Anvar Qodirov",
    "student_count": 5,
    "teacher": {
      "id": 1,
      "user_id": 2,
      "full_name": "Anvar Qodirov",
      "email": "teacher1@demo.uz",
      "phone": "+998901234567",
      "subject": "Ingliz tili"
    },
    "students": [
      {
        "id": 1,
        "user_id": 7,
        "full_name": "Rustam Ibragimov",
        "email": "student1@demo.uz",
        "phone": "+998901000000",
        "group_id": 1,
        "group_name": "IELTS 6.5 - Ertalab",
        "joined_at": "2026-09-01"
      }
    ]
  }
  ```
- **Errors:**
  - `404 Not Found`: `{"detail": "Group not found"}` | `{"detail": "Assigned teacher not found"}`
  - `403 Forbidden`: `{"detail": "Forbidden: You can only view your own groups"}`
  - `403 Forbidden`: `{"detail": "Forbidden: You can only view your own group"}`

#### `POST /api/groups`
- **Roles:** `admin`
- **Request Body:**
  ```json
  {
    "name": "Python Boshlang'ich",
    "subject": "Dasturlash",
    "level": "Beginner", // optional string
    "teacher_id": 3
  }
  ```
- **Response (201 Created):** single Group object (`student_count: 0`)
- **Errors:**
  - `404 Not Found`: `{"detail": "Assigned teacher not found"}`

#### `PUT /api/groups/{id}`
- **Roles:** `admin`
- **Request Body:** (all fields optional)
  ```json
  {
    "name": "string",
    "subject": "string",
    "level": "string",
    "teacher_id": 1
  }
  ```
- **Response (200 OK):** updated Group object
- **Errors:**
  - `404 Not Found`: `{"detail": "Group not found"}` | `{"detail": "Assigned teacher not found"}`

#### `DELETE /api/groups/{id}`
- **Roles:** `admin`
- **Response (200 OK):** `{"detail": "Group and its lessons deleted successfully"}`
- **Errors:**
  - `404 Not Found`: `{"detail": "Group not found"}`
  - `400 Bad Request`: `{"detail": "Cannot delete group with enrolled students. Reassign or remove students first."}`

---

### 6.5 Lessons (`/api/lessons`)

#### `GET /api/lessons`
- **Roles:** `admin` (all), `teacher` (own groups), `student` (own group)
- **Query Params:** `group_id` (optional integer)
- **Response (200 OK):**
  ```json
  [
    {
      "id": 1,
      "group_id": 1,
      "group_name": "IELTS 6.5 - Ertalab",
      "teacher_name": "Anvar Qodirov",
      "weekday": 0, // 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
      "start_time": "09:00", // "HH:MM"
      "end_time": "10:30", // "HH:MM"
      "room": "101"
    }
  ]
  ```

#### `GET /api/lessons/{id}`
- **Roles:** `admin`, `teacher` (own groups), `student` (own group)
- **Response (200 OK):** single Lesson object
- **Errors:**
  - `404 Not Found`: `{"detail": "Lesson not found"}`
  - `403 Forbidden`: `{"detail": "Forbidden: You can only view lessons for your own groups"}`
  - `403 Forbidden`: `{"detail": "Forbidden: You can only view lessons for your own group"}`

#### `POST /api/lessons`
- **Roles:** `admin`
- **Request Body:**
  ```json
  {
    "group_id": 1,
    "weekday": 0,
    "start_time": "09:00",
    "end_time": "10:30",
    "room": "101"
  }
  ```
- **Response (201 Created):** single Lesson object
- **Errors:**
  - `422 Unprocessable Entity`: `{"detail": "end_time must be after start_time"}` | `{"detail": "weekday must be between 0 (Monday) and 6 (Sunday)"}`
  - `404 Not Found`: `{"detail": "Group not found"}`
  - `409 Conflict`: `{"detail": "Room conflict: Room '{room}' already has a lesson from {start} to {end} on this weekday"}`
  - `409 Conflict`: `{"detail": "Teacher conflict: Teacher is already scheduled for another group from {start} to {end} on this weekday"}`

#### `PUT /api/lessons/{id}`
- **Roles:** `admin`
- **Request Body:** (all fields optional)
  ```json
  {
    "group_id": 1,
    "weekday": 0,
    "start_time": "09:00",
    "end_time": "10:30",
    "room": "101"
  }
  ```
- **Response (200 OK):** updated Lesson object
- **Errors:**
  - `404 Not Found`: `{"detail": "Lesson not found"}` | `{"detail": "Group not found"}`
  - `422 Unprocessable Entity`: `{"detail": "end_time must be after start_time"}`
  - `409 Conflict`: Room conflict or Teacher conflict

#### `DELETE /api/lessons/{id}`
- **Roles:** `admin`
- **Response (200 OK):** `{"detail": "Lesson deleted successfully"}`
- **Errors:**
  - `404 Not Found`: `{"detail": "Lesson not found"}`

---

### 6.6 Attendance (`/api/attendance`)

#### `GET /api/attendance`
- **Roles:** `admin` (all), `teacher` (own groups only)
- **Query Params:**
  - `lesson_id`: integer (required)
  - `date`: string `"YYYY-MM-DD"` (required)
- **Response (200 OK):**
  ```json
  [
    {
      "student_id": 1,
      "student_name": "Rustam Ibragimov",
      "phone": "+998901000000",
      "status": "present" // "present" | "absent" | "late" | null
    }
  ]
  ```
- **Errors:**
  - `404 Not Found`: `{"detail": "Lesson not found"}` | `{"detail": "Associated group not found"}`
  - `403 Forbidden`: `{"detail": "Forbidden: You can only view attendance for your own groups"}`

#### `PUT /api/attendance/bulk`
- **Roles:** `teacher` (own groups only)
- **Request Body:**
  ```json
  {
    "lesson_id": 1,
    "date": "2026-11-19",
    "records": [
      {
        "student_id": 1,
        "status": "present" // "present" | "absent" | "late"
      }
    ]
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "detail": "Attendance saved successfully",
    "count": 1
  }
  ```
- **Errors:**
  - `403 Forbidden`: `{"detail": "Forbidden: Teacher profile not found"}`
  - `404 Not Found`: `{"detail": "Lesson not found"}` | `{"detail": "Associated group not found"}`
  - `403 Forbidden`: `{"detail": "Forbidden: Lesson does not belong to your group"}`
  - `400 Bad Request`: `{"detail": "Date weekday ({date_weekday}) does not match lesson weekday ({lesson_weekday})"}`
  - `400 Bad Request`: `{"detail": "Student with ID {id} is not enrolled in group '{group_name}'"}`
  - `422 Unprocessable Entity`: `{"detail": "status must be 'present', 'absent', or 'late'"}`

#### `GET /api/attendance/me`
- **Roles:** `student` only
- **Response (200 OK):**
  ```json
  {
    "history": [
      {
        "id": 12,
        "date": "2026-11-18",
        "status": "present",
        "group_name": "IELTS 6.5 - Ertalab",
        "start_time": "09:00",
        "end_time": "10:30"
      }
    ],
    "summary": {
      "present": 10,
      "late": 1,
      "absent": 1,
      "percent": 83.3 // float: (present / total) * 100
    }
  }
  ```
- **Errors:**
  - `404 Not Found`: `{"detail": "Student profile not found"}`

---

### 6.7 Dashboard (`/api/dashboard`)

#### `GET /api/dashboard`
- **Roles:** `admin`, `teacher`, `student`

**Admin Response (200 OK):**
```json
{
  "role": "admin",
  "counts": {
    "teachers": 5,
    "students": 30,
    "groups": 6,
    "lessons_this_week": 18
  },
  "today_lessons": [
    {
      "id": 1,
      "group_id": 1,
      "group_name": "IELTS 6.5 - Ertalab",
      "teacher_name": "Anvar Qodirov",
      "weekday": 3,
      "start_time": "09:00",
      "end_time": "10:30",
      "room": "101"
    }
  ]
}
```

**Teacher Response (200 OK):**
```json
{
  "role": "teacher",
  "counts": {
    "groups": 2,
    "students": 10
  },
  "today_lessons": [
    {
      "id": 1,
      "group_id": 1,
      "group_name": "IELTS 6.5 - Ertalab",
      "teacher_name": "Anvar Qodirov",
      "weekday": 3,
      "start_time": "09:00",
      "end_time": "10:30",
      "room": "101",
      "attendance_marked": true // boolean
    }
  ]
}
```

**Student Response (200 OK):**
```json
{
  "role": "student",
  "group": {
    "id": 1,
    "name": "IELTS 6.5 - Ertalab",
    "subject": "Ingliz tili",
    "level": "Upper-Intermediate"
  },
  "teacher": {
    "id": 1,
    "full_name": "Anvar Qodirov",
    "email": "teacher1@demo.uz",
    "phone": "+998901234567",
    "subject": "Ingliz tili"
  },
  "next_lessons": [
    {
      "id": 1,
      "group_id": 1,
      "group_name": "IELTS 6.5 - Ertalab",
      "teacher_name": "Anvar Qodirov",
      "weekday": 0,
      "start_time": "09:00",
      "end_time": "10:30",
      "room": "101",
      "date": "2026-11-23" // upcoming occurrence date YYYY-MM-DD
    }
  ],
  "attendance_summary": {
    "present": 8,
    "late": 1,
    "absent": 1,
    "percent": 80.0
  }
}
```

---

## 7. Design system (single source of truth)

- **Style:** minimal, modern, lots of whitespace, soft shadows, rounded-xl, subtle borders.
- **Colors:** primary indigo `#4F46E5` (hover `#4338CA`), background `#F8FAFC`, surface `#FFFFFF`, border `#E2E8F0`, text `#0F172A`, muted `#64748B`. Status: success `#16A34A`, warning `#F59E0B`, danger `#DC2626`.
- **Font:** Inter. Page title 24/32 semibold, section 18/28 semibold, body 14/20, caption 12/16.
- **Spacing:** 4px grid; page padding 24 desktop, 16 mobile; card padding 20.
- **Layout:** fixed left sidebar (240px) on desktop, drawer on mobile, topbar with page title + user menu.
- **Every list page must have:** PageHeader with primary action button, search input, filters where useful, loading skeleton, EmptyState with icon + CTA, success/error toast, delete confirm dialog.
- **Forms:** add/edit in a modal (shadcn Dialog), inline validation, disabled submit while saving.
- **Responsive:** tables become stacked cards below `md`; modals become full-width bottom sheets on mobile.
- **Attendance UI:** one-tap segmented toggle (Present / Late / Absent) per student, "Mark all present" button, sticky Save bar.
- **Schedule UI:** weekly grid on desktop (Mon–Sat columns, time rows), day-tabs list on mobile.

## 8. Demo data (`seed.py`)

Deterministic demo dataset generated by `backend/seed.py`:
- **Counts:**
  - 1 Admin user
  - 5 Teachers: 5 distinct subjects (`Ingliz tili`, `Matematika`, `Dasturlash`, `Rus tili`, `Fizika`)
  - 6 Groups: level-graded, assigned to teachers (Teacher 1 has 2 groups, Teachers 2-5 have 1 group each)
  - 30 Students: 5 students per group (`student1` is in Group 1 taught by `teacher1`)
  - 18 Weekly Lessons: collision-free schedule across rooms `101`, `102`, and `Lab`
  - ~180 Attendance Records: 14-day history for completed lessons (~77% present, ~11% late, ~12% absent)
- **Credentials:**
  - Password for all accounts: `demo1234`
  - Admin: `admin@demo.uz`
  - Teachers: `teacher1@demo.uz` ... `teacher5@demo.uz`
  - Students: `student1@demo.uz` ... `student30@demo.uz`

## 9. Run Instructions

### Backend Quickstart
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python seed.py
uvicorn app.main:app --reload --port 8000
```
- API Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health check: [http://localhost:8000/api/health](http://localhost:8000/api/health)

## 10. Working rules for AI

1. One task per prompt; state the file path you are editing.
2. Follow this file exactly: stack, names, endpoints, design tokens.
3. Copy existing patterns (e.g. "same as Teachers page") instead of inventing new ones.
4. Return full file contents for new files; for edits, show only the changed parts with clear location.
5. Do not add features outside the TZ.

## 11. Handoff (update after each session)

- **Done:**
  - Base architecture: `db.py` (SQLite foreign keys enabled), `models.py` (all SQLModel tables), `auth.py` (JWT + bcrypt + role guards), `schemas.py`.
  - Auth router: `POST /api/auth/login`, `GET /api/auth/me`.
  - Teachers router: full CRUD with email uniqueness and assigned-group delete guard.
  - Students router: full CRUD with teacher-group isolation and email uniqueness.
  - Groups router: full CRUD, roster retrieval, and enrolled-student delete guard.
  - Lessons router: full CRUD, room/teacher collision checks, timing validation (`end_time > start_time`).
  - Attendance router: sheet retrieval (`status: null` unmarked), bulk upsert, student history and statistics.
  - Dashboard router: role-tailored dashboards for Admin, Teacher, and Student.
  - Seeding script: `seed.py` with reproducible data, clean table drop/recreation, and CLI summary.
- **Next:** Frontend implementation (auth flow, layout shell, dashboards, and CRUD views).
- **Known bugs:** None. All backend routes validated with comprehensive test suites.
