# Student Club & Event Management System

A comprehensive management system for university clubs and events, built with React, TypeScript, and Supabase.

## Project Structure
- `/client`: Frontend application (React + Vite + Material UI)
- `/docs`: Project guides, route maps, reports, and setup notes
- `/supabase`: Edge functions, migrations, and manual support patches
- `supabase_schema.sql`: Master database schema and security policies

##  Getting Started

### 1. Database Setup (Supabase)
1. Create a new project on [Supabase](https://supabase.com).
2. Go to the **SQL Editor** in the Supabase dashboard.
3. Paste the contents of `supabase_schema.sql` (found in the root directory) and run it. This will create all tables, indexes, and RLS policies.

### 2. Frontend Installation
Navigate to the `client` directory:
```bash
cd client
npm install
```

### 3. Environment Configuration
Create a `.env` file in the `client` directory with your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🛠️ Available Commands

### Development
Run the app in development mode with Hot Module Replacement (HMR):
```bash
cd client
npm run dev
```

### Production Build
Validate the code and build for production:
```bash
cd client
npm run build
```

### Linting
Check for code style and quality issues:
```bash
cd client
npm run lint
```

### TypeScript Validation
Run a deep check of TypeScript types without building:
```bash
cd client
npx tsc -b
```

## Project Notes

- Technical stack summary: `TECH_STACK.md`
- Extended deployment/setup/reference docs: `docs/`

## 👥 Roles & Access
- **Admin**: Full system control, event approvals, global settings.
- **Coordinator**: Club management, event creation (requires approval), registration tracking.
- **Student**: Club memberships, event registration, certificates, and feedback.

## Supabase Storage Buckets (Certificates)

This project uploads generated certificate PDFs to a Supabase Storage bucket named `certificates`.

Please create a storage bucket with that exact name in your Supabase project and set appropriate public access if you want direct public URLs. Alternatively, keep it private and serve files through signed URLs from your backend.

Steps:

1. Open your Supabase dashboard → Storage → Create new bucket
2. Set bucket ID to `certificates`
3. Choose public or private depending on your requirements
4. (Optional) Configure CORS if serving from a different domain

Note: The client code expects a `certificates` bucket and will call `getPublicUrl` for file links. If you keep the bucket private, update `useCertificates.js` to use signed URLs instead.

## Supabase Edge Functions (Attendance QR)

This project includes two example Supabase Edge Functions to support QR-based attendance:

- `generate-attendance-token`: creates a single-use token saved in `attendance_tokens` and returns it.
- `validate-attendance`: accepts a token and `userId`, validates it, marks the matching registration as present, and marks the token as used.

To deploy these functions:

1. Install the Supabase CLI: `npm install -g supabase`
2. Login and link your project: `supabase login` then `supabase link --project-ref <your-project-ref>`
3. From the repo root run:

```bash
cd supabase/functions/generate-attendance-token
supabase functions deploy generate-attendance-token

cd ../validate-attendance
supabase functions deploy validate-attendance
```

4. Set environment variables for the functions (service role key required to write attendance):

```bash
supabase secrets set SUPABASE_URL="https://xyz.supabase.co" SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
```

5. After deployment, the client uses `supabase.functions.invoke('generate-attendance-token')` to request new tokens. Students should POST scanned tokens to the `validate-attendance` function (or the app can call via `supabase.functions.invoke('validate-attendance', { body })`).

Security note: These functions use the Supabase service role key. Protect access and restrict who can invoke `generate-attendance-token` (e.g., check the authenticated user club match inside the function if needed).

Important function env vars: set both `SUPABASE_SERVICE_ROLE_KEY` (already required) and `SUPABASE_ANON_KEY` so the `generate-attendance-token` function can verify the caller's JWT and profile before issuing tokens.
