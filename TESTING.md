# Testing EduTrack AI — end-to-end flows

This is a manual QA guide organized around **real cross-role flows**, not isolated feature checks: a Teacher does something, then you switch accounts and confirm the Principal actually sees the right result. That's the failure mode that matters most in a school app — one role's action silently not showing up for the other.

Run these against either your local Docker environment (`http://localhost:5174`, demo accounts below) or your live deployment.

## Accounts

**Local Docker (seeded automatically, password for all: `Password123!`)**
| Role | Email |
|---|---|
| Principal | `principal@edutrack.school` |
| Teacher (Math, Grade 6 & 7) | `sana.tariq@edutrack.school` |
| Teacher (English/Urdu) | `bilal.ahmed@edutrack.school` |
| Admin | `admin@edutrack.school` |

**Production**: no seeded demo accounts (`SEED_ENABLED=false`) and no self-registration — the Principal account is provisioned directly in the database, and every Teacher account is created from inside the app by the Principal (Teacher Directory → Manage Teacher Accounts), which is itself one of the flows below.

---

## 1. Auth & roles

- [ ] Log in as Teacher and Principal in two different browser profiles (or one normal + one incognito) → confirm each sees only their own nav items.
- [ ] While logged in as Teacher, manually navigate to a `/principal/...` URL → redirected/blocked, not shown a broken page.
- [ ] Confirm a Teacher's JWT gets a 403 calling a `/api/principal/**` endpoint directly (e.g. via browser devtools Network tab or curl).

## 2. Principal provisions a Teacher account → Teacher logs in

- [ ] As Principal: Teacher Directory → **Manage Teacher Accounts** → create a new account (name, email, optional CV upload) → a temporary password is generated and shown once.
- [ ] Log out, log in as that new teacher with the temp password → app forces a **change password** screen before letting them into the app.
- [ ] Set a new password, confirm you land on the teacher dashboard normally on the next login with the new password.
- [ ] As Principal, confirm the new teacher now appears in Teacher Directory with correct name/email.
- [ ] As Principal, deactivate that teacher's account → confirm they can no longer log in (clear error, not a silent failure).
- [ ] As Principal, reactivate them → confirm login works again.

## 3. Class / Section / Subject structure

- [ ] As Principal, create a new Class + Section (e.g. "Grade 8 – A").
- [ ] Create a new Subject under that section and assign it to a teacher (including assigning one teacher to multiple subjects/sections).
- [ ] As that Teacher, confirm the new subject appears in their own subject list / timetable / "My Classes" without any extra setup.

## 4. Student roster → Student Attendance (Teacher marks → Principal sees)

- [ ] As Teacher (or Principal), open **Manage Roster** for a class section and add a few students with roll numbers.
- [ ] As Teacher, open **Attendance**, pick that class/section and today's date → the roster you just added appears, ready to mark (not dummy/placeholder data).
- [ ] Mark a mix of Present / Absent / Late / Leave for different students, submit.
- [ ] Switch to Principal → **Attendance Dashboard** → confirm that class section shows "Completed" for today with the correct present/absent/late counts.
- [ ] Click into the detail view for that class/date → confirm the per-student statuses match exactly what the Teacher submitted.
- [ ] Re-open the same class/date as Teacher → confirm previously-marked statuses are pre-filled (not reset to blank).

## 5. Teacher's own Attendance & Leave (Teacher acts → Principal sees)

- [ ] As Teacher, open **My Attendance & Leave** → mark today's status (Present/Late/etc.) via the manual panel.
- [ ] **Face recognition option**: enroll your face once, then use "Verify" to mark attendance via the camera instead of manually → confirm it succeeds and records the same way as manual marking.
- [ ] Submit a **Leave Request** (type, date range, reason, optional supporting document upload) as Teacher.
- [ ] Switch to Principal → **Teacher Attendance** → confirm today's status and the pending leave request both show up for that teacher, with the alert banner flagging anything needing attention (e.g. absent-without-leave).
- [ ] As Principal, **Approve** the leave request → switch back to Teacher, confirm the status updated from Pending → Approved.
- [ ] As Teacher, submit a **Skipped Class report** (subject/date/period/reason, optionally naming a substitute) → confirm it shows up in the Principal's teacher-detail view for that teacher.

## 6. Class Diary / Homework (Teacher submits → Principal sees)

- [ ] As Teacher, open **Class Diary**, fill in today's entry for a subject (content, optional page number, due date, optional attachment), submit.
- [ ] Switch to Principal → **Class Diary** overview, filter to that class/date → confirm the entry shows as Submitted with the correct content, and any *other* subject with no entry yet shows as Not Submitted (not silently blank).
- [ ] As Teacher, edit today's entry → confirm the Principal's view reflects the update, not a duplicate entry.

## 7. Syllabus upload → review → confirm → plan (AI-assisted)

- [ ] Click "New Syllabus", select 2–3 files at once (mix PDF / .docx / image) → each becomes its own editable card with the text actually extracted from that specific file.
- [ ] Include one bad file (e.g. a `.txt`) in the same batch → the good files still upload; the bad one is reported by name with a reason.
- [ ] Edit a card's extracted text, save, reload the page → the edit persisted.
- [ ] Try opening the **Planning** tab before confirming → blocked with a lock icon and a clear message.
- [ ] Click **Confirm Syllabus** → Planning unlocks; documents become read-only with a "✓ Confirmed" badge.
- [ ] In Planning, click **Extract with AI** → topics generated, correctly mapped to week ranges or calendar months depending on what the source document used.
- [ ] Manually add / edit / reorder / delete a topic.
- [ ] Zoom in/out on a document preview using the zoom controls; confirm it resets when switching documents.
- [ ] Delete a document → a proper confirmation modal appears (not a browser `confirm()` popup) before it's removed.
- [ ] Via curl/Postman, `POST /api/syllabus/{id}/extract-topics` directly against an **unconfirmed** syllabus → rejected (400) — proves the confirm-gate is enforced server-side, not just hidden in the UI.

## 8. Today's Plan → Coverage Grid (Teacher marks progress → Principal sees status)

- [ ] As Teacher, on "Today's Plan", mark a lesson **Covered as planned** → confirm it's reflected as covered.
- [ ] Mark another lesson **Not delivered** with a reason → confirm it shows as Missed, and a new entry auto-appears rescheduled to the next real teaching day (skipping weekends/holidays correctly).
- [ ] Switch to Principal → **Coverage Grid** → confirm the Class × Subject cell reflects the right status (On track / Ahead / Behind / Not started) based on what the teacher just did.
- [ ] Click that cell → detail modal shows the topic list plus the missed/rescheduled history accurately.
- [ ] Export the Coverage Grid to PDF → downloads and opens correctly.

## 9. School Calendar

- [ ] As Principal, add a holiday spanning a few days → renders on the month grid with its label.
- [ ] Toggle a weekend pattern (e.g. Sunday-only instead of Sat+Sun) → grid updates immediately.
- [ ] As Teacher, open Calendar → sees the same data, but no "Add holiday" control (read-only for that role).
- [ ] Confirm "Today's Plan" shows "No school today" instead of a suggested topic on a day you just marked off.

## 10. Search & Notifications

- [ ] As either role, use global **Search** to find a teacher, subject, or student by partial name → correct results, scoped to your own school only.
- [ ] Trigger something that should notify (e.g. Principal creates a teacher account, or approves/rejects a leave request) → confirm the notification bell shows it for the relevant user.

## 11. File storage persistence (Cloudflare R2)

- [ ] Upload any file that goes through storage (teacher CV, profile photo, syllabus document, diary attachment, or leave document).
- [ ] Confirm the file appears in the Cloudflare R2 bucket (`Object Storage` → your bucket → Objects tab).
- [ ] Trigger a backend redeploy (e.g. push any commit, or manually redeploy on Render) → after it finishes, reload the app and confirm the previously uploaded file is still viewable/downloadable (this is the actual point of using R2 instead of the host's local disk, which wipes on every redeploy).

## 12. PWA / installability

- [ ] On a phone (or desktop Chrome), open the deployed URL → browser offers "Add to Home Screen" / install prompt.
- [ ] Install it → launches full-screen with the app icon and no browser chrome, matching the brand icon/splash.
- [ ] Turn off WiFi/data briefly after first load → app shell still opens (service worker cache), even though live data obviously requires connectivity.

## 13. Responsiveness & theme

- [ ] Resize from ~375px (mobile) through ~820px (tablet) to desktop on every major page — sidebar becomes a slide-in drawer with backdrop below `md` (768px), no horizontal page overflow, tables scroll independently instead of breaking layout.
- [ ] On mobile, open the drawer via the hamburger icon, navigate to another page, confirm it auto-closes.
- [ ] Toggle dark/light theme on a few key pages (dashboard, syllabus, attendance) → confirm both themes render cleanly, no invisible text or unstyled flashes.

## 14. Env-driven config sanity

- [ ] Confirm `.env` is git-ignored and never committed.
- [ ] Confirm the app works with either `LLM_PROVIDER=ollama` or `LLM_PROVIDER=groq`, and either `STORAGE_PROVIDER=local` or `STORAGE_PROVIDER=r2`, without any code changes — purely env vars.
