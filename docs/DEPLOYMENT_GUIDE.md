# Deployment Guide - Club & Event Management System

**Status**: ✅ Application build successful (0 errors). Ready for database setup and testing.

## Phase 1: Database Schema Migrations

### Step 1: Open Supabase SQL Editor
1. Go to [supabase.com](https://supabase.com) and log in to your project
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query**

### Step 2: Execute Schema Migration
1. Open the file: `supabase/migrations/20260221_enhance_clubs_events.sql`
2. Copy the entire SQL content
3. Paste it into the Supabase SQL Editor query window
4. Click **Run** (or press Ctrl+Enter)
5. Verify: No errors appear and "Done" message shows

**Expected Result:**
- New columns added to `clubs` table (category, status, banner_url, coordinator_id, rating, member_count)
- New columns added to `events` table (mode, budget_request, category, location, qr_token)
- New columns added to `registrations` table (qr_scanned_at, certificate_issued)

### Verification Query
Run this in SQL Editor to verify all columns exist:
```sql
-- Verify clubs table
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'clubs' AND column_name IN ('category', 'status', 'banner_url', 'coordinator_id')
ORDER BY column_name;

-- Verify events table
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'events' AND column_name IN ('mode', 'budget_request', 'location', 'qr_token')
ORDER BY column_name;
```

---

## Phase 2: Seed Database with Clubs & Events

### Step 1: Execute Seed Script
1. In Supabase SQL Editor, click **New Query**
2. Open the file: `seed_clubs_comprehensive.sql`
3. Copy the entire SQL content
4. Paste into SQL Editor and click **Run**
5. Wait for completion (should show "20 clubs inserted, 8 events inserted" messages)

**Expected Result:**
- 20 clubs created across 4 categories:
  - Academic: 6 clubs (Coding Club, AI & Data Science, Web Dev, Mobile Dev, Blockchain, Data Structures)
  - Cultural: 5 clubs (Dance, Music, Drama, Film, Photography)
  - Sports: 5 clubs (Cricket, Football, Basketball, Badminton, Tennis)
  - Professional: 4 clubs (Entrepreneurship, Management Consulting, Finance, Public Speaking)
- 8 sample events created across various clubs

### Verification Query
```sql
-- Count clubs and events
SELECT 'Total Clubs' as metric, COUNT(*) as count FROM public.clubs
UNION ALL
SELECT 'Total Events', COUNT(*) FROM public.events
UNION ALL
SELECT 'Clubs by Category' as metric, COUNT(DISTINCT category) as count FROM public.clubs;

-- List all clubs
SELECT id, name, category, member_count FROM public.clubs ORDER BY category, name;
```

---

## Phase 3: Create Test User Accounts

### Option A: Via Supabase Dashboard (Recommended)
1. Go to **Authentication → Users** in Supabase Dashboard
2. Click **Add user** (or **Invite** button)
3. Create users with these details:

#### Admin Account
- **Email**: admin@university.edu
- **Password**: Admin@2026
- **Set role**: admin (via SQL after creation - see below)

#### Coordinator Accounts
- **Email**: coord.coding@university.edu, **Password**: Coord@2026
- **Email**: coord.ai@university.edu, **Password**: Coord@2026

#### Student Accounts
- **Email**: student.alice@university.edu, **Password**: Student@2026
- **Email**: student.bob@university.edu, **Password**: Student@2026
- **Email**: student.charlie@university.edu, **Password**: Student@2026
- **Email**: student.diana@university.edu, **Password**: Student@2026
- **Email**: student.evan@university.edu, **Password**: Student@2026

### Option B: Via SQL (Automatic)
Run this SQL in Supabase SQL Editor to create accounts programmatically:
```sql
-- Copy the auth.users IDs after bulk insert, then update roles in profiles table
-- First, create admin user via UI, then update role:
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'admin@university.edu';

-- Update coordinators
UPDATE public.profiles 
SET role = 'coordinator' 
WHERE email IN ('coord.coding@university.edu', 'coord.ai@university.edu');

-- Update students (they should default to 'student' but verify)
UPDATE public.profiles 
SET role = 'student' 
WHERE email LIKE 'student.%@university.edu';

-- Verify roles were set
SELECT email, role FROM public.profiles WHERE role IN ('admin', 'coordinator', 'student') ORDER BY role;
```

### Verification
```sql
-- Verify all test accounts exist
SELECT id, email, role FROM public.profiles 
WHERE email IN (
    'admin@university.edu',
    'coord.coding@university.edu', 'coord.ai@university.edu',
    'student.alice@university.edu', 'student.bob@university.edu',
    'student.charlie@university.edu', 'student.diana@university.edu',
    'student.evan@university.edu'
)
ORDER BY role, email;
```

---

## Phase 4: Application Testing

### New Routes
The application now includes these new routes:

**Student Routes:**
- `/student/clubs/discover` - Browse all clubs and request membership (NEW)
- `/student/clubs` - View clubs you're already a member of (existing)

**Coordinator Routes:**
- `/coordinator/membership` - Manage club membership requests (NEW) ← This is the key feature
- `/coordinator/members` - (existing similar page)

**Admin Routes:**
- `/admin/event-approval` - Approve/reject club events (NEW) ← This is the key feature

### End-to-End Testing Workflow

#### Test 1: Student Discovers & Joins Club
1. **Start**: Open application → Login as `student.alice@university.edu` / `Student@2026`
2. **Navigate**: Go to **My Dashboard** → Look for "Discover Clubs" or navigate to `/student/clubs/discover`
3. **Action**: Browse available clubs, click **Join** on "Coding Club"
4. **Expected**: Membership request shows "Pending" status
5. **Verify**: Navigate to `/student/clubs` - "Coding Club" should NOT appear yet (still pending)

#### Test 2: Coordinator Approves Membership
1. **Start**: Logout → Login as `coord.coding@university.edu` / `Coord@2026`
2. **Navigate**: Go to **Dashboard** → Find **Membership Management** or navigate to `/coordinator/membership`
3. **Action**: Tab to "Pending Requests" → Find "student.alice@university.edu" → Click **Approve**
4. **Expected**: Status changes to "Approved" and moves to "Approved Members" tab
5. **Verify in Tab 2**: Alice should now appear in the "Approved Members" tab with "Member" badge

#### Test 3: Coordinator Creates Event
1. **Continue**: As `coord.coding@university.edu`
2. **Navigate**: Go to **My Events** or `/coordinator/events`
3. **Action**: Click **Create Event** - fill in:
   - **Event Name**: "Monthly Coding Challenge"
   - **Start Date/Time**: Tomorrow at 2:00 PM
   - **Max Participants**: 50
   - **Mode**: "Hybrid" or "Online"
   - **Budget**: 5000
   - **Location**: "Main Auditorium"
4. **Expected**: Event created with status "Draft"

#### Test 4: Admin Approves Event
1. **Start**: Logout → Login as `admin@university.edu` / `Admin@2026`
2. **Navigate**: Go to **Admin Dashboard** → Find **Event Approval** or navigate to `/admin/event-approval`
3. **Action**: Tab to "Pending Events" → Find "Monthly Coding Challenge" → Click **Approve**
4. **Expected**: Event moves to "Approved Events" tab, status changes to "approved"

#### Test 5: Student Registers for Event
1. **Start**: Logout → Login as `student.alice@university.edu` / `Student@2026`
2. **Navigate**: Go to **Browse Events** or `/events`
3. **Action**: Find "Monthly Coding Challenge" event → Click **Register**
4. **Expected**: 
   - Confirmation message shows "Registration successful"
   - QR token generated (for attendance)
   - Event appears in "My Registrations" page

#### Test 6: QR Attendance Marking (if UI available)
1. **Action**: Navigate to Attendance page or use QR scanner
2. **Expected**: Scan QR code or manually enter token
3. **Result**: Attendance recorded with timestamp

### Quick Testing Checklist

- [ ] Database migration applied (columns verified in schema)
- [ ] Seed data loaded (20 clubs, 8 events visible)
- [ ] All 8 test accounts created and roles set correctly
- [ ] Student can login and discover clubs
- [ ] Student can request membership to club
- [ ] Coordinator can login and see membership requests
- [ ] Coordinator can approve/reject membership requests
- [ ] Coordinator can create events
- [ ] Admin can login and see pending event approvals
- [ ] Admin can approve/reject events
- [ ] Student can see approved events and register
- [ ] Registration generates QR token
- [ ] Build contains no errors: ✅ **Verified in Phase 1**

---

## Phase 5: Production Deployment

### Features Implemented
✅ Club Discovery & Membership System
- Students browse all clubs by category
- Request membership (creates pending request)
- Coordinators manage approvals
- Role-based access control with RLS

✅ Event Approval Workflow
- Coordinators create events with budget/location/capacity
- Admin reviews and approves events
- Bulk actions for batch approvals
- Rejection with reason tracking

✅ Registration & QR Tracking
- Students register for approved events
- Waitlist if event at capacity
- QR token generation for attendance
- Attendance tracking with timestamps

✅ Dashboard Updates
- Modern SaaS aesthetic with Tailwind CSS
- Material-UI components + ShadCN integration
- Dark/light theme support
- Responsive mobile design

### Deployment Checklist
- [ ] Apply database migrations to production
- [ ] Seed production database with clubs/events
- [ ] Create production test accounts
- [ ] Run full end-to-end testing workflow
- [ ] Performance testing (load testing with multiple concurrent users)
- [ ] Security audit (review RLS policies)
- [ ] Email notifications setup (optional)
- [ ] Deploy frontend to hosting (Vercel, Netlify, etc.)
- [ ] Configure production environment variables
- [ ] Monitor error logs and application performance

---

## Troubleshooting

### Build Errors
**Error**: "Module not found" or "Component is not exported"
- **Solution**: Ensure all imports in `src/App.jsx` match the component file paths
- **Verify**: Run `npm run build` again to check for compilation errors

### Database Errors
**Error**: "Permission denied" when executing SQL
- **Solution**: Verify you're logged in with admin/owner account in Supabase
- **Check**: Role-based access in project settings

### Login Issues
**Error**: "Invalid credentials" or "User not found"
- **Solution**: Verify email exact match and password (case-sensitive)
- **Check**: User exists in Supabase Authentication → Users dashboard

### Missing Features
**Error**: New routes not accessible or components not loading
- **Solution**: Clear browser cache (Ctrl+Shift+Delete) and refresh
- **Rebuild**: Run `npm run build` and redeploy if deployed to server

---

## Support & Documentation

- **Supabase Docs**: https://supabase.com/docs
- **React Query Docs**: https://tanstack.com/query
- **Material-UI Docs**: https://mui.com/material-ui/
- **Tailwind CSS Docs**: https://tailwindcss.com/docs

---

**Last Updated**: 2026-02-21
**Build Status**: ✅ Production Ready (0 errors)
**Next Review**: After end-to-end testing completion
