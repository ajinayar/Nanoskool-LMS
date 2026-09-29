# Go-live security checklist

## Must do

- [ ] Rotate every credential that appeared in the v1 code (MongoDB users, SMTP password, storage keys, SSH password, JWT key) and purge `.env` / `connection.js` from v1 git history.
- [ ] Set a new `JWT_ACCESS_SECRET` (64+ random bytes). Never reuse the v1 `KEY`.
- [ ] `NODE_ENV=production`, `COOKIE_SECURE=true`, HTTPS only.
- [ ] `CORS_ORIGINS` lists only your real web domains.
- [ ] MongoDB is not reachable from the internet, has authentication on, and is backed up daily (test a restore).
- [ ] `STORAGE_DRIVER=s3` with a bucket that is not listable; uploaded file names are random.
- [ ] SMTP configured so invites and resets are delivered.
- [ ] Change the demo passwords, or never run `npm run seed` on production.

## Built in

- bcrypt (cost 12) password hashes only; no plaintext storage or emailing of passwords.
- Invite links (7 days) and reset links (1 hour) are single use and stored as SHA-256 hashes.
- Access tokens expire after 15 minutes; refresh tokens rotate, are stored hashed, and a reused token revokes the user's sessions.
- Sign-in: 10 attempts per account and IP per 15 minutes, account lock for 15 minutes after 5 failures, identical errors for unknown users and wrong passwords.
- Role and relationship checks on the server for every route (`server/src/lib/access.ts`), with tests proving isolation.
- Zod validation on every request body and query; Mongo operator injection is rejected.
- Rich text is sanitised on the server (sanitize-html) and again in the browser (DOMPurify); iframes only from YouTube and Vimeo.
- Upload allow-list by MIME type, 25 MB limit.
- Helmet headers, no `x-powered-by`, generic 500 errors, credentials redacted from logs.
- Audit log (`auditlogs`) of admin actions: account creation, suspension, resets, course grants, imports.

## Children's data (India DPDP Act 2023)

The platform holds data about minors. Before launch, have a lawyer confirm your obligations, in particular verifiable parental consent, purpose limitation, and deletion on request. v2 collects only what the features use (no Aadhaar or financial data) and keeps AI chats per user; add a retention period for AI chats and attendance if your policy needs one.
