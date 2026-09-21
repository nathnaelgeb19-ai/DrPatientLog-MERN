# DrPatientLog — MERN Edition

A complete React + Express + MongoDB rebuild of DrPatientLog, designed as a separate replacement project. The original Flask/Python application is not modified.

## Included

- Secure cookie/JWT authentication and first-run administrator setup
- Multiple doctor accounts, admin role, doctor switching with target password, protected deletion
- Patient registration/edit/delete/search/date filtering
- Card number and ticket number
- Ethiopian calendar conversion
- Procedure presets and fee suggestion
- Doctor percentage earnings with explicit calculation
- Dashboard: today / 7 days / Ethiopian month / all time
- Ethiopian-month earnings and salary closure workflow
- Current month cannot be closed; completed months become closable after the next Ethiopian month begins
- Pagume model retained for carry-forward handling
- Audit log
- CSV export/import endpoint
- Local JSON database backup and restore
- Telegram daily/monthly report endpoints and test messaging
- Clinic settings and reporting times
- Responsive React UI with modern clinical styling
- Production mode can serve the React build from the Express server
- Health endpoint for uptime monitoring

## Run locally

### Server
1. `cd server`
2. Copy `.env.example` to `.env`
3. Set `MONGODB_URI` and a long random `JWT_SECRET`
4. `npm install`
5. `npm run dev`

### Client
1. `cd client`
2. `npm install`
3. `npm run dev`

The Vite client defaults to `/api`; for separate development set `VITE_API_URL=http://localhost:5000/api` and `CLIENT_ORIGIN=http://localhost:5173`.

## Production

The simplest deployment is one Node service on Render that builds `client` and starts `server`. MongoDB Atlas is the database target. Do not put production secrets in GitHub. Use environment variables.

## Existing DrPatientLog database

The existing Neon/PostgreSQL database is NOT modified by this project. A deliberate PostgreSQL → MongoDB migration should be done only after validating the new application against a backup copy. The included JSON backup/restore format is for the MERN database and is intentionally separate from PostgreSQL `pg_dump` files.

## External integrations

Telegram is implemented directly through the Bot API and uses each doctor's encrypted-in-transit server-side credentials. Google Drive backup is left as a deployment integration point because OAuth credentials and Drive ownership are environment/account-specific; no production credential is included.

### Cron-job.org

For hosts that sleep, use the included `POST /api/cron/daily` endpoint with the `x-cron-secret` header (or `?secret=`) to trigger the daily report/backup externally. The internal node-cron job is also included for always-on deployments.

### PostgreSQL → MongoDB migration

`server/scripts/migrate-from-postgres.js` is an opt-in migration helper. It preserves the existing password hashes so users do not need to change passwords during migration. Set `SOURCE_DATABASE_URL` to a verified staging/backup PostgreSQL database and `MONGODB_URI` to the new MongoDB database before running it. Never run it against production until the MERN application has been validated.
