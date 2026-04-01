# Linear BCF Connector

A Railway service that bridges **Solibri** (via the BCF Live Connector) with **Linear** issue tracking.

## Features

- **BCF API 3.0 server** — Solibri connects via OAuth2 client-credentials and interacts with topics (Linear issues), comments, and viewpoints
- **Linear OAuth** — one-click authorisation flow; access token stored securely per user
- **Auth0 organisation login** — all users authenticate via Auth0 (supports organisation SSO)
- **PostgreSQL database** (via Prisma 7 + `@prisma/adapter-pg`) — stores OAuth tokens, project mapping, BCF server config, and priority labels
- **BCF ZIP import** — upload a `.bcf` / `.bcfzip` file to bulk-create Linear issues
- **Sync** — pull users, workflow states, and labels from Linear and expose them through the BCF extensions endpoint
- **Settings UI** — configure the target Linear team/project, BCF server URL, Solibri remote credentials, and priority label colours

## Quick Start

### 1. Environment Variables

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH0_DOMAIN` | Auth0 tenant domain (`your-tenant.auth0.com`) |
| `AUTH0_CLIENT_ID` | Auth0 application client ID |
| `AUTH0_CLIENT_SECRET` | Auth0 application client secret |
| `AUTH0_SECRET` | Random 32-byte secret for cookie encryption (`openssl rand -hex 32`) |
| `AUTH0_ORGANIZATION_ID` | Auth0 org ID (optional) |
| `LINEAR_CLIENT_ID` | Linear OAuth app client ID |
| `LINEAR_CLIENT_SECRET` | Linear OAuth app client secret |
| `LINEAR_REDIRECT_URI` | Must match `<APP_URL>/api/auth/linear/callback` |
| `NEXT_PUBLIC_APP_URL` | Public URL of this deployed service |

### 2. Auth0 Setup

1. Create a **Regular Web Application** in the Auth0 Dashboard
2. Set **Allowed Callback URLs** to `<APP_URL>/auth/callback`
3. Set **Allowed Logout URLs** to `<APP_URL>`
4. (Optional) Create an **Organisation** and set `AUTH0_ORGANIZATION_ID`

### 3. Linear OAuth App

1. Go to **Linear Settings → API → OAuth Applications → New**
2. Set redirect URI to `<APP_URL>/api/auth/linear/callback`
3. Copy Client ID and Secret to `.env.local`

### 4. Database

```bash
npm run db:push       # Push schema to DB (no migrations)
# or
npm run db:migrate    # Create and run migrations
```

### 5. Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to Auth0 login.

## Solibri BCF Live Connector Setup

1. Log in and navigate to **Dashboard**
2. Connect your Linear account under **Settings → Linear**
3. Select the target team
4. Find your **BCF Server URL**, **Client ID**, and **Client Secret** on the Dashboard
5. In Solibri: add a new BCF Live Server with:
   - **URL**: `<APP_URL>/api/bcf/3.0`
   - **OAuth2 token URL**: `<APP_URL>/api/bcf/3.0/auth/token`
   - **Client ID / Secret**: from the Dashboard

## Deployment on Railway

1. Create a new Railway project
2. Add a **PostgreSQL** plugin
3. Add environment variables
4. Deploy from this repository — Railway auto-detects `railway.json`

The `railway.json` runs `npx prisma migrate deploy && npm start` on startup.

## API Routes

| Route | Description |
|---|---|
| `GET /api/bcf/versions` | BCF version discovery |
| `POST /api/bcf/3.0/auth/token` | OAuth2 client-credentials token endpoint |
| `GET /api/bcf/3.0/current-user` | Authenticated user info |
| `GET /api/bcf/3.0/extensions` | Available statuses, types, priorities, labels |
| `GET /api/bcf/3.0/projects` | List projects (Linear teams) |
| `GET/POST /api/bcf/3.0/projects/:id/topics` | List / create topics (Linear issues) |
| `GET/PUT/DELETE /api/bcf/3.0/projects/:id/topics/:tid` | Get / update / delete a topic |
| `GET/POST /api/bcf/3.0/projects/:id/topics/:tid/comments` | List / add comments |
| `GET/POST /api/bcf/3.0/projects/:id/topics/:tid/viewpoints` | List / add viewpoints |
| `POST /api/import-bcf` | Import a BCF ZIP file |
| `GET/POST /api/sync` | Sync / get Linear users, statuses, labels |
| `GET/POST /api/settings` | Get / save user settings |
| `GET /api/auth/linear` | Start Linear OAuth flow |
| `GET /api/auth/linear/callback` | Linear OAuth callback |
