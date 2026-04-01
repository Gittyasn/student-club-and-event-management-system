# Present Project Tech Stack

This file documents the current technologies and tools used in this project.

## Project Type

- Full-stack university club and event management system
- Frontend app in `client/`
- Backend platform on Supabase
- AI handled through a Supabase Edge Function

## Frontend

- React 19
- React DOM 19
- Vite 7
- React Router DOM 7
- Material UI 7
- MUI Icons
- Emotion
- Tailwind CSS
- Framer Motion
- Radix UI primitives

## State, Data, and Forms

- Zustand
- TanStack React Query
- React Hook Form
- Zod

## Backend and Database

- Supabase
- PostgreSQL
- Row Level Security (RLS)
- Supabase Realtime
- Supabase Storage
- Supabase Edge Functions

## Supabase Features Used

- Authentication
- Database tables and policies
- Realtime chat and notifications
- Storage bucket for certificates
- Edge Functions for AI assistant
- Edge Functions for attendance token generation and validation

## AI Integration

- OpenAI API
- Model currently used in edge function: `gpt-4o-mini`
- AI requests go through `supabase/functions/chat-assistant/index.ts`
- Client AI UI connects through the Supabase function, not direct browser OpenAI usage

## Charts, Reports, and Analytics

- Recharts

## PDF, QR, and File Features

- pdf-lib
- qrcode
- react-qr-reader
- react-dropzone

## Utility Libraries

- dayjs
- clsx
- class-variance-authority
- sonner
- lucide-react
- react-icons
- tailwind-merge
- tailwindcss-animate

## Development and Build Tools

- Node.js
- npm
- ESLint 9
- Vite production build

## Current Important Project Files

- `client/package.json` - frontend dependencies and scripts
- `client/vite.config.js` - Vite config and build chunking
- `supabase/functions/chat-assistant/index.ts` - AI edge function
- `supabase/migrations/` - permanent database migrations
- `supabase/manual-patches/` - manual SQL fixes and production support patches

## Current Build Commands

- `cd client`
- `npm install`
- `npm run dev`
- `npm run build`
- `npm run lint`

## Current Build Status

- Production build is passing
- Project uses optimized manual chunk splitting in Vite
