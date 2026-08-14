# Tech Stack & Engineering Highlights

A quick reference to what's actually under the hood — for recruiters, hiring teams, or anyone skimming this as a portfolio piece. Live app: **https://edutrack-ai.n-nehakhan333.workers.dev**

## Stack at a glance

| Layer | Technology |
|---|---|
| **Backend** | Java 17, Spring Boot 3, Spring Security (JWT auth, role-based access control), Spring Data JPA/Hibernate |
| **Database** | PostgreSQL, schema versioned with Flyway migrations (20+ migrations, zero manual schema edits) |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Framer Motion |
| **API layer** | REST, OpenAPI/Swagger docs (springdoc), Axios on the client |
| **AI/LLM** | Groq (production) / Ollama (local) — pluggable provider, swapped via config, zero code change |
| **Document processing** | Apache PDFBox (PDF text + page rendering), Apache POI (Word .doc/.docx), Tesseract OCR via Tess4j (scanned images, English + Urdu) |
| **Computer vision** | face-api.js — browser-side face embedding/verification for optional biometric attendance |
| **File storage** | Pluggable: local disk (dev) / Cloudflare R2 (production, S3-compatible via AWS SDK v2) |
| **Mobile** | Installable PWA (Workbox service worker, web app manifest) + native Android app via Capacitor |
| **PDF generation** | openhtmltopdf + Thymeleaf server-rendered templates |
| **Deployment** | Cloudflare Pages/Workers (frontend), Render (Docker backend), Neon (serverless Postgres) — fully live, entirely on free tiers |
| **Tooling** | Docker & Docker Compose (local dev parity with prod), Git |

## Engineering highlights

A few things worth pointing out beyond the stack list — the parts that involved actual design decisions, not just wiring libraries together:

**Provider-swap architecture, not hardcoded integrations.** Both the LLM (Groq/Ollama) and file storage (local disk/Cloudflare R2) are behind a single interface each, selected purely by a `provider` config value (`@ConditionalOnProperty` in Spring). Local development and production run the exact same codebase — the only difference is an environment variable. This is also what made adding R2 storage later a same-day, zero-regression change: implement the interface, flip a flag, done.

**Server-enforced business rules, not just UI gating.** The syllabus workflow (upload → review → confirm → plan) locks the "Planning" tab until a syllabus is explicitly confirmed. That gate is enforced in the API itself — `POST /extract-topics` rejects an unconfirmed syllabus with a 400 regardless of what the frontend does — because a UI-only lock is not a real lock.

**Resilience around a genuinely unreliable input: OCR'd/LLM-parsed text.** Small local LLMs occasionally emit malformed JSON, especially fed noisy OCR output — the extraction pipeline retries up to 3 times before failing. OCR confidence is surfaced per-document (from Tesseract's real per-word confidence scores, not a guess), with the original scan rendered side-by-side against the editable extracted text so a human can actually verify it. This was validated against real phone-photographed syllabus pages (English and Urdu, single- and multi-column layouts) — not clean synthetic test files — which surfaced and fixed two real bugs (an OCR-language auto-detector letting Urdu noise corrupt English text, and the LLM occasionally echoing back its own prompt examples as if they were real data).

**Multi-tenant data isolation.** Every query is scoped to the authenticated user's school — a Principal or Teacher can never see or touch another school's data, enforced at the service layer, not just filtered client-side.

**Cross-role data flows that actually hold together.** Attendance, class diary, and leave/skip-reporting all involve one role (Teacher) writing data that another role (Principal) needs to see reflected accurately and in real time — roster management, attendance dashboards, and approval workflows were built and tested as end-to-end flows across both roles, not as isolated screens (see `TESTING.md` for the actual flow-based QA approach used).

**A real, working production deployment — not just "containerizes locally."** Frontend on Cloudflare's edge network, backend on Render, database on Neon, file storage on R2, all wired together with correct CORS, environment-driven config, and a manually verified production smoke test (login, AI extraction, file upload/persistence-across-redeploy) — all while keeping the entire stack on free tiers.

**Mobile from a single codebase.** The same React app is installable as a PWA and wrapped as a native Android app via Capacitor — the Android build points at the live URL rather than bundling a static copy, so shipping a new feature to the web app ships it to the installed mobile app too, with no rebuild or store update required.

**Practical security choices.** Passwords are bcrypt-hashed (verified compatible across a Python-generated hash and Spring Security's `BCryptPasswordEncoder`, since account provisioning happens outside the JVM in this app's setup flow); JWT-based auth with role checks enforced server-side on every protected endpoint; no self-registration anywhere — every account is provisioned by a Principal, closing off an entire class of unauthorized-signup risk.
