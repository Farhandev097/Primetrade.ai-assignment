# Taskly — Full Stack Task Manager

A full-stack task management application with JWT authentication, scheduled reminders via BullMQ + Redis, and webhook notifications.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript (Vite) |
| Backend | Node.js + Express + TypeScript |
| Primary DB | PostgreSQL (via Prisma — users) |
| Secondary DB | MongoDB (via Mongoose — tasks) |
| Queue | BullMQ + Redis |
| Auth | JWT |

---

## Project Structure

```
├── backend/          # Express API
│   ├── router/
│   │   ├── userRouter.ts
│   │   └── taskRouter.ts
│   ├── model/
│   │   └── taskModel.ts
│   ├── middleware/
│   │   └── authMiddleware.ts
│   ├── services/
│   │   ├── notificationService.ts
│   │   └── reminderQueue.ts
│   └── index.ts
│
└── frontend/         # React + TypeScript
    └── src/
        └── App.tsx
```

---

## Getting Started

### Prerequisites

Make sure you have the following installed:

- Node.js (v18+)
- pnpm
- npm
- MongoDB (local or Atlas)
- PostgreSQL
- Redis (local or cloud)

---

## Backend Setup

### 1. Install dependencies

```bash
cd backend
pnpm install
```

### 2. Configure environment variables

Create a `.env` file in the `backend/` directory:

```bash
cp .env.example .env
```

Then fill in your values (see [Environment Variables](#environment-variables) below).

### 3. Run Prisma migrations

```bash
pnpm prisma migrate dev
```

### 4. Start the backend server

```bash
pnpm run start
```

The server will start on `http://localhost:3005` (or the `PORT` you set in `.env`).

---

## Frontend Setup

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Start the development server

```bash
npm run dev
```

The frontend will start on `http://localhost:5173` by default.

---

## Environment Variables

Create a `.env` file in the `backend/` directory using the example below.

### `.env.example`

```env
# ─── Server ────────────────────────────────────────────────
PORT=3005

# ─── JWT ───────────────────────────────────────────────────
# Secret key used to sign and verify JWT tokens
# Use a long, random string — e.g. openssl rand -hex 64
JWT_SECRET=your_super_secret_jwt_key_here

# ─── PostgreSQL (Prisma — Users) ───────────────────────────
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_URL=postgresql://postgres:password@localhost:5432/taskly_db

# ─── MongoDB (Mongoose — Tasks) ────────────────────────────
# Format: mongodb://HOST:PORT/DATABASE  or  mongodb+srv://... for Atlas
MONGODB_URI=mongodb://localhost:27017/taskly_tasks

# ─── Redis (BullMQ — Reminder Queue) ───────────────────────
REDIS_HOST=localhost
REDIS_PORT=6379
# Leave blank if your Redis has no password
REDIS_PASSWORD=

# ─── Webhooks ──────────────────────────────────────────────
# Called when a task reminder fires (1 hour before due date)
REMINDER_WEBHOOK_URL=https://your-domain.com/webhooks/reminder

# Called when a task is marked as completed
ANALYTICS_WEBHOOK_URL=https://your-domain.com/webhooks/analytics
```

---

## API Endpoints

### Auth — `/api/user`

| Method | Route | Description | Auth required |
|---|---|---|---|
| POST | `/api/user/signup` | Register a new user | No |
| POST | `/api/user/signin` | Sign in and get JWT token | No |

### Tasks — `/api/task`

| Method | Route | Description | Auth required |
|---|---|---|---|
| GET | `/api/task/all-task` | Get all tasks for logged-in user | Yes |
| POST | `/api/task/new-task` | Create a new task | Yes |
| PUT | `/api/task/update-task` | Update a task (title, status, due date, etc.) | Yes |
| DELETE | `/api/task/delete-task` | Delete a task | Yes |
| GET | `/api/task/filter` | Filter tasks by `category` and/or `tags` | Yes |
| POST | `/api/task/category` | Get tasks by category | Yes |

All protected routes require an `Authorization: Bearer <token>` header.

---

## Webhook Payloads

### Reminder webhook (`REMINDER_WEBHOOK_URL`)

Fired 1 hour before a task's due date:

```json
{
  "event": "task_reminder",
  "timestamp": "2025-04-21T10:00:00.000Z",
  "data": {
    "taskId": "abc123",
    "userId": "1",
    "title": "Finish report",
    "description": "Complete Q4 report",
    "dueDate": "2025-04-21T11:00:00+05:30",
    "notificationType": "reminder"
  }
}
```

### Analytics webhook (`ANALYTICS_WEBHOOK_URL`)

Fired when a task is marked as completed:

```json
{
  "event": "task_completed",
  "timestamp": "2025-04-21T10:30:00.000Z",
  "data": {
    "taskId": "abc123",
    "userId": "1",
    "title": "Finish report",
    "completedAt": "2025-04-21T10:30:00+05:30"
  }
}
```

---

## Scripts

### Backend

| Command | Description |
|---|---|
| `pnpm run start` | Start the backend server |
| `pnpm prisma migrate dev` | Run Prisma DB migrations |
| `pnpm prisma studio` | Open Prisma GUI |

### Frontend

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview the production build |

---

## Notes

- Make sure **MongoDB**, **PostgreSQL**, and **Redis** are all running before starting the backend.
- The reminder queue uses BullMQ and schedules a job 1 hour before each task's due date. If the server restarts, jobs persisted in Redis will continue as expected.
- CORS is enabled for all origins in development. Restrict it before deploying to production.
