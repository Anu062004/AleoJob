# Backend (AleoJob)
This folder contains **backend-related** code and assets for AleoJob:

- `backend/api/`: copies of the Next.js route handlers (source of truth still lives in `app/api/` because Next.js requires that path)
- `backend/lib/`: backend utilities (Supabase, JWT, proof verifier, encryption helpers, shared types)
- `backend/supabase/`: database migrations + storage policy SQL
- `backend/docs/`: backend docs

## Why `app/api/` still exists
Next.js App Router only loads API routes from `app/api/**/route.ts`.  
So we **mirror** those handlers here for organization, but the working routes remain in `app/api/`.


