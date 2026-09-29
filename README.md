# Task Tracker

Full-stack task management app with authentication, filtering, search, and pagination.

**App:** https://frontend-phi-sage-42.vercel.app/
**API:** https://task-tracker-app-0ft7.onrender.com

> Backend is hosted on Render's free tier and spins down after inactivity. First request after idle time may take 30–60s.

## Stack

**Backend:** Node.js, TypeScript, Express, MongoDB (Mongoose), Redis, JWT, Jest + Supertest
**Frontend:** Next.js 16 (App Router, TypeScript), Tailwind CSS v4, React Context

## Structure

\`\`\`
Task-Tracker-App/
├── Backend/     Express API — auth, task CRUD, Redis caching
├── Frontend/    Next.js client
└── README.md
\`\`\`

## Features

- JWT auth via httpOnly cookie (signup, login, logout, session check)
- Task CRUD with per-user ownership enforcement
- Status, date-range (past/upcoming), and due-date filtering
- Title search (case-insensitive substring match)
- Paginated task list
- Redis-backed caching on the default task query, invalidated on write
- Optimistic UI updates on delete and mark-as-done, with rollback on failure
- 93%+ backend test coverage (unit + integration)

## Local setup

Requires a MongoDB connection (Atlas or local) and a Redis connection (Upstash or local).

### Backend

\`\`\`bash
cd Backend
npm install
cp .env.example .env
npm run dev
\`\`\`

Runs on `http://localhost:5000`.

| Variable | Description |
|---|---|
| `PORT` | Server port (default 5000) |
| `MONGO_URI` | MongoDB connection string |
| `REDIS_URL` | Redis connection string (`rediss://` for Upstash) |
| `JWT_SECRET` | JWT signing secret |
| `JWT_EXPIRES_IN` | Token expiry (e.g. `7d`) |
| `CLIENT_URL` | Frontend origin, used for CORS |
| `NODE_ENV` | `development` / `production` — controls cookie `secure`/`sameSite` |

\`\`\`bash
npm test              # run test suite
npm run test:coverage # with coverage report
\`\`\`

### Frontend

\`\`\`bash
cd Frontend
npm install
cp .env.example .env.local
npm run dev
\`\`\`

Runs on `http://localhost:3000`. Backend must be running with a matching `CLIENT_URL`, or requests fail on CORS.

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL |

`NEXT_PUBLIC_` prefix required since these calls originate client-side.

## Auth

JWT is issued as an httpOnly cookie on login/signup and never touched directly by client code. Requests set `credentials: "include"` to carry the cookie automatically.

Frontend and backend run on separate domains in production (Vercel / Render), which makes the cookie cross-site by default. `Frontend/next.config.ts` proxies `/api/*` through the frontend's own domain via a Next.js rewrite, so the cookie is set and read as first-party. This avoids third-party cookie blocking in browsers that restrict it (Incognito, Safari ITP, etc).

## State management

No external state library. Auth state (consumed in a few places — nav, dashboard guard) lives in React Context. Task list state is local to the dashboard route, since nothing else consumes it. Optimistic updates are implemented in the dashboard's handlers, not the API client — `Frontend/lib/` stays a pure HTTP layer with no React dependency.

## Caching strategy

Redis caches only the default task query (page 1, no filters/search), keyed per user, invalidated on any create/update/delete for that user. Filtered, searched, and paginated (page > 1) requests bypass cache and hit MongoDB directly — caching every filter permutation would require a more complex invalidation scheme that isn't justified at this scale.

## Design notes

- Search uses a MongoDB regex match (case-insensitive substring), not fuzzy/typo-tolerant matching — would require Atlas Search or a dedicated library for that.
- Task creation is not optimistic; the client waits for server confirmation before updating state.
- Color scheme is forced to light mode — native form controls (date pickers, selects) render illegibly against dark OS themes without it.
- Pagination is offset-based (`skip`/`limit`) rather than cursor-based, sufficient at this scale.

## Deployment

- **Frontend:** Vercel — https://frontend-phi-sage-42.vercel.app/
- **Backend:** Render — https://task-tracker-app-0ft7.onrender.com

`NEXT_PUBLIC_API_URL` (Vercel) points at the Render backend. `CLIENT_URL` (Render) is set to the Vercel domain. `NODE_ENV=production` on Render enables `secure`/`sameSite=none` cookies, required alongside the rewrite proxy for cross-domain auth to work.