# MDA Earthwork Data Acquisition System

Marathi-language portal for the Mechanical Division (Alore) to log daily machine/vehicle
work, track fuel efficiency, and generate admin reports. React + Vite + TypeScript on the
frontend, Supabase (Postgres + Auth) as the backend.

Rebuilt from a static HTML/Google-Apps-Script original — see `legacy/` for the source zip.

## Setup

1. Create a Supabase project.
2. Run the migration in `supabase/migrations/0001_init.sql` against it (Supabase SQL editor,
   or `supabase db push` if the project is linked with the Supabase CLI).
3. Copy `.env.example` to `.env` and fill in your project's URL and anon key:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
4. Seed `subdivisions`, `machines`, `staff`, and `projects` with real data (the public
   entry form's dropdowns read from these tables).
5. Create admin accounts via Supabase Auth (dashboard: Authentication → Users → Add user,
   with a real email + password, "Auto Confirm User" checked). Then add a matching row to
   `profiles` linking that user's `id` to a `subdivision_id` (or `role = 'superadmin'` for
   a cross-subdivision account).
6. `npm install && npm run dev`

## Routes

- `/` — public daily work-log entry form
- `/dashboard` — public fuel efficiency dashboard
- `/login` — admin login
- `/admin` — report downloads (machine hours, GPS, attendance, pending payments)
- `/admin/attendance`, `/admin/pending`, `/admin/gps` — admin data entry for those reports

## Notes

- `work_logs` inserts are open to anonymous users (RLS), matching the original's publicly
  reachable submit endpoint. Everything else is scoped to the logged-in admin's subdivision
  via Postgres RLS (see the migration for policy details).
- The fuel dashboard reads through the `fuel_performance()` Postgres RPC rather than the raw
  `work_logs` table, so aggregate numbers are public without exposing individual entries.
- GPS/attendance/pending-payment schemas were invented for this rebuild (the original had no
  entry screens for them) — adjust field definitions in
  `supabase/migrations/0001_init.sql` and `src/types/database.ts` if real requirements differ.
