# Nanoskool LMS v2

A multi-school learning platform for STEM, coding and robotics. Nanoskool writes the curriculum once, gives it to partners and schools, and schools teach it to their classes. There are six logins, each with its own portal:

| Role | Where | What they do |
| --- | --- | --- |
| Super admin | Web `/admin` | Partners, schools, all users; course studio (courses, chapters, units, quizzes); course access; company-wide announcements and events |
| Partner | Web `/partner` | Their schools and school admins; pass their courses on to schools; school reports |
| School admin | Web `/school` | Classes, teachers, students (incl. CSV bulk import), parents; assign courses and teachers to classes; attendance, progress and school reports; school settings |
| Teacher | Web `/teacher`, mobile | Classes and rosters, attendance, assignments and grading, class quizzes and results, remarks to parents, progress grids, NanoBot teaching assistant |
| Student | Web `/student`, mobile | Courses and lessons with progress, assignments (submit and see grades), quizzes (timed, auto-graded), report card, NanoBot tutor |
| Parent | Web `/parent`, mobile | Each child's progress, grades, attendance, remarks; school news and events |

This replaces the five v1 codebases (Nanoskool-MS, SU-MS, Mobile-MS, Web, SU-Web) with one API, one web app and one mobile app.

```
nanoskool-lms/
├── server/   API: Node 22, TypeScript, Express 5, Mongoose 8, Zod, JWT
├── web/      Web app: React 19, TypeScript, MUI 9, TanStack Query, Vite
├── mobile/   Flutter app for students, parents and teachers
├── docker-compose.yml, .github/workflows/ci.yml
└── docs/     Migration and security notes
```

## Run it locally

You need Node 22 and MongoDB 7 (local install, Docker `docker run -p 27017:27017 mongo:7`, or MongoDB Atlas).

```bash
# 1. API
cd server
cp .env.example .env          # for local dev you can leave most values empty; set NODE_ENV=development
npm install
npm run seed -- --reset       # demo data (wipes the database: development only)
npm run dev                   # http://localhost:4000/api/health

# 2. Web app (new terminal)
cd web
npm install
npm run dev                   # http://localhost:5173
```

Demo sign-ins after seeding:

| Role | Sign-in | Password |
| --- | --- | --- |
| Super admin | admin@nanoskool.in | Admin@12345 |
| Partner | partner@demo.nanoskool.in | Demo@1234 |
| School admin | school@demo.nanoskool.in | Demo@1234 |
| Teacher | teacher@demo.nanoskool.in | Demo@1234 |
| Student | student@demo.nanoskool.in or username `aarav.gvps` | Demo@1234 |
| Parent | parent@demo.nanoskool.in | Demo@1234 |

The mobile app: see `mobile/README.md` (`flutter run --dart-define=API_URL=http://10.0.2.2:4000/api`).

## Tests

```bash
cd server && npm test     # 129 API tests against a real MongoDB (nanoskool_test database)
cd web && npm run build   # type-check + production build
```

The API tests cover sign-in, lockout, token rotation, invites and resets; that **every** protected route rejects anonymous calls; tenant isolation between partners, schools, classes, parents and students; course access rules; server-side quiz grading with hidden answers; the assignment, attendance and remark flows; HTML sanitising; AI metering; and the v1 data migration.

## Production

```bash
cp server/.env.example server/.env    # set JWT_ACCESS_SECRET, CORS_ORIGINS, APP_URL, SMTP, S3, AI settings
docker compose up -d --build          # web on :8080, API behind it at /api
```

Put TLS in front (Caddy, Nginx, a cloud load balancer or Cloudflare). Use `STORAGE_DRIVER=s3` with your Vultr bucket so uploads survive redeploys, and a managed or backed-up MongoDB. CI (`.github/workflows/ci.yml`) type-checks, tests and builds all three apps on every push; add your deploy step after it.

### Key settings (`server/.env`)

- `JWT_ACCESS_SECRET`: long random string (`openssl rand -hex 64`). The API refuses to start in production without it.
- `CORS_ORIGINS`, `APP_URL`, `PUBLIC_API_URL`: your real domains.
- `SMTP_*`: invites and password resets. Without SMTP, emails are printed to the log.
- `STORAGE_DRIVER`, `S3_*`: file uploads.
- `AI_PROVIDER`: `mock` (offline demo answers), `nanobot` (forward to the existing chatbot.nanoskool.in service with `NANOBOT_SERVICE_SECRET`), or `anthropic` (call Claude directly with `ANTHROPIC_API_KEY`). Each school has a monthly AI token allowance (`aiMonthlyTokens`, set by the super admin).

## Moving data from v1

`server/src/scripts/migrate-legacy.ts` copies partners, schools, classes (grade + division), every login with its profile, courses, chapters, units with their uploaded files, course grants and teacher/class assignments. It keeps the old record ids and bcrypt hashes, so people sign in with their current password, but every migrated account must choose a new one at first sign-in. The old `real_password` field is never read.

```bash
cd server
LEGACY_MONGO_URI="mongodb://<old>/prodnanoskooldb" MONGO_URI="mongodb://<new>/nanoskool" npm run migrate:legacy            # dry run + report
LEGACY_MONGO_URI="..." MONGO_URI="..." npm run migrate:legacy -- --commit                                                    # write
```

Run it against a **copy** of production first and check the report. See `docs/MIGRATION.md`.

## Security model (what changed from v1)

- No secrets in code. All configuration comes from environment variables; `.env` is git-ignored.
- Passwords are only stored as bcrypt hashes (cost 12). No plaintext copies, and passwords are never emailed: users with email get a one-time invite link; students without email get a one-time password shown to the admin once, which must be changed at first sign-in.
- Short-lived access tokens (15 min) plus rotating refresh tokens (httpOnly cookie on web, secure storage on mobile) with reuse detection. Suspending a user takes effect immediately.
- Every route authenticates, and the server checks role **and** relationship: tenant (partner, school), class taught, own child, own record. The UI's role checks are only for convenience.
- No public sign-up. Accounts are created by admins.
- Rate-limited sign-in with account lockout, Helmet security headers, CORS allow-list, validated input (Zod) on every endpoint, sanitised rich text, upload type and size limits, no internal errors leaked to clients, and an audit log of admin actions.

See `docs/SECURITY.md` for the checklist before go-live.
