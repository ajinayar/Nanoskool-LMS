# Migrating from Nanoskool v1

## Before you start

1. **Rotate every v1 credential first.** The v1 code contained live MongoDB, SMTP, storage and SSH credentials. Assume they are compromised.
2. Take a full backup of the v1 database (`mongodump`).
3. Restore that backup to a separate database and run the migration against the copy, not production.

## How it maps

| v1 collection | v2 | Notes |
| --- | --- | --- |
| `partners` | `partners` | name, code, contact, status |
| `schools` | `schools` | name, code, partner, address, principal, logo |
| `grades` + `grade_divisions` | `classsections` | one class per school + grade + division; class teacher kept |
| `logins` + `students` / `teachers` / `parents` | `users` | role from `role_id` (map in `LEGACY_ROLES`), bcrypt hash kept, `mustChangePassword = true` |
| `parents.student_id` | `users.childIds` | parents with several children are grouped under one login |
| `courses`, `chapters`, `units` | same | positions kept |
| `unitsuploads.units_content` | `units.videoUrl` / `fileUrl` / resource links | first video and first PDF become the unit's media; other files are listed as links |
| `assigncoursestopartners` / `assigncoursestoschools` | `coursegrants` | |
| `assign_courses` | `classcourses` | teacher + class + course; the school also gets a grant for that course |

Not migrated (rebuild or re-enter in v2 if needed): assessments and their answers, v1 quizzes, projects and project images, sliders, newsletters, company news, events, tickets, student history, category/sub-category trees, location masters (country/state/district/town).

## Run

```bash
cd server
export LEGACY_MONGO_URI="mongodb://user:pass@host/prodnanoskooldb-copy"
export MONGO_URI="mongodb://user:pass@host/nanoskool"
npm run migrate:legacy            # dry run: counts and a list of skipped records
npm run migrate:legacy -- --commit
```

The script upserts by the v1 `_id`, so it can be re-run after fixing data. Check the skipped list: common reasons are logins with unknown `role_id`, non-bcrypt passwords, duplicate emails, and students whose grade/division has no matching class.

## After

- Sign in as a few migrated users of each role and check their school, class and courses.
- Tell users they will be asked to choose a new password.
- Keep v1 read-only for a few weeks, then switch it off.
