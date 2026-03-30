# Project Reference

## Overview
Student Club & Event Management System built with React, Vite, JavaScript, and Supabase.

This project supports three main roles:
- `Student`
- `Coordinator`
- `Admin`

Core product areas:
- authentication and role access
- club management and memberships
- event creation, approval, registration, attendance, results, and certificates
- notifications and realtime chat
- analytics and AI recommendations/governance

## Project Structure
- `client/`
  Frontend application built with React + Vite
- `supabase/`
  Database migrations, functions, and manual SQL patches
- `docs/`
  Project documentation and reference files

Important paths:
- [client](/c:/Users/pylak/student/student-club-event-management-system/client)
- [supabase](/c:/Users/pylak/student/student-club-event-management-system/supabase)
- [docs](/c:/Users/pylak/student/student-club-event-management-system/docs)

## Technology Stack

### Frontend
- React 19
- Vite 7
- React Router
- MUI
- TanStack React Query
- Zustand
- Framer Motion
- Recharts
- pdf-lib
- qrcode
- react-hook-form
- Zod

### Backend / Platform
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Supabase Realtime
- Supabase Row Level Security
- Supabase Edge Functions

### AI / Recommendation Layer
- OpenAI SDK
- Supabase RPC functions for recommendations
- AI governance flags in Supabase

## Main Modules

### Public
- landing page
- public clubs listing
- public events listing
- public event details
- public event results
- certificate verification

### Authentication
- student login
- coordinator login
- admin login
- registration
- forgot/reset password
- verify email

### Student Modules
- dashboard
- clubs and memberships
- browse events
- registrations
- attendance
- certificates
- notifications
- team chat
- club chat
- event chat
- leaderboard
- results
- analytics

### Coordinator Modules
- dashboard
- create event
- edit event
- event submissions
- registrations
- attendance
- teams
- results publishing
- event completion
- feedback
- certificates manager
- membership management
- coordinator analytics
- notification settings
- club chat

### Admin Modules
- dashboard
- clubs
- club categories
- event categories
- users
- approvals
- approval workflow/history/details
- memberships
- registrations overview
- attendance overview
- results overview
- certificates manager
- announcements
- broadcast channel
- budgets
- security dashboard
- performance dashboard
- analytics
- AI governance
- AI reports

## Database Areas
Main live tables used by the app:
- `profiles`
- `clubs`
- `club_memberships`
- `events`
- `registrations`
- `attendance_records`
- `results`
- `certificates`
- `notifications`
- `messages`
- `teams`
- `judges`
- `result_logs`

Important platform features:
- RBAC through profile role checks
- RLS for student/coordinator/admin access separation
- Storage protection for certificates
- realtime chat and notifications


## How To Run

### 1. Go to client
```powershell
cd c:\Users\pylak\student\student-club-event-management-system\client
```

### 2. Install dependencies
```powershell
npm install
```

### 3. Start development server
```powershell
npm run dev
```

Default local app URL:
- `http://localhost:3000`

### 4. Preview production build
```powershell
npm run build
npm run preview
```

## Environment
Frontend environment file:
- [client/.env](/c:/Users/pylak/student/student-club-event-management-system/client/.env)

Expected live test env vars for automated role checks:
- `TEST_STUDENT_EMAIL`
- `TEST_STUDENT_PASSWORD`
- `TEST_COORDINATOR_EMAIL`
- `TEST_COORDINATOR_PASSWORD`
- `TEST_ADMIN_EMAIL`
- `TEST_ADMIN_PASSWORD`

Example:
```powershell
$env:TEST_STUDENT_EMAIL='student@example.com'
$env:TEST_STUDENT_PASSWORD='password'
$env:TEST_COORDINATOR_EMAIL='coordinator@example.com'
$env:TEST_COORDINATOR_PASSWORD='password'
$env:TEST_ADMIN_EMAIL='admin@example.com'
$env:TEST_ADMIN_PASSWORD='password'
```

## Main NPM Commands
From [client/package.json](/c:/Users/pylak/student/student-club-event-management-system/client/package.json):

```powershell
npm run dev
npm run build
npm run preview
npm run lint
npm run test:cert
npm run test:live-smoke
npm run test:live-modules
npm run test:live-full-flow
```

## Test Flow Order
Recommended validation order:
1. Auth
2. User + Role
3. Club
4. Membership
5. Event
6. Approval
7. Registration
8. Attendance
9. Results
10. Certificates
11. Notifications
12. Chat
13. Analytics
14. AI
15. Security
16. Performance

## Automated Test Commands

### Lint
```powershell
npm run lint
```

### Certificate generation test
```powershell
npm run test:cert
```

### Live smoke test
Checks:
- login for all roles
- role mapping
- basic admin/coordinator/student reads
- basic RLS isolation
- certificate access
- chat visibility

```powershell
npm run test:live-smoke
```

### Live module audit
Checks:
- auth behavior
- role checks
- user management behaviors
- notifications
- chat auth
- analytics queries
- AI governance/RPCs
- security probes

```powershell
npm run test:live-modules
```

### Full live end-to-end flow
Checks:
- club creation
- membership approval
- event create and submit
- admin approve and reject flows
- registration and duplicate prevention
- waitlist promotion
- attendance mark and lock
- results publish and lock
- certificate generation and storage access

```powershell
npm run test:live-full-flow
```

## Manual Test Flows

### Student Flow
1. Login as student
2. Browse events
3. Register for event
4. View attendance
5. View result
6. Download certificate
7. Check notifications
8. Open event or club chat

### Coordinator Flow
1. Login as coordinator
2. Create draft event
3. Submit for approval
4. View registrations
5. Mark attendance
6. Publish results
7. Generate certificates
8. Approve memberships

### Admin Flow
1. Login as admin
2. Create club
3. Assign coordinator
4. Approve or reject events
5. Manage users
6. Review memberships
7. Check analytics
8. Review AI governance

## Current Quality Gates
The project has been validated with:
- local lint
- production build
- certificate generation script
- live smoke tests
- live module audit
- live full-flow test

## Performance Notes
Large chunks still present but improved:
- `vendor-mui`
- `vendor-mui-grid`
- `vendor-charts`
- `vendor-qr`
- `vendor-pdf`

Recent optimizations:
- MUI grid split out of main MUI chunk
- chart-heavy dashboard sections lazy loaded
- attendance chart tab lazy loaded
- PDF and QR libraries moved behind runtime imports

## Related Reference Files
- [PROJECT_ROUTES.md](/c:/Users/pylak/student/student-club-event-management-system/docs/PROJECT_ROUTES.md)
- [SETUP_AND_TESTING.md](/c:/Users/pylak/student/student-club-event-management-system/docs/SETUP_AND_TESTING.md)
- [PROJECT_MAJOR_CODE_BUNDLE.md](/c:/Users/pylak/student/student-club-event-management-system/docs/PROJECT_MAJOR_CODE_BUNDLE.md)

## Quick Start
```powershell
cd c:\Users\pylak\student\student-club-event-management-system\client
npm install
npm run dev
```

## Full Verification Set
```powershell
cd c:\Users\pylak\student\student-club-event-management-system\client
npm run lint
npm run test:cert
npm run build
npm run test:live-smoke
npm run test:live-modules
npm run test:live-full-flow
```
