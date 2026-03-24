# Coordinator Dashboard - Complete Feature Documentation

This document details all coordinator features implemented in the Student Club Event Management System.

## 📊 Feature Overview

The coordinator module provides comprehensive tools for club management with 10 major feature areas:

### 1. Dashboard Overview
**Location**: `/coordinator`

Real-time statistics cards displaying:
- Total events created by the coordinator
- Total registrations across all events
- Average attendance rate across events
- Best-performing event with highest registrations

**Implementation**: 
- Uses `useCoordinatorAnalytics` hook to fetch aggregated stats
- Queries events with nested registrations and attendance status
- Calculates percentages client-side for real-time updates

### 2. Event Management
**Location**: `/coordinator/events`, `/coordinator/events/create`, `/coordinator/events/:id/edit`

Full event lifecycle management:
- **Create**: Form-based event creation with date, capacity, title, description
- **Edit**: Update all event details before approval
- **Submit**: Submit draft events for admin approval (requires approval_status='approved' before publishing)
- **Delete**: Remove draft events only
- **Status Display**: Visual indicators for draft/pending/approved/rejected status

**Key Data**:
- Events stored in `events` table with `approval_status` field
- Tracks coordinator's club via `club_id` RLS
- `admin_remarks` field stores approval feedback

---

### 3. Event Approval Status
**Location**: `/admin/approvals` and `/admin/event-approval`

Admin-only interface for event review:
- List all pending events submitted by coordinators
- View event details, club info, and proposed date/time
- **Approve**: Mark event as approved; stores admin approval in database
- **Reject**: Decline with optional remarks communicated to coordinator
- **Audit Trail**: All approval decisions logged to `audit_logs` table

**Audit Log Entry**:
```json
{
  "user_id": "admin_id",
  "action": "approve_event OR reject_event",
  "module": "event_approvals",
  "details": {
    "event_id": "...",
    "event_title": "...",
    "club_id": "..."
  },
  "created_at": "timestamp"
}
```

**Implementation**:
- Fetches pending events from Supabase
- Calls `approveEvent` or `rejectEvent` mutations
- Mutations update events table AND insert audit log
- Invalidates event queries after action

---

### 4. Registrations Management
**Location**: `/coordinator/events/:id/registrations` (nested under event routes)

Comprehensive registration handling:
- View full list of students registered for event
- **Waitlist Support**: 
  - Students auto-added to waitlist if capacity full
  - `is_waitlisted` flag on registrations
  - Promote Selected button to instantly move students from waitlist
- **Remove Registration**: Delete unwanted registrations
- **Close Registration**: Manually disable new registrations
- **CSV Export**: Download all registrations with student names, emails, status
- **Submission Tracking**: View which students have submitted required materials

**Features**:
- Checkbox selection for bulk operations
- "Promote Selected" action (calls `promoteFromWaitlist` mutation)
- Automatic notification to promoted students
- Attendance status column (pending/present/absent)

**Implementation**:
- Uses `useEventRegistrations` hook to fetch data
- DataGrid with checkbox selection (MUI X Data Grid)
- `useMemberships` or `useAttendanceMutations` for promotion logic
- CSV export via `json2csv` or manual CSV generation

---

### 5. Attendance Management
**Location**: `/coordinator/events/:id/attendance` (nested under event routes)

Flexible attendance tracking with multiple methods:

#### Manual Marking
- Click individual student names to mark present/absent
- Immediate database update
- Real-time status display

#### QR-Based Attendance
- **Generate QR Code**: Button to create QR containing attendance token
- **Student Scanning**: Students scan code on their phones
- **Validation**: `validate-attendance` Edge Function verifies token
- **Auto-Certificate**: If event has `is_certificate_enabled`, auto-generate certificate upon attendance marking

**Token Flow**:
1. Coordinator clicks "Generate QR"
2. Client calls `supabase.functions.invoke('generate-attendance-token', { body: { eventId } })`
3. Edge Function generates single-use token with 30-minute expiry
4. Returns token; client displays as QR code
5. Student scans QR → app calls `validate-attendance` function with token
6. Function validates and marks registration `attendance_status='present'`
7. Token marked as `used=true` to prevent replay

#### Bulk Operations
- Select multiple students
- Mark all as present/absent in one action
- CSV export of attendance records

#### Lock Attendance
- Toggle `attendance_locked` on events
- Prevents further edits after finalization

---

### 6. Results Management
**Location**: `/coordinator/events/:id/results` (nested under event routes)

Complete results workflow:

**View & Edit**:
- Table showing all participants and their scores
- Editable fields: Score, Remarks, Prize (e.g., "1st Place", "Best Technical")
- Position badges with rank-based colors (Gold/Silver/Bronze)
- Edit mode toggle (only editable when `results_locked=false`)

**Publish**:
- Make results visible to students
- Sets `results_locked=true` to prevent accidental edits
- Trophy icon indicates published state

**Lock/Unlock**:
- Coordinator can temporarily lock results during editing
- Unlock to allow modifications
- Persistent lock prevents further changes once published

**Data Structure**:
```javascript
// Result row
{
  id: "...",
  position: 1,
  score: 85,
  remarks: "Excellent performance",
  prize: "1st Place",
  user: { full_name: "Student Name" }
}
```

**Implementation**:
- `useResults` hook fetches event results with user details
- `useUpdateResults` mutation batch-updates multiple fields
- `useLockResults` mutation toggles `results_locked`
- UI state tracks edits locally, saves on "Save" button click
- React Query invalidation after mutations

---

### 7. Certificate Generation
**Location**: `/coordinator/certificates` (manager view)

Automated certificate workflow:

**Automatic Generation**:
- When marking student as present, if `is_certificate_enabled=true` on event
- Instantly generates and stores certificate

**Manual Generation**:
- Bulk action to generate certificates for multiple students
- Select students and click "Generate Certificates"

**PDF Content**:
- Student name
- Event title
- Event date
- Certificate ID (unique identifier)
- QR code linking to verification page
- Professional formatting with school logo (customizable)

**Storage & URLs**:
- Uploads to Supabase Storage bucket `certificates`
- Generates public URL for direct access (if bucket is public)
- Fallback to 7-day signed URLs (if bucket is private)
- Stores URL in `certificates` table

**Distribution**:
- Direct download link from certificates page
- Email notifications to students
- Certificate history and re-download capability

**Implementation**:
- `useCertificates` hook handles generation and upload
- Uses `generateCertificatePDF` utility with pdf-lib + qrcode
- `generateCertificateUrl` function handles both public and signed URLs
- Notifications table tracks distribution

---

### 8. Membership Management
**Location**: `/coordinator/members`

Member lifecycle and role management:

**Join Requests**:
- Review pending membership requests
- Approve or reject join requests
- Email notifications sent automatically

**Active Members**:
- View all approved club members
- Remove members if needed
- Toggle sub-coordinator status with one click

**Sub-Coordinator Features**:
- Star icon marks sub-coordinators
- Sub-coordinators can:
  - Help manage registrations
  - Mark attendance
  - View analytics
  - Cannot approve events or generate certificates alone
- Make/Revoke buttons for easy role changes

**Implementation**:
- `useMemberships` hook for join/approval logic
- `useSetSubCoordinator` mutation for role changes
- Confirmation dialogs before role changes
- RLS policies enforce club ownership restrictions

---

### 9. Feedback Review
**Location**: `/coordinator/events/:id/feedback` (nested under event routes)

Student feedback aggregation and analysis:

**Features**:
- View all feedback submitted for event
- Show student names (or "Anonymous" if anonymous feedback)
- Display star ratings and text comments
- **Rating Distribution**: Bar chart showing count of 1-star through 5-star ratings
- **Mark as Reviewed**: Checkbox/button to mark feedback reviewed for tracking
- **Average Rating**: Large display of mean rating
- **CSV Export**: Download all feedback with headers: Student Name, Rating, Comment, Date

**Analytics Card**:
- Large average rating display
- Total response count
- Rating distribution chart
- Identified problematic feedback visually

**Implementation**:
- `useEventFeedback` hook fetches feedback with user profiles
- `useMarkFeedbackReviewed` mutation updates `is_reviewed` flag
- CSV export via client-side generation (no server needed)
- Recharts BarChart component for distribution

---

### 10. Analytics Dashboard
**Location**: `/coordinator/analytics`

Data-driven insights for event planning:

**Summary Cards**:
- Total events created
- Total registrations across all events
- Average attendance rate (%)
- Best-performing event

**Charts**:

1. **Registrations per Event** (Horizontal Bar Chart)
   - X-axis: Number of registrations
   - Y-axis: Event titles
   - Quickly see which events had most interest

2. **Attendance Rate per Event** (Vertical Bar Chart)
   - X-axis: Event titles
   - Y-axis: Attendance percentage
   - Identify events with low participation

3. **Participation Growth Trend** (Line Chart)
   - X-axis: Month/Year
   - Y-axis: Registration count
   - Track growth over time

**Data Aggregation**:
- Fetches events with nested registrations
- Calculates attendance rates: (present count / total registrations) * 100
- Groups by month for trend data
- Identifies best event by registration count

**Implementation**:
- `useCoordinatorAnalytics` hook with complex queries
- Recharts library for visualization
- Client-side calculations for real-time updates
- Aggregated data reduces API calls

---

## 🔐 Security Implementation

### Row-Level Security (RLS)

**Events Table**:
- Coordinators can view only their club's events
- Policy: `club_id MATCHES current_user_club`
- Prevents viewing other club's events

**Registrations Table**:
- Users can view own registrations
- Coordinators can view/edit registrations for their club's events
- Policy: `event_id IN (coordinator's events)` OR `user_id = current_user`

**Club Memberships**:
- Coordinators can update only their club's members
- Policy: `club_id MATCHES coordinator_club` OR `is_admin`
- Sub-coordinator flag update limited to coordinators

**Results Table**:
- Coordinators can edit only their club's results
- Students can view only if unlocked
- Policy: publish status check

### Audit Logging

- All approvals tracked to `audit_logs` table
- Fields: `user_id`, `action`, `module` (event_approvals), `details` (JSON), `created_at`
- Enables compliance and accountability

### Token Security

- Attendance tokens: single-use, time-limited (30 minutes)
- Generated server-side via Edge Function
- Verified via JWT and club membership check
- Prevents replay attacks and unauthorized attendance

---

## 📊 Database Schema Additions

### New Tables

**attendance_tokens**
```sql
id UUID PRIMARY KEY
event_id UUID REFERENCES events
created_by UUID REFERENCES profiles
token TEXT UNIQUE
expires_at TIMESTAMP
used BOOLEAN DEFAULT FALSE
created_at TIMESTAMP DEFAULT now()
```

**audit_logs**
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES profiles
action TEXT (approve_event, reject_event, etc.)
module TEXT (event_approvals, etc.)
details JSONB
created_at TIMESTAMP DEFAULT now()
```

### New Columns

- `events.attendance_locked` BOOLEAN (default false)
- `events.results_locked` BOOLEAN (default false)
- `events.approval_status` TEXT (draft/pending/approved/rejected)
- `registrations.is_waitlisted` BOOLEAN (default false)
- `club_memberships.is_sub_coordinator` BOOLEAN (default false)
- `feedback.is_reviewed` BOOLEAN (default false)
- `results.prize` TEXT (nullable)

---

## 🧪 Testing

### Smoke Test
```bash
cd client
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node __tests__/smoke-test.js
```

Validates:
- Database connectivity
- All required columns exist
- Audit logs table present
- Storage bucket accessible
- Analytics queries work

### Integration Tests
```bash
# Requires Jest setup
npm test __tests__/integration.test.js
```

Tests:
- Analytics data fetching
- Registrations management
- Waitlist promotion
- Results locking
- Membership role updates
- Attendance tokens
- Audit logging

### Manual Testing Checklist
- [ ] Create event and submit for approval
- [ ] Admin approves/rejects event
- [ ] Add students to event registration
- [ ] Test waitlist with capacity limit
- [ ] Promote 1-2 students from waitlist
- [ ] Mark attendance manually
- [ ] Generate QR code token
- [ ] Scan QR code (or call validate endpoint)
- [ ] Verify certificate auto-generated
- [ ] Add scores and results
- [ ] Publish and lock results
- [ ] Export feedback as CSV
- [ ] Check analytics charts populate

---

## 🚀 Deployment Steps

1. **Apply Migrations**
   - Run all migration SQL files in order
   - Verify RLS policies created

2. **Create Storage Bucket**
   - Supabase dashboard → Storage
   - Create bucket named `certificates`
   - Set to public or private per requirements

3. **Deploy Edge Functions**
   ```bash
   supabase functions deploy generate-attendance-token
   supabase functions deploy validate-attendance
   supabase secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
   ```

4. **Frontend Build & Deploy**
   ```bash
   cd client
   npm run build
   # Deploy dist/ folder to hosting (Vercel, etc.)
   ```

5. **Verify Setup**
   ```bash
   node __tests__/smoke-test.js
   ```

6. **Create Test Data**
   - Create admin account
   - Create 2-3 test clubs
   - Assign coordinators
   - Create test events

---

## 📝 API Hooks Reference

| Hook | Purpose | Example Usage |
|------|---------|---|
| `useCoordinatorAnalytics(clubId)` | Fetch analytics data | `const { data: stats } = useCoordinatorAnalytics(club_id)` |
| `useEventRegistrations(eventId)` | Get event registrations | See EventRegistrations.jsx |
| `useAttendance(eventId)` | Mark attendance | Use from Attendance.jsx |
| `useCertificates(eventId)` | Generate certificates | `generateCertificates.mutate(userIds)` |
| `useResults(eventId)` | Fetch results | See Results.jsx |
| `useUpdateResults(eventId)` | Edit results | Batch update mutations |
| `useLockResults(eventId)` | Lock/unlock results | Toggle `results_locked` |
| `useMemberships(clubId)` | Manage members | Approval/removal logic |
| `useSetSubCoordinator(memberId)` | Set sub-coordinator role | Toggle sub-coordinator flag |
| `useEventFeedback(eventId)` | Fetch feedback | View feedback list |
| `useMarkFeedbackReviewed(feedbackId)` | Mark reviewed | Update `is_reviewed` |

---

## 🐛 Troubleshooting

**Q: Certificates not uploading**
- A: Verify storage bucket `certificates` exists
- Check VITE_SUPABASE_ANON_KEY and URL in .env
- Ensure bucket allows uploads (not overly restrictive RLS)

**Q: QR attendance not working**
- A: Edge Functions must be deployed with both service role key and anon key env vars
- Verify `generate-attendance-token` and `validate-attendance` are deployed
- Check browser console for function invocation errors

**Q: Registrations queries slow**
- A: Add index on registrations.event_id and registrations.attendance_status
- Migrations already include these; if missing, run optimization migration

**Q: Analytics showing incomplete data**
- A: Verify `useCoordinatorAnalytics` hook is fetching correct club_id
- Check RLS policies allow access to own club's events
- Run smoke test to validate schema

---

## 📞 Support & Next Steps

- Review migrations in `supabase/migrations/` for detailed schema
- Check hook implementations in `client/src/hooks/`
- Review page components in `client/src/pages/coordinator/`
- Use smoke tests and integration tests for validation
- Check audit logs for any approval activity



