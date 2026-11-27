# Hakim Log

Hakim Log is a clinic management application for dental practices. It combines a React web interface with an Express API and MongoDB database. The app supports patient and treatment records, payments, clinic reporting, doctor accounts, and administrative backup tools.

## Features

- Patient registration, search, treatment history, and records management
- Treatment fee presets, ticket and card numbers, and Ethiopian calendar dates
- Payment tracking with doctor earnings and outstanding balances
- Dashboard summaries, monthly reports, salary closures, and calendar views
- Multiple doctor accounts with administrator controls and account switching
- Secure, HTTP-only cookie sessions and password reset by email
- Per-doctor Telegram reports and notifications
- JSON database backup and restore, CSV patient import/export, and Google Drive backup
- Audit history for administrative and account actions
- Scheduled daily reports, monthly reports, and automatic backups
- Responsive React interface

## Requirements

- Node.js 20 or later
- npm
- MongoDB, local or hosted

## Run locally

Open two terminals from the repository root.

### 1. Configure the server

```powershell
cd server
Copy-Item .env.example .env
```

Edit `server/.env` and set at least:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/hakim
JWT_SECRET=use-a-long-random-secret
CLIENT_ORIGIN=http://localhost:5173
```

Install dependencies and start the API:

```powershell
npm install
npm run dev
```

The API listens on `http://localhost:5000` by default. It connects to MongoDB, creates any missing default procedure presets and clinic settings, and then starts its scheduled jobs.

### 2. Start the web client

In a second terminal, from the repository root:

```powershell
cd client
npm install
npm run dev
```

Open the Vite URL shown in the terminal, normally `http://localhost:5173`. Vite forwards `/api` requests to the local server. To use another API address, set `VITE_API_URL` in `client/.env` (see `client/.env.example`).

On the first visit, create the initial administrator account. Initial setup is available only while the database has no doctor accounts.

## Configuration

The server reads environment variables from `server/.env`.

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | Set to `production` for production cookie and static-file behavior. |
| `PORT` | API port; defaults to `5000`. |
| `MONGODB_URI` | MongoDB connection string; defaults to local database `hakim`. |
| `JWT_SECRET` | Secret used to sign session tokens. Set a long, unique value. |
| `CLIENT_ORIGIN` | Allowed browser origin for credentialed API requests. |
| `CRON_SECRET` | Optional shared secret for the manual cron endpoints. |
| `BACKUP_DIR` | Directory for generated backup files; defaults to `/tmp/hakim-backups`. |
| `RESEND_API_KEY` | Optional Resend API key for password reset email. |
| `EMAIL_FROM` | Sender address for password reset email. |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID for Drive backup. |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret. |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL; defaults to the local callback URL. |
| `GOOGLE_DRIVE_FOLDER_ID` | Optional Drive folder ID for uploaded backups. |

The client variable `VITE_API_URL` sets the API base URL. In local development, it defaults to the Vite proxy at `/api`.

## Scheduled jobs and integrations

The server schedules the daily Telegram report, Ethiopian month-end report, and automatic backup using clinic settings. The default time is 19:00 in the `Africa/Addis_Ababa` timezone. Telegram and Google Drive credentials are configured in the app or through the Google OAuth setup; password reset email requires Resend configuration.

The scheduled jobs run inside the Node process. If the hosting service suspends or stops that process, scheduled jobs do not run while it is offline. The health endpoint is `GET /api/health` and reports whether MongoDB is reachable.

Manual cron endpoints are under `/api/cron`:

- `POST /api/cron/daily`
- `POST /api/cron/monthly-report`
- `POST /api/cron/backup`
- `POST /api/cron/automatic-backup`

When `CRON_SECRET` is set, send it in the `x-cron-secret` header. The endpoints also accept `secret` or `key` as a query parameter.

## Production build

From the repository root:

```sh
npm run build
```

This installs the client dependencies and creates `client/dist`. Configure the server environment, including `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, and the deployed `CLIENT_ORIGIN`, then install server dependencies and start the application:

```sh
cd server
npm install
npm start
```

In production mode, Express serves the built client and API from the same service. Deploy the root build command and `npm start` command on a Node host, and provide a persistent MongoDB database. Keep secrets in the hosting provider's environment configuration, not in source control.

## Data and migration

Hakim Log uses MongoDB. It does not automatically modify or connect to the existing PostgreSQL/Neon database. The optional migration script is `server/scripts/migrate-from-postgres.js`; it copies doctors, patients, salary closures, audit records, and settings, and retains existing password hashes.

Only run the migration after validating it with a database backup or staging copy. Provide `SOURCE_DATABASE_URL` for the source PostgreSQL database and `MONGODB_URI` for the destination, then run it from the `server` directory:

```sh
node scripts/migrate-from-postgres.js
```

The JSON backup and restore tools are for Hakim Log's MongoDB data; they are not PostgreSQL dump tools.
