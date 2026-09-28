# Task Tracker — Frontend

Next.js (App Router) frontend for the Task Tracker app. Talks to the Express/MongoDB/Redis backend in `../Backend`.

**Live app:** https://frontend-phi-sage-42.vercel.app/
**Backend API:** https://task-tracker-app-0ft7.onrender.com

Note: the backend is on Render's free tier, so it spins down after inactivity — the first request after a while can take 30–60 seconds to wake up.

## Stack

- Next.js 16 (App Router, TypeScript)
- Tailwind CSS v4
- React Context for auth state, plain `useState` for everything else

No Redux, no external state library — auth state is read in a handful of places (navbar, dashboard, route guards) so Context is enough, and the task list only ever lives on the dashboard page, so it stays local to that component.

## Getting started

\`\`\`bash
cd Frontend
npm install
\`\`\`

Create a `.env.local` file (copy `.env.example`):

\`\`\`bash
cp .env.example .env.local
\`\`\`

Set the API URL to wherever your backend is running:

\`\`\`
NEXT_PUBLIC_API_URL=http://localhost:5000
\`\`\`

Then run the dev server:

\`\`\`bash
npm run dev
\`\`\`

Visit `http://localhost:3000`.

**Note:** the backend must already be running (and its `CLIENT_URL` env var must match this app's origin) or requests will fail with a CORS error. See `../Backend/README.md`.

## Environment variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the backend API, e.g. `http://localhost:5000` or `https://task-tracker-app-0ft7.onrender.com` |

Prefixed with `NEXT_PUBLIC_` because these calls happen from the browser (Client Components), and Next only exposes `NEXT_PUBLIC_*` vars client-side.

## Project structure

\`\`\`
app/
  login/page.tsx           Login form
  signup/page.tsx          Signup form
  dashboard/page.tsx       Main task dashboard (protected route)
  layout.tsx               Root layout, wraps everything in AuthProvider
  page.tsx                 Landing page

components/
  TaskCard.tsx              Single task, handles its own mark-as-done countdown
  TaskList.tsx              Renders the grid of TaskCards, handles empty/loading states
  AddTaskModal.tsx          Create + edit task form (same modal, different mode)
  ConfirmDeletionModal.tsx  Confirmation prompt before deleting a task

context/
  AuthContext.tsx           Global auth state (user, loading, login, logout)

lib/
  api.ts                    Thin fetch wrapper — cookies, JSON headers, error handling
  auth.ts                   Typed functions: signup, login, logout, getMe
  tasks.ts                  Typed functions: getTasks, createTask, updateTask, deleteTask
  types.ts                  Shared TypeScript types matching the backend's models
\`\`\`

## How auth works

The backend issues a JWT as an httpOnly cookie on login/signup, so the frontend never touches the token directly. Every API call goes through `lib/api.ts`, which sets `credentials: "include"` so the cookie rides along automatically.

`AuthContext` checks `/api/auth/me` once on load to figure out if there's already a valid session (page refresh, etc). Until that check resolves, `loading` is `true` — this matters because the dashboard's route guard waits for `loading` to be `false` before deciding whether to redirect to `/login`. Skipping that check would occasionally bounce a logged-in user to the login page for a split second on refresh.

## State management notes

- **Task list, pagination, filters, search** — local `useState` in `app/dashboard/page.tsx`. Nothing outside that page needs this data.
- **Optimistic updates** — handled in the dashboard's handler functions (`handleDelete`, `handleMarkDone`), not in `lib/tasks.ts`. The `lib/` functions are pure API calls with no React involved; the dashboard updates `tasks` state immediately, fires the real request, and rolls back on failure.
- **Mark as done** has a 5-second undo window before the request actually fires — this lives entirely inside `TaskCard`, using a `setTimeout` for the real deadline and a CSS animation for the visible countdown ring. If you click undo in time, `onMarkDone` is never called, so no API request happens at all.

## Known limitations / things I'd do differently with more time

- Search is a case-insensitive substring match (backend does a regex query), not typo-tolerant fuzzy search. True fuzzy matching would need Atlas Search or a library like Fuse.js.
- Task creation isn't truly optimistic — the modal waits for the server to respond before closing, rather than inserting a placeholder task immediately. Simpler to reason about, costs one network round-trip of perceived delay.
- No dark mode toggle — the app forces `color-scheme: light` deliberately, since native form elements (dropdowns, date pickers) were rendering unreadable text against a dark OS theme.

## Deployment

- **Frontend:** deployed on Vercel — https://frontend-phi-sage-42.vercel.app/
- **Backend:** deployed on Render — https://task-tracker-app-0ft7.onrender.com

`NEXT_PUBLIC_API_URL` is set in the Vercel project's environment variables to point at the Render backend above, and the backend's `CLIENT_URL` is set to this app's Vercel domain (otherwise CORS blocks every request).