# Netlify Deploy Checklist

## 1) Confirm repository wiring
- `netlify.toml` exists and includes:
  - Build command: `npm run build`
  - Publish dir: `dist`
  - Functions dir: `netlify/functions`
  - Redirect: `/api/*` -> `/.netlify/functions/api/:splat`
- `netlify/functions/api.cjs` wraps `server/index.js` with `serverless-http`.

## 2) Set Netlify environment variables
Set these in Netlify: Site configuration -> Environment variables.

Required:
- `JWT_SECRET`
- One DB URL:
  - `SUPABASE_DB_URL` (recommended), or
  - `DATABASE_URL`, or
  - `POSTGRES_URL`

Recommended:
- `PGSSLMODE=require`

If using Supabase file storage:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET` (default: `uploads`)

Optional (email notifications):
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

Frontend API base in production:
- Set `VITE_API_BASE` to blank (empty) or do not set it.
- This keeps frontend calls on same-origin `/api/*`, which Netlify redirects to your function.

## 3) Deploy
- Push branch to GitHub.
- In Netlify, import the repository.
- Build settings:
  - Base directory: `my-dashboard` (if repo root contains this folder)
  - Build command: `npm run build`
  - Publish directory: `dist`
- Trigger deploy.

## 4) Verify after deploy
- Open site URL and test login.
- Verify API health endpoint:
  - `https://<your-site>.netlify.app/api/health`
  - Expected response: `{"ok":true}`
- Create/read tickets to confirm DB connectivity.
- If uploads are enabled, test file upload and retrieval.

## 5) Common failures
- `401/invalid token` after login:
  - Confirm `JWT_SECRET` is set and unchanged during active sessions.
- `Database connections will fail` warning:
  - DB URL env var missing in Netlify.
- File uploads fail in production:
  - Missing Supabase storage vars or bucket permissions.
