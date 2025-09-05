# Love Letter — final (Supabase + Netlify)

## Features
- Multi-discipline (up to 3) with inclusive list.
- Name/image link to profile; clean pink/neutral aesthetic.
- Submission disclaimer; awaiting-moderation banner.
- Directory shows approved entries only.
- Admin page (`#/admin`) for Approve/Reject using Netlify Function.
- Larger `cities.json`, SPA redirects in place.

## Fresh Supabase schema
```sql
create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  art_types text[] not null,
  location text not null,
  bio text,
  images jsonb default '[]'::jsonb,
  links jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  approved boolean default false
);
alter table submissions enable row level security;
create policy "insert submissions" on submissions for insert to anon with check ( true );
create policy "read approved" on submissions for select to anon using ( approved = true );
```

## Netlify env vars
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_SHOW_ADMIN_HINT=false   (set true while testing if you want the hint)
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE
- ADMIN_KEY

## Build
- Build command: `npm run build`
- Publish dir: `dist`
- Functions: `netlify/functions`

## Flow
- Submit → awaiting moderation.
- Admin approves → appears on Directory → profile accessible at `#/artist/:id`.
