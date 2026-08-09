# EduTrack AI

An AI-powered school operations platform that mirrors a real school term end-to-end — syllabus planning, AI-assisted test generation, handwritten grading, and performance analytics — built on a free/open-source stack so it's realistic for a resource-constrained school to actually run.

This repo currently implements **Pillar 1 — Syllabus Planning & Pacing Tracker**, an integrated **Teacher Profiles** feature, and the shared foundation (auth, roles, LLM abstraction, PDF export pipeline) that the remaining pillars build on. See [What's implemented](#whats-implemented) below for the full breakdown.

## Tech stack

| Layer | Choice |
|---|---|
| Backend | Spring Boot 3 (Java 17), Spring Security + JWT, Spring Data JPA, Flyway migrations |
| Frontend | React 18 + TypeScript (Vite), Tailwind CSS, Framer Motion |
| Database | PostgreSQL (local via Docker; Neon/Supabase-compatible in production) |
| LLM | [Groq](https://groq.com) (hosted, free tier) in production, [Ollama](https://ollama.com) (local) in dev — switched purely via the `LLM_PROVIDER` env var, no code changes between environments |
| Document/OCR | Apache PDFBox (PDF), Apache POI (DOC/DOCX), Tesseract via Tess4j (image OCR) |
| PDF export | openhtmltopdf + Thymeleaf HTML templates |
| File storage | Local disk in dev (pluggable `FileStorageService` interface for swapping to Cloudinary/Supabase Storage in production) |

## Running it locally

1. Copy the env file and adjust if needed:
   ```
   cp .env.example .env
   ```
   By default `LLM_PROVIDER=ollama`. If you have [Ollama](https://ollama.com) installed, run `ollama serve` and pull the model (`ollama pull llama3.2`) — the backend reaches it at `http://host.docker.internal:11434`. To use Groq instead, set `LLM_PROVIDER=groq` and `GROQ_API_KEY=...`.

2. Start everything:
   ```
   docker compose up --build
   ```
   This brings up Postgres, the backend API (with Tesseract OCR baked into the image), and the frontend dev server.

   **Ports**: frontend on `5174`, backend on `8080`, Postgres on `5433` (host side). These are shifted from the usual `5173`/`5432` because other local projects were already using them on the dev machine this was built on — change them back in `docker-compose.yml` + `.env` (`CORS_ALLOWED_ORIGINS`) if that's not the case for you.

3. Open **http://localhost:5174**.

The database auto-migrates and seeds demo data on first boot. Sign in with any of these (password for all: `Password123!`):

| Role | Email |
|---|---|
| Principal | `principal@edutrack.school` |
| Teacher (Math, Grade 6 & 7) | `sana.tariq@edutrack.school` |
| Teacher (English/Urdu) | `bilal.ahmed@edutrack.school` |
| Admin | `admin@edutrack.school` |

### Local dev without Docker

- Backend: `cd backend && mvn spring-boot:run` — needs a local Postgres matching `DB_URL`/`DB_USER`/`DB_PASSWORD`, and Tesseract OCR installed on your machine for image-syllabus uploads to work (`brew install tesseract` / `apt install tesseract-ocr` — not needed if you only test PDF/DOCX uploads).
- Frontend: `cd frontend && npm install && npm run dev`.

### Resetting demo data

`docker compose down -v` removes the Postgres volume, so the next `docker compose up` reseeds a clean demo school from scratch.

## Environment variables

| Variable | Purpose | Local default | Production |
|---|---|---|---|
| `DB_URL` / `DB_USER` / `DB_PASSWORD` | Postgres connection | local container | Point at your managed Postgres (Neon/Supabase/etc.); append `?sslmode=require` for Neon — no code change needed |
| `JWT_SECRET` | Signs auth tokens | dev placeholder | **Must** be a long random secret |
| `LLM_PROVIDER` | `ollama` or `groq` | `ollama` | Set to `groq` |
| `GROQ_API_KEY` / `GROQ_MODEL` | Groq API access | unused | Required when `LLM_PROVIDER=groq` |
| `OLLAMA_BASE_URL` / `OLLAMA_MODEL` | Local LLM | `host.docker.internal:11434` | unused |
| `CORS_ALLOWED_ORIGINS` | Allowed frontend origin(s) | `http://localhost:5174` | Your deployed frontend URL |
| `STORAGE_BASE_PATH` | Where uploaded files land | `./storage` (container volume) | Swap `FileStorageService` implementation for object storage before deploying — local disk doesn't persist on most free hosting tiers |
| `OCR_TESSDATA_PATH` | Tesseract language data path | set by the backend Dockerfile | Same, if using a different base image |
| `SEED_ENABLED` | Seed demo school on empty DB | `true` | Set to `false` once real data exists |
| `VITE_API_BASE_URL` | Frontend → backend URL | `http://localhost:8080` | Your deployed backend URL |

None of these are hardcoded with production-breaking defaults — every default is dev-safe (localhost/placeholder), and switching environments is purely an env var change.

## What's implemented

**Foundation**: JWT auth, TEACHER/PRINCIPAL/ADMIN roles, multi-tenant school/class/subject data model, env-switchable LLM client (Groq/Ollama), server-side PDF export pipeline, responsive app shell with a mobile drawer nav.

**Pillar 1 — Syllabus Planning & Pacing**:
- Upload a syllabus as **PDF, Word (.doc/.docx), or a photo/scan (JPG/PNG/WebP)** — images go through Tesseract OCR, documents through Apache POI, PDFs through PDFBox, all feeding the same AI topic-extraction pipeline.
- AI extracts topics and maps them to calendar weeks from a term start date; full manual add/edit/delete/reorder as a correction path.
- Daily "Today's Plan" auto-suggests the next open topic, with one-tap **Covered as planned** / **Not delivered** (+ reason).
- Missed lessons auto-reschedule to the next open date for that topic — nothing silently disappears.
- Principal's Coverage Grid: Class × Subject planned-vs-covered status (On track / Ahead / Behind / Not started), with drill-down and a PDF export.

**Teacher Profiles** (folded into this milestone):
- Every teacher has a profile: photo (JPG/PNG/WebP upload), designation, bio, and a day/time timetable — subjects and classes taught are derived live from the existing data, never duplicated.
- Principal-facing Teacher Directory: a card grid of every teacher, with a detail view (profile + timetable) for each.

**School Calendar** (folded into this milestone):
- Configurable weekend days and Principal-managed holiday date ranges, visible to everyone as a month-grid calendar.
- Wired directly into the scheduling logic, not just cosmetic: "Today's Plan" never auto-suggests a topic on a weekend/holiday, and missed-lesson auto-reschedule skips over them to land on the next real teaching day.

Not yet built: Pillars 2–7 (AI test generation, handwritten grading, analytics, feedback loop, head-of-school reporting) and the Student/Parent portals (explicitly out of scope per the product spec). Live deployment is prepared for but not yet executed — see [Deployment](#deployment).

## Test scenarios (manual QA checklist)

**Responsiveness**
- [ ] Resize the browser from ~375px (mobile) through ~820px (tablet) to desktop on every page — sidebar becomes a slide-in drawer with backdrop below `md` (768px); no horizontal page overflow; tables scroll independently instead of breaking layout.
- [ ] On mobile, open the drawer via the hamburger icon, navigate to another page, confirm it auto-closes.

**Auth & roles**
- [ ] Log in as Teacher and Principal; confirm each only sees their own nav items and cannot reach the other's routes directly by URL.
- [ ] Confirm a Teacher's JWT is rejected on `/api/principal/**` endpoints (403).

**Syllabus upload & AI extraction**
- [ ] Upload a PDF syllabus → topics extracted with plausible week ranges.
- [ ] Upload a `.docx` syllabus → same.
- [ ] Upload a photo/scan of a printed syllabus (JPG or PNG) → OCR extracts readable text and topics are generated (expect occasional imperfect week-numbering on OCR'd text — this is a real limitation of OCR+LLM, correctable via the manual topic editor).
- [ ] Try an unsupported file type (e.g. `.txt`) → clear rejection message, no crash.
- [ ] Manually add, edit, reorder, and delete a topic.

**Lesson planning**
- [ ] Confirm a lesson "Covered as planned" → topic marked covered.
- [ ] Confirm a lesson "Not delivered" with a reason → it appears as Missed, and a new Rescheduled entry appears on a later date.

**Principal Coverage Grid**
- [ ] Grid shows correct planned/covered counts and status per Class × Subject.
- [ ] Click a row → detail modal shows topics and missed/rescheduled history.
- [ ] Export PDF → downloads a correctly formatted report.

**Teacher Profiles**
- [ ] As a Teacher, upload a profile photo (JPG/PNG/WebP), set designation + bio, save, reload — everything persists and the photo renders.
- [ ] Add and delete timetable slots (with and without a linked subject).
- [ ] As Principal, open the Teacher Directory, confirm both teachers appear with correct photos/designations/subject counts, and their detail view matches what each teacher set.
- [ ] Confirm one teacher cannot edit another's profile (there is no cross-teacher write endpoint — only `/me`).

**School Calendar**
- [ ] As Principal, open Calendar, add a holiday spanning a few days → it renders on the month grid with its name.
- [ ] Toggle weekend days (e.g. switch to Sunday-only) → grid updates immediately.
- [ ] As Teacher, open Calendar → same data, but no "Add holiday" button or weekend toggle (read-only).
- [ ] On a weekend or holiday date, "Today's Plan" shows "No school today" instead of auto-suggesting a topic (test via a subject with an active syllabus, checking a known off day).
- [ ] Confirm a lesson as "Not delivered" right before a weekend/holiday → the auto-rescheduled entry lands on the next real school day, skipping over both.

**Env-driven config**
- [ ] Confirm `.env` is git-ignored and never committed.
- [ ] Confirm the app starts with either `LLM_PROVIDER=ollama` or `LLM_PROVIDER=groq` without any code changes.

## Deployment

Not yet deployed. The codebase is deployment-ready (Dockerfiles for the backend, env-var-driven config throughout, no hardcoded local-only values), but live deployment needs:
- A Postgres host (Neon/Supabase/etc.)
- A backend host (Render/Railway/etc.)
- A frontend host (Vercel/Netlify/etc.) or served as a static build from the same backend host
- Object storage for uploaded files (syllabi, profile photos) if the host's disk isn't persistent
- A Groq API key for production LLM calls

This section will be filled in with live URLs once deployment happens.

## Project layout

```
backend/    Spring Boot API — see src/main/java/com/edutrack/{syllabus,profile,llm,pdf,security,org}
frontend/   React app — see src/pages/{teacher,principal}
docker-compose.yml
.env.example
```
