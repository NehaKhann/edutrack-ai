# EduTrack AI

An AI-powered school operations platform that mirrors a real school term end-to-end — syllabus planning, attendance, class diary, teacher leave management, and performance tracking — built on a free/open-source stack so it's realistic for a resource-constrained school to actually run.

**Live**: deployed and running at [edutrack-ai.n-nehakhan333.workers.dev](https://edutrack-ai.n-nehakhan333.workers.dev), installable as a mobile app (PWA today, native Android in progress — see [Deployment](#deployment)).

See [What's implemented](#whats-implemented) below for the full feature breakdown, and [TESTING.md](TESTING.md) for a role-by-role QA flow guide (e.g. "Teacher marks attendance → Principal sees it").

## Tech stack

| Layer | Choice |
|---|---|
| Backend | Spring Boot 3 (Java 17), Spring Security + JWT, Spring Data JPA, Flyway migrations |
| Frontend | React 18 + TypeScript (Vite), Tailwind CSS, Framer Motion, installable PWA (`vite-plugin-pwa`) |
| Mobile | Capacitor Android wrapper pointed at the live deployed URL — feature/content updates ship instantly with no app rebuild; only native-level changes (icon, name, native plugins) need a new build |
| Database | PostgreSQL — local via Docker in dev, [Neon](https://neon.tech) (free serverless Postgres) in production |
| LLM | [Groq](https://groq.com) (hosted, free tier) in production, [Ollama](https://ollama.com) (local) in dev — switched purely via the `LLM_PROVIDER` env var, no code changes between environments |
| File storage | Local disk in dev, [Cloudflare R2](https://developers.cloudflare.com/r2/) (free tier, S3-compatible) in production — switched purely via the `STORAGE_PROVIDER` env var. Needed because most free app hosts (e.g. Render) wipe local disk on every redeploy; R2 doesn't. |
| Document/OCR | Apache PDFBox (PDF), Apache POI (DOC/DOCX), Tesseract via Tess4j (image OCR, English + Urdu) |
| Face recognition | face-api.js (browser-side) for optional face-verified teacher self-attendance, with a manual fallback |
| PDF export | openhtmltopdf + Thymeleaf HTML templates |
| Hosting | [Cloudflare Pages/Workers](https://developers.cloudflare.com/workers/) (frontend, static), [Render](https://render.com) (backend, Docker) — both free tier |

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
| `STORAGE_PROVIDER` | `local` or `r2` | `local` | Set to `r2` — local disk doesn't persist across redeploys on most free hosts |
| `STORAGE_BASE_PATH` | Where uploaded files land when `STORAGE_PROVIDER=local` | `./storage` (container volume) | unused when `STORAGE_PROVIDER=r2` |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY` / `R2_SECRET_KEY` / `R2_BUCKET` | Cloudflare R2 credentials | unused | Required when `STORAGE_PROVIDER=r2` |
| `OCR_TESSDATA_PATH` | Tesseract language data path | set by the backend Dockerfile | Same, if using a different base image |
| `SEED_ENABLED` | Seed demo school on empty DB | `true` | Set to `false` once real data exists |
| `VITE_API_BASE_URL` | Frontend → backend URL | `http://localhost:8080` | Your deployed backend URL |

None of these are hardcoded with production-breaking defaults — every default is dev-safe (localhost/placeholder), and switching environments is purely an env var change.

## What's implemented

**Foundation**: JWT auth, TEACHER/PRINCIPAL/ADMIN roles, multi-tenant school data model (School → Class Section → Subject, with a Student roster per class), env-switchable LLM client (Groq/Ollama) and file storage (local disk/R2), server-side PDF export pipeline, responsive app shell with a mobile drawer nav, installable PWA, in-app notifications, and global cross-entity search scoped to each school.

**Teacher Account Management** (Principal-only): create teacher accounts with an auto-generated temporary password and optional CV upload, forcing a password change on first login (no self-registration exists anywhere in the app — every account is provisioned this way); deactivate/reactivate accounts.

**Class / Section / Subject management**: Principal creates Class Sections (e.g. "Grade 6 – A") and Subjects within them, assigning one or more subjects to a teacher (including one teacher across multiple classes/subjects).

**Pillar 1 — Syllabus Planning & Pacing**:
- **Upload → Review/Edit → Confirm → Plan**, a deliberate multi-step flow rather than "upload and hope": upload one or more scanned/typed documents at once (PDF, Word .doc/.docx, or a photo/scan JPG/PNG/WebP — images go through Tesseract OCR in English + Urdu, PDFs with no real text layer are automatically rendered page-by-page and OCR'd too), see the extracted text exactly as pulled from each file, hand-correct anything wrong, then explicitly **Confirm** the syllabus. A second **Planning** tab — where AI topic extraction and the week/month topic list live — stays locked until that confirmation happens, both in the UI and enforced server-side (the extraction endpoint itself rejects an unconfirmed syllabus, so it's a real gate, not just a frontend affordance). Uploading multiple files reports partial success — one unreadable file in a batch doesn't block the rest.
- AI extracts topics and maps them to **either week ranges ("Week 1-2") or calendar months ("April'26", "Month of August")** — whichever style the source document actually uses. Real-world school syllabi are very often month-organized, not week-organized, so both are treated as first-class, not just week-based.
- Topic-extraction JSON parsing retries up to 3 times before failing — small local LLMs (e.g. Ollama's llama3.2) occasionally emit malformed JSON, especially on noisy OCR'd text, so this is a real resilience measure, not a hypothetical one.
- **OCR review UX**: every reviewed document shows a confidence badge (from Tesseract's actual per-word confidence), a reference list of the specific words OCR was least sure about, and the original scan/PDF page rendered side-by-side with the editable extracted text — so a teacher can visually cross-check instead of guessing. Low-confidence or Urdu-language extractions surface an explicit warning with a one-click **switch to Manual Entry**, which is also available up front for any document (type the syllabus content directly, with or without an accompanying file).
- Daily "Today's Plan" auto-suggests the next open topic, with one-tap **Covered as planned** / **Not delivered** (+ reason).
- Missed lessons auto-reschedule to the next open date for that topic — nothing silently disappears.
- Principal's Coverage Grid: Class × Subject planned-vs-covered status (On track / Ahead / Behind / Not started), with drill-down and a PDF export.

**Teacher Profiles** (folded into this milestone):
- Every teacher has a profile: photo (JPG/PNG/WebP upload), designation, bio, and a day/time timetable — subjects and classes taught are derived live from the existing data, never duplicated.
- Principal-facing Teacher Directory: a card grid of every teacher, with a detail view (profile + timetable) for each.

**School Calendar** (folded into this milestone):
- Editable per-date calendar, not just a fixed weekly pattern: the Principal can click any date and toggle it Working/Off (with an optional reason), bulk-apply a status across a date range or a specific weekday (e.g. "all Saturdays this term"), and reset any date back to its default. Only real exceptions are stored — a date matching the school's default weekly pattern is never persisted as its own row — with a who/when audit trail on every active override.
- Wired directly into the scheduling logic, not just cosmetic: "Today's Plan" never auto-suggests a topic on a non-teaching day, and missed-lesson auto-reschedule skips over them to land on the next real teaching day — including a weekend that's been explicitly marked as a working day.

**Student Attendance**:
- Principal- or Teacher-managed student roster per class section (name + roll number), so a Teacher can build their own class list rather than depending entirely on the Principal.
- Teacher marks daily or period-wise attendance (Present/Absent/Late/Leave) for a class; Principal's Attendance Dashboard shows a real-time per-class summary (marked/not-marked, present/absent/late counts, attendance %) with a drill-down to the exact per-student record.

**Teacher Attendance, Leave & Class-Skip Reporting**:
- Teacher marks their own daily attendance manually, or via **face recognition** (enroll once, then verify with the camera — manual entry remains available as a fallback).
- Teacher applies for leave (type, date range, reason, optional supporting document) and reports a skipped class (subject/date/period/reason, optional substitute).
- Principal's Teacher Attendance dashboard surfaces an alert banner (e.g. absent-without-leave), a same-day overview per teacher, and a detail view with full leave history and a monthly attendance summary; Principal approves/rejects leave requests directly.

**Class Diary / Homework**:
- Teacher logs a daily diary entry per subject (content, optional page reference, due date, optional attachment).
- Principal's Diary Overview shows, per class/date, which subjects have submitted vs. not — filterable by class, teacher, and subject.

Not yet built: AI test generation, handwritten grading, and a feedback-loop/head-of-school reporting pillar beyond the existing Coverage Grid — plus Student/Parent portals (explicitly out of scope per the product spec).

### Known limitations (verified against real school syllabi, not hypothetical)

Tested directly against real phone-photographed syllabus pages (English and Urdu, week- and month-organized, single- and multi-column layouts) — not just clean synthetic files. This surfaced and fixed several real bugs (an OCR-language auto-detector that was letting stray Urdu noise corrupt English documents, and a prompt-example-leakage bug where the AI occasionally echoed back this codebase's own instruction examples as if they were real topics). What's left is a genuine, not-yet-solved ceiling rather than a bug:

- **Urdu OCR on a real, skewed, low-resolution photo is still noticeably imperfect.** Urdu's Nastaliq script is one of the hardest OCR targets in general — even Tesseract's highest-accuracy model struggles on classroom-photo-quality scans of dense tabular Urdu text. A cleaner/flatter scan, better lighting, or a typed Word/PDF version (instead of a phone photo) will extract far better than a skewed photo will. Manual topic entry remains the practical fallback for low-quality Urdu scans.
- **Multi-column layouts** (e.g. a Math syllabus with separate Arithmetic/Algebra/Geometry columns per month) sometimes get their columns cross-contaminated in the extracted text, since OCR and PDF text extraction both flatten a 2D table into a 1D text stream — the AI does its best with what it's given, but occasionally merges two adjacent columns' content into one garbled title.
- **Local Ollama models (llama3.2 3B) are noticeably less reliable than a larger hosted model** at consistently picking week-mode vs. month-mode, and at avoiding occasional malformed JSON — both are mitigated (retries, sanity-clamping) but not eliminated. Production `LLM_PROVIDER=groq` should perform meaningfully better on all of the above since Groq's models are far larger.

## Testing

See **[TESTING.md](TESTING.md)** for the full manual QA guide — organized as real cross-role flows (e.g. "Teacher marks attendance → switch to Principal → confirm it shows up correctly") rather than isolated per-feature checks, since that's the failure mode that matters most in a two-sided school app.

## Deployment

**Live now**, on an all-free-tier stack:

| Piece | Provider |
|---|---|
| Frontend | [Cloudflare Pages/Workers](https://developers.cloudflare.com/workers/) — static build, deployed via Wrangler (`frontend/wrangler.toml`) |
| Backend | [Render](https://render.com) — Docker web service (free tier: cold starts after ~15 min idle, that's expected) |
| Database | [Neon](https://neon.tech) — free serverless Postgres (suspends when idle; first request after suspend is slower) |
| File storage | [Cloudflare R2](https://developers.cloudflare.com/r2/) — S3-compatible, needed because Render's disk is wiped on every redeploy |
| LLM | [Groq](https://groq.com) — free tier, `LLM_PROVIDER=groq` |

**Live URL**: https://edutrack-ai.n-nehakhan333.workers.dev

No self-registration exists anywhere in the app — the Principal account is provisioned once directly in the database, and every Teacher account after that is created from inside the app by the Principal.

**Mobile app**: installable today as a PWA (Add to Home Screen, on Android or iPhone, no store needed). A native Android build also exists (`frontend/android/`, via [Capacitor](https://capacitorjs.com)) — it wraps the same live URL rather than bundling a static copy, so every deploy shows up in the app immediately with no rebuild. Only a genuinely native change (icon, app name, a native-only plugin) needs a new APK build. iOS is blocked on needing a Mac (or a paid cloud Mac CI) to build — not yet done.

## Project layout

```
backend/    Spring Boot API — see src/main/java/com/edutrack/{syllabus,attendance,staffattendance,diary,calendar,face,notification,profile,llm,pdf,storage,security,org}
frontend/   React app — see src/pages/{teacher,principal}; android/ is the Capacitor-generated native Android project
docker-compose.yml
.env.example
TESTING.md
```
