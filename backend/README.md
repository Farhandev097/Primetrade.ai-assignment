# 📝 Task Management API with Smart Reminders

A robust task management API built with Express.js and TypeScript, featuring intelligent reminder notifications powered by Redis and BullMQ.


---

##Testing Vedio
- https://drive.google.com/file/d/1SFrNJmn_UuXwWdGuT54r0nZfpINPepAT/view?usp=sharing

</div>

---

## ✨ Features

### Core Functionality
- 🔐 **User Authentication** - Secure signup/signin with JWT and bcrypt
- ✅ **Task Management** - Create, read, update, and delete tasks
- 🏷️ **Categorization** - Organize tasks with categories and tags
- 🔍 **Advanced Filtering** - Filter tasks by category, tags, and status
- ⏰ **Smart Reminders** - Automated notifications before task due dates
- 🔔 **Real-time Notifications** - Task completion alerts and due date reminders

### Technical Highlights
- 📊 **Queue-based Processing** - BullMQ for reliable background job execution
- 🚀 **High Performance** - Redis for fast caching and job queuing
- 🛡️ **Type Safety** - Full TypeScript implementation with Zod validation
- 🗄️ **Dual Database** - PostgreSQL (Prisma) for users, MongoDB for tasks
- ⚡ **Async Processing** - Non-blocking reminder scheduling and notifications

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Runtime** | Node.js (v18+) |
| **Language** | TypeScript 6.0 |
| **Framework** | Express.js 5.2 |
| **Databases** | PostgreSQL (Users) + MongoDB (Tasks) |
| **ORM** | Prisma 7.7 |
| **Queue System** | BullMQ 5.73 |
| **Cache/Queue** | Redis (via ioredis) |
| **Authentication** | JWT + bcrypt |
| **Validation** | Zod 4.3 |
| **Date Handling** | Day.js with timezone support |
| **Package Manager** | pnpm 10.33 |

---

## 📦 Installation

### Prerequisites

- **Node.js** (v18 or higher)
- **pnpm** (v10.33 or higher)
- **PostgreSQL** (for user management)
- **MongoDB** (for task storage)
- **Redis** (for job queuing)

### 1. Clone the Repository

```bash
git clone https://github.com/Farhandev097/conversely-assigment.git
cd conversely-assigment
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3005

# PostgreSQL Database (Prisma)
DATABASE_URL="POSTGRESS_DATABASE"

# MongoDB Database
MONGODB_URI="MONGODB_DATABASE"

# JWT Secret
JWT_SECRET="your-super-secret-jwt-key-change-this"

#WEBHOOK LINK
REMINDER_WEBHOOK_URL=YOUR_WEBHOOK_LINK
ANALYTICS_WEBHOOK_URL=YOUR_WEBHOOK_LINK


```

### 4. Database Setup

#### PostgreSQL (Prisma)

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init
```

#### MongoDB

Ensure MongoDB is running on `localhost:27017` or update the connection string in your `.env`.

### 5. Start Redis

#### Using Docker (Recommended)

```bash
# Pull the latest Redis image
docker pull redis:latest

# Run Redis container
docker run -d \
  --name task-redis \
  -p 6379:6379 \
  redis:latest

# Run with password protection (recommended for production)
docker run -d \
  --name task-redis \
  -p 6379:6379 \
  redis:latest redis-server --requirepass yourpassword

# View Redis logs
docker logs -f task-redis

# Connect to Redis CLI
docker exec -it task-redis redis-cli

# Stop Redis
docker stop task-redis

# Remove Redis container
docker rm task-redis
```

#### Using Redis Locally

```bash
# macOS (Homebrew)
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

### 6. Start the Server

```bash
# Development mode
pnpm start

# The server will run on http://localhost:3005
```

---

## 📚 API Documentation

### Base URL
```
http://localhost:3005/api
```

### Authentication

All task-related endpoints require JWT authentication. Include the token in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

---

### 👤 User Routes

#### 1. Sign Up

**Endpoint:** `POST /api/user/signup`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "message": "User Registered Successfully",
  "newUser": {
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

---

#### 2. Sign In

**Endpoint:** `POST /api/user/signin`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### ✅ Task Routes

#### 1. Get All Tasks

**Endpoint:** `GET /api/task/all-task`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "tasks": [
    {
      "_id": "task_id",
      "userId": "user_id",
      "title": "Complete project",
      "description": "Finish the API documentation",
      "dueDate": "2026-04-20T10:00:00.000Z",
      "status": "pending",
      "category": "work",
      "tags": ["urgent", "api"]
    }
  ]
}
```

---

#### 2. Create New Task

**Endpoint:** `POST /api/task/new-task`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title": "Complete project",
  "description": "Finish the API documentation",
  "dueDate": "2026-04-20T10:00:00.000Z",
  "category": "work",
  "tags": ["urgent", "api"]
}
```

**Features:**
- ✅ Automatically schedules reminder notification 1 hour before due date
- ✅ Converts due date to Asia/Kolkata timezone
- ✅ Validates input with Zod schema

**Response:**
```json
{
  "newTask": {
    "_id": "task_id",
    "title": "Complete project",
    "description": "Finish the API documentation",
    "dueDate": "2026-04-20T15:30:00+05:30",
    "status": "pending",
    "category": "work",
    "tags": ["urgent", "api"]
  },
  "message": "Task Created Successfully"
}
```

---

#### 3. Update Task

**Endpoint:** `PUT /api/task/update-task`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "taskId": "task_id_here",
  "title": "Updated title",
  "status": "completed",
  "dueDate": "2026-04-25T10:00:00.000Z"
}
```

**Smart Features:**
- 🔄 Reschedules reminder if due date is updated
- ❌ Cancels reminder if task is marked completed
- 🔔 Sends completion notification when status changes to "completed"

**Response:**
```json
{
  "updatedData": {
    "_id": "task_id",
    "title": "Updated title",
    "status": "completed",
    "dueDate": "2026-04-25T10:00:00.000Z"
  },
  "message": "Task Updated Successfully"
}
```

---

#### 4. Delete Task

**Endpoint:** `DELETE /api/task/delete-task`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "taskId": "task_id_here"
}
```

**Features:**
- ❌ Automatically cancels scheduled reminders
- 🗑️ Permanently removes task from database

**Response:**
```json
{
  "message": "Task Deleted successfully"
}
```

---

#### 5. Filter Tasks

**Endpoint:** `GET /api/task/filter?category=work&tags=urgent,api`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `category` (optional): Filter by category
- `tags` (optional): Comma-separated list of tags

**Response:**
```json
{
  "tasks": [
    {
      "_id": "task_id",
      "title": "Complete project",
      "category": "work",
      "tags": ["urgent", "api"]
    }
  ]
}
```

---

#### 6. Get Tasks by Category

**Endpoint:** `POST /api/task/category`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "category": "work"
}
```

**Response:**
```json
{
  "tasks": [
    {
      "_id": "task_id",
      "title": "Complete project",
      "category": "work"
    }
  ]
}
```

---

## 🏗️ Architecture

### Project Structure

```
conversely-assignment/
├── src/
│   ├── db.ts                    # MongoDB connection
│   ├── server.ts                # Express app entry point
│   ├── middleware/
│   │   └── authMiddleware.ts    # JWT authentication
│   ├── model/
│   │   └── taskModel.ts         # Mongoose task schema
│   ├── router/
│   │   ├── userRouter.ts        # User authentication routes
│   │   └── taskRouter.ts        # Task CRUD routes
│   ├── services/
│   │   ├── reminderQueue.ts     # BullMQ queue management
│   │   └── notificationService.ts # Notification logic
│   └── types/
│       └── express.d.ts         # TypeScript type definitions
├── lib/
│   └── prisma.ts                # Prisma client instance
├── prisma/
│   ├── schema.prisma            # Database schema
│   └── migrations/              # Database migrations
├── dist/                        # Compiled JavaScript
├── package.json
├── tsconfig.json
└── .env
```

---

### How It Works

#### 1. **User Authentication Flow**
```
Sign Up → Hash Password (bcrypt) → Store in PostgreSQL (Prisma)
Sign In → Verify Password → Generate JWT Token → Return to Client
```

#### 2. **Task Creation Flow**
```
Create Task → Store in MongoDB → Schedule Reminder (BullMQ) → Return Response
                                        ↓
                                   Redis Queue
                                        ↓
                            Wait until (dueDate - 1 hour)
                                        ↓
                              Send Notification
```

#### 3. **Reminder System**

- **Scheduling**: When a task is created, a reminder job is added to the Redis queue
- **Delay Calculation**: `reminderTime = dueDate - 1 hour`
- **Execution**: BullMQ worker processes the job and sends notification
- **Rescheduling**: If due date is updated, old job is cancelled and new one is scheduled
- **Cancellation**: Completed or deleted tasks have their reminders removed

---

## 🔧 Configuration

### Redis Queue Settings

The reminder queue uses BullMQ with the following configuration:

```typescript
const reminderQueue = new Queue('task-reminders', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  }
});
```

### Timezone Configuration

All dates are converted to **Asia/Kolkata (IST)** timezone:

```typescript
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const formattedDate = dayjs(date).tz('Asia/Kolkata').format();
```

---

## 🧪 Testing

### Using Postman

A Postman collection is included in the `postman/` directory.

**Import Collection:**
1. Open Postman
2. Click **Import**
3. Select `postman/New Collection.postman_collection.json`
4. Update the `baseUrl` variable to `http://localhost:3005`

### Manual Testing

```bash
# Test server is running
curl http://localhost:3005

# Response: "Hello World"
```

---

## 🐳 Docker Commands Reference

### Redis Docker Commands

```bash
#docker run -p 6379:6379 redis

## 🚀 Deployment

### Environment Variables for Production

```env
NODE_ENV=production
PORT=3005
DATABASE_URL="postgresql://user:pass@production-host:5432/db"
MONGODB_URI="mongodb://production-host:27017/tasks"
JWT_SECRET="super-secure-secret-key-minimum-32-chars"
REMINDER_WEBHOOK_URL=YOUR_WEBHOOK_LINK
ANALYTICS_WEBHOOK_URL=YOUR_WEBHOOK_LINK
```

### Build for Production

```bash
# Install dependencies
pnpm install --prod

# Generate Prisma client
npx prisma generate

# Build TypeScript
tsc

# Start production server
node dist/server.js
```

---

## 📝 License

This project is licensed under the ISC License.

---

## 👨‍💻 Author

**Farhan**  
GitHub: [@Farhandev097](https://github.com/Farhandev097)

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📞 Support

For support, email farhan2005etw@gmail.com or open an issue on GitHub.

---

<div align="center">

**⭐ Star this repository if you found it helpful!**

Made with ❤️ by Farhan

</div>
