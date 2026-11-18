# CONTEXT.md — O'quv markazi Mini Management System

> Paste this file at the start of every AI session. Update the "Handoff" section at the end of each session.

## 1. Goal

Small, beautiful, intuitive web platform to manage staff (teachers), students and groups of a learning center.
Grading: UI design 35, UX 30, Responsive 15, Functionality 15, Code order 5.
**Out of scope:** payments, AI, complex analytics, extra modules. Keep it small and polished.

## 2. Stack (fixed, do not change)

- **Backend:** Python 3.11+, FastAPI, SQLModel (SQLAlchemy), SQLite, JWT auth (python-jose / PyJWT), passlib[bcrypt]
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

```
POST   /auth/login                {email, password} -> {access_token, user:{id,email,full_name,role}}
GET    /auth/me                   -> user

GET    /teachers?search=          admin
POST   /teachers                  admin   {full_name,email,password,phone,subject}
PUT    /teachers/{id}             admin
DELETE /teachers/{id}             admin

GET    /students?search=&group_id=   admin, teacher(own groups)
POST   /students                  admin   {full_name,email,password,phone,group_id}
PUT    /students/{id}             admin
DELETE /students/{id}             admin

GET    /groups?search=            admin, teacher(own), student(own)
POST   /groups                    admin   {name,subject,level,teacher_id}
PUT    /groups/{id}               admin
DELETE /groups/{id}               admin
GET    /groups/{id}               group + teacher + students

GET    /lessons?group_id=         role-filtered
POST   /lessons                   admin   {group_id,weekday,start_time,end_time,room}
PUT    /lessons/{id}              admin
DELETE /lessons/{id}              admin

GET    /attendance?lesson_id=&date=      teacher(own)/admin: list for a lesson+date
PUT    /attendance/bulk           teacher  {lesson_id,date,records:[{student_id,status}]}
GET    /attendance/me             student: own history

GET    /dashboard                 role-specific counters and today's lessons
```

Errors: `{ "detail": "message" }` with proper status codes. Lists return plain arrays.

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

## 8. Demo data (seed.py)

1 admin, 5 teachers, ~30 students, 6 groups, ~15 weekly lessons, 2 weeks of attendance history.
Logins (password for all: `demo1234`): `admin@demo.uz`, `teacher1@demo.uz`, `student1@demo.uz`.

## 9. Working rules for AI

1. One task per prompt; state the file path you are editing.
2. Follow this file exactly: stack, names, endpoints, design tokens.
3. Copy existing patterns (e.g. "same as Teachers page") instead of inventing new ones.
4. Return full file contents for new files; for edits, show only the changed parts with clear location.
5. Do not add features outside the TZ.

## 10. Handoff (update after each session)

- Done: Phase 1 backend setup (db.py, models.py, auth.py, schemas.py, main.py, routers/auth.py)
- Next: Phase 2 backend routers (teachers, students, groups, lessons, attendance, dashboard) and seed.py
- Known bugs: —
