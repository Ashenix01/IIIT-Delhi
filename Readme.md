# Health AI

An AI-powered healthcare navigation platform. Patients describe their health concern by voice or text, receive plain-language guidance backed by reputable sources, get matched with suitable registered doctors, and book appointments online.

> **Disclaimer:** Health AI supports healthcare navigation only. It does not provide diagnoses, prescribe medication, or replace a qualified medical professional. In an emergency, contact local emergency services immediately.

---

## Features

**Patients**
- Register, log in, and manage profile and privacy settings
- Describe a health concern by voice (Hindi and English) or text
- Review and correct the transcript before it is processed
- Structured AI extraction of symptoms, duration, and severity
- Source-supported health guidance with clear limitations
- Suggested medical specialties and doctor recommendations with transparent match reasons
- Book, reschedule, and cancel appointments
- Dashboard with query history, upcoming and past appointments, and saved doctors

**Doctors**
- Separate registration and login
- Credential verification status on every profile
- Manage availability slots and appointments
- View patient-shared summaries for their appointments
- Record consultation notes and follow-up instructions

**Safety and privacy**
- Rule-based emergency screening before any AI processing
- AI output is always labelled and cites sources
- Raw audio is never stored
- Role-based access control, audit logging, and rate limiting

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS, React Router |
| Backend | Node.js, Express.js (JavaScript, ESM), REST API |
| Database | PostgreSQL (Docker), Prisma ORM |
| AI | OpenRouter (LLM), speech-to-text, retrieval-augmented generation |
| Auth | JWT in httpOnly cookie, bcrypt, role-based authorization |
| Validation | Zod |

---

## Project Structure

```
healthbridge-ai/
├── docker-compose.yml
├── README.md
├── client/
│   └── src/
│       ├── api/            # axios instance and API calls
│       ├── components/     # ui, layout, voice, doctors, appointments
│       ├── context/        # AuthContext
│       ├── hooks/          # useSpeechRecognition, useAuth
│       ├── pages/          # public, patient, doctor
│       └── routes/         # ProtectedRoute and role guards
└── server/
    ├── prisma/
    │   ├── schema.prisma
    │   ├── migrations/
    │   └── seed.js
    └── src/
        ├── app.js
        ├── server.js
        ├── config/         # env, prisma client, logger
        ├── middleware/     # auth, role, validate, rateLimit, errorHandler, audit
        ├── modules/
        │   ├── auth/
        │   ├── patients/
        │   ├── doctors/
        │   ├── appointments/
        │   ├── queries/
        │   └── ai/         # extraction, safety, rag, specialty, matching
        └── utils/
```

Each backend module follows `routes -> controller -> service -> validation`.

---

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- Docker and Docker Compose
- An OpenRouter API key

### 1. Clone the repository

```bash
git clone https://github.com/vansh216/IIIT-Delhi.git
cd IIT-Delhi
```

### 2. Start PostgreSQL

`docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16
    container_name: healthbridge-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: healthbridge
      POSTGRES_PASSWORD: healthbridge_pw
      POSTGRES_DB: healthbridge
    ports:
      - "5432:5432"
    volumes:
      - healthbridge_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U healthbridge"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  healthbridge_pgdata:
```

```bash
docker compose up -d
```

### 3. Configure and run the backend

```bash
cd server
npm install
cp .env.example .env
```

`server/.env.example`:

```env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173

DATABASE_URL="postgresql://healthbridge:healthbridge_pw@localhost:5432/healthbridge?schema=public"

JWT_SECRET=replace_with_a_long_random_string
JWT_EXPIRES_IN=1h

OPENROUTER_API_KEY=
OPENROUTER_MODEL=
```

Run migrations, seed demo data, and start the server:

```bash
npx prisma migrate dev --name init
npx prisma generate
npm run db:seed
npm run dev
```

The API runs at `http://localhost:5000/api/v1`. Health check: `GET /api/v1/health`.

### 4. Run the frontend

```bash
cd client
npm install
cp .env.example .env     # VITE_API_URL=http://localhost:5000/api/v1
npm run dev
```

The app runs at `http://localhost:5173`.

---

## Backend Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the API with nodemon |
| `npm start` | Start the API |
| `npm run db:migrate` | Create and apply a migration |
| `npm run db:deploy` | Apply migrations in production |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:reset` | Reset the database |


## AI Workflow

```
Voice / text input
  -> Transcript review and confirmation
  -> Rule-based emergency screening (English and Hindi)
  -> LLM extraction (Zod-validated)
  -> Patient confirms extracted information
  -> Specialty mapping to an allowed list
  -> Guidance with source links and limitations
  -> Doctor matching and recommendations
```

**Doctor matching:** doctors are filtered by verification status, specialty, consultation mode, and availability, then ranked by language match, distance (only if the patient shares location), earliest availability, and fee. Each recommendation shows why it matched.



## Security and Privacy

- API keys and secrets stay on the backend
- Passwords are hashed; sessions use httpOnly cookies
- Role-based authorization with ownership checks on all records
- Input validation, rate limiting, Helmet, and CORS
- No medical text in logs or notifications
- Raw audio is never stored
- Development uses synthetic data only

Before deploying with real patients, complete clinical review, security testing, and a legal assessment of applicable healthcare and data-protection regulations.

---
