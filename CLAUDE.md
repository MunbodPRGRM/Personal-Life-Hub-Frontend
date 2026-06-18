# CLAUDE.md — Personal Life Hub (Angular Frontend)

## Project Overview

Angular 20 frontend สำหรับแอปจัดการชีวิตส่วนตัว (Personal Life Hub) เชื่อมต่อกับ Node.js/Express backend ที่รันอยู่ที่ port 5000

**Monorepo structure:**
```
D:\AllProject\Personal-Life-Hub\
├── Angular/   ← ไฟล์นี้อยู่ที่นี่ (frontend)
└── Nodejs/    ← backend (Express v5 + MySQL)
```

## Dev Commands

```bash
npm start          # ng serve → http://localhost:4200
npm run build      # production build
npm test           # karma unit tests
```

## Architecture

**Angular 20 Standalone Components** — ไม่ใช้ NgModule

- Standalone components ทุกตัว (`standalone: true` เป็น default ใน Angular 19+)
- SCSS สำหรับ styling (`styleUrl: './xxx.scss'`)
- `provideRouter` แทน `RouterModule`
- `HttpClient` ต้องใช้ `provideHttpClient()` ใน `app.config.ts`

**Request flow:** Component → Service (`HttpClient`) → Backend API

## Backend API Reference

Base URL: `http://localhost:5000`

**Response format ทุก endpoint:**
```json
{ "success": true, "data": {}, "message": "..." }
{ "success": false, "message": "..." }
```

**Auth (ไม่ต้อง token):**
| Method | Path | Body |
|--------|------|------|
| POST | `/api/auth/register` | `{ username, email, password }` |
| POST | `/api/auth/login` | `{ email, password }` → returns `token` |

**Todos (ต้องแนบ token):**
| Method | Path | Body |
|--------|------|------|
| GET | `/api/todos` | — |
| POST | `/api/todos` | `{ title, description?, due_date? }` |
| PUT | `/api/todos/:id` | `{ title?, description?, is_done?, due_date? }` |
| DELETE | `/api/todos/:id` | — |

**Planned endpoints (backend ยังไม่ได้สร้าง):**
- `/api/events` — Calendar events
- `/api/notes` — Notes
- `/api/goals` — Goals
- `/api/transactions` — Financial transactions
- `/api/reminders` — Reminders

**Auth header:** `Authorization: Bearer <token>`

JWT token เก็บใน `localStorage` key: `plh_token`

## Database Schema (reference)

```
users: id, username, email, password_hash, created_at
todos: id, user_id, title, description, is_done, due_date, priority(low/medium/high), created_at
events: id, user_id, title, description, start_datetime, end_datetime, color, created_at
notes: id, user_id, title, content, tags, created_at, updated_at
goals: id, user_id, title, description, target_date, progress(0-100), status(active/completed/cancelled), created_at
transactions: id, user_id, type(income/expense), amount, category, note, date, created_at
reminders: id, user_id, ref_type(todo/event/goal), ref_id, remind_at, is_sent, created_at
```

## Folder Structure (planned)

```
src/app/
├── core/
│   ├── services/
│   │   ├── auth.service.ts       # login, register, token management
│   │   ├── todo.service.ts
│   │   ├── event.service.ts
│   │   ├── note.service.ts
│   │   ├── goal.service.ts
│   │   └── transaction.service.ts
│   ├── guards/
│   │   └── auth.guard.ts         # redirect ถ้าไม่ได้ login
│   └── interceptors/
│       └── auth.interceptor.ts   # แนบ Bearer token อัตโนมัติ
├── features/
│   ├── auth/
│   │   ├── login/
│   │   └── register/
│   ├── dashboard/
│   ├── todos/
│   ├── calendar/
│   ├── notes/
│   ├── goals/
│   └── transactions/
└── shared/
    └── components/               # shared UI components
```

## Key Conventions

- **Standalone components** ทุกตัว — import ที่ component ไม่ใช่ module
- **`provideHttpClient(withInterceptors([authInterceptor]))`** ใน `app.config.ts`
- **Auth interceptor** แนบ token จาก `localStorage` ให้ทุก request โดยอัตโนมัติ
- **Auth guard** ป้องกัน route ที่ต้อง login — redirect ไป `/login` ถ้า token ไม่มี/หมดอายุ
- **Service** return `Observable` จาก `HttpClient` โดยตรง ไม่ subscribe ใน service
- **Error handling**: backend ส่ง 401 เมื่อ token หมดอายุ → interceptor จับแล้ว logout + redirect login
- SCSS ใช้สำหรับ styling ทุก component
- ใช้ `inject()` แทน constructor injection (Angular 14+)

## Pages To Build

**Phase 1 (ทำได้เลย — backend พร้อมแล้ว):**
1. `/login` — Login page
2. `/register` — Register page
3. `/todos` — Todo list (CRUD)

**Phase 2 (ต้องสร้าง backend routes ก่อน):**
4. `/dashboard` — Overview หน้าหลัก (summary ทุก feature)
5. `/calendar` — Calendar events
6. `/notes` — Notes
7. `/goals` — Goals + progress bar
8. `/transactions` — Income/expense tracker
