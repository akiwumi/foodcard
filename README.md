# Food Card

A responsive recipe app built with React, Vite, styled-components, and Supabase.

## Features

- Mobile and desktop splash screen using the provided launch artwork
- Live recipe search from TheMealDB
- Dedicated discover, cookbook, and settings pages
- Supabase email/password login and registration
- Password recovery flow
- Per-user Supabase cookbook storage
- Per-user saved settings and editable avatar

## Local setup

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` and set:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SUPABASE_REDIRECT_URL=http://localhost:5173
```

Then run the SQL in [SUPABASE.md](/Users/eugene/WebDev Archive/recipe-card-app/SUPABASE.md).

## Vercel environment variables

Add the same variables in your Vercel project settings:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_REDIRECT_URL`

For production, `VITE_SUPABASE_REDIRECT_URL` should be your deployed site URL, for example `https://your-app.vercel.app`.
