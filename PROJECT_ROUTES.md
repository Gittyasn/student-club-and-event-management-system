# 🗂️ Project Routes & Features Directory

## 📋 HOW TO USE MULTIPLE ROLES SIMULTANEOUSLY
1. **Tab 1 → Admin:** http://localhost:3000/admin/login
2. **Tab 2 → Coordinator:** http://localhost:3000/coordinator/login
3. **Tab 3 → Student:** http://localhost:3000/login
> Each tab holds a fully independent login session — they won't interfere with each other.

---

## ℹ️ About Links with Sample IDs
Pages marked with *(needs real ID)* require navigating from within the app.  
For example: go to **My Events** → click on an event → the ID appears in the URL.  
**Your real Club IDs from the database:**
- `a248dc00-c4ab-4aa7-b5bb-cef51653b6ee` → Tech Innovators Club
- `90e1d26f-48c1-4a0c-9a51-b70882134683` → Creative Arts Society
- `e20fd4e3-0ea8-408c-8744-dc79c7d1dfd1` → Robotics & AI League

---

## 🌐 Public Pages (No Login Required)

| Page | Link |
|------|------|
| 🏠 Landing Page | http://localhost:3000/ |
| 🏛️ Browse All Clubs | http://localhost:3000/clubs |
| 🔍 Tech Innovators Club Profile | http://localhost:3000/clubs/a248dc00-c4ab-4aa7-b5bb-cef51653b6ee |
| 🔍 Creative Arts Society Profile | http://localhost:3000/clubs/90e1d26f-48c1-4a0c-9a51-b70882134683 |
| 🔍 Robotics & AI League Profile | http://localhost:3000/clubs/e20fd4e3-0ea8-408c-8744-dc79c7d1dfd1 |
| 📅 Browse All Events | http://localhost:3000/events |
| 📄 Event Details | *(go to /events → click an event)* |
| 🏆 Event Results | *(go to /events → click an event → Results tab)* |
| 🎓 Verify Certificate | *(link is on certificate itself)* |
| 🚫 Unauthorized Page | http://localhost:3000/unauthorized |

---

## 🔐 Authentication Pages

| Page | Link |
|------|------|
| 👨‍🎓 Student Login | http://localhost:3000/login |
| 🎯 Coordinator Login | http://localhost:3000/coordinator/login |
| 🛡️ Admin Login | http://localhost:3000/admin/login |
| ✍️ Register (Student/Coordinator) | http://localhost:3000/register |
| 🔧 Admin Register | http://localhost:3000/admin/register |
| 🔑 Forgot Password | http://localhost:3000/forgot-password |
| 🔄 Reset Password | http://localhost:3000/reset-password |
| ✅ Verify Email | http://localhost:3000/verify-email |

---

## 🛡️ Admin Features (Login at /admin/login first)

| Feature | Link |
|---------|------|
| 📊 Admin Dashboard | http://localhost:3000/admin |
| 🏛️ Manage Clubs | http://localhost:3000/admin/clubs |
| 🗂️ Club Categories | http://localhost:3000/admin/club-categories |
| 🏷️ Event Categories | http://localhost:3000/admin/event-categories |
| 🏅 Club Leaderboard | http://localhost:3000/admin/club-leaderboard |
| 👥 Manage Users | http://localhost:3000/admin/users |
| 📅 Manage Events | http://localhost:3000/admin/events |
| 📈 Global Analytics | http://localhost:3000/admin/analytics |
| 💬 Feedback Analysis | http://localhost:3000/admin/feedback |
| 📢 Announcements | http://localhost:3000/admin/announcements |
| 🪪 Membership Audit | http://localhost:3000/admin/memberships |
| ✅ Event Approval Workflow | http://localhost:3000/admin/event-approval |
| 📋 Event Approvals Queue | http://localhost:3000/admin/approvals |
| 📝 Registration Overview | http://localhost:3000/admin/registrations |
| 🎯 Attendance Overview | http://localhost:3000/admin/attendance |
| 💰 Manage Budgets | http://localhost:3000/admin/budgets |
| 🏆 Results Logs | http://localhost:3000/admin/results |
| 📋 Results Overview | http://localhost:3000/admin/results-overview |
| 🔒 Security Dashboard | http://localhost:3000/admin/security |
| ⚙️ System Settings | http://localhost:3000/admin/settings |
| 🎓 Certificates Manager | http://localhost:3000/admin/certificates |
| 📡 Broadcast Channel | http://localhost:3000/admin/broadcast |
| 🔔 Broadcast Alerts | http://localhost:3000/admin/broadcast-alerts |
| ⚡ Performance Dashboard | http://localhost:3000/admin/performance |
| 🤖 AI Governance | http://localhost:3000/admin/ai-governance |
| 📊 AI Reports | http://localhost:3000/admin/ai-reports |

---

## 🎯 Coordinator Features (Login at /coordinator/login first)

| Feature | Link |
|---------|------|
| 📊 Coordinator Dashboard | http://localhost:3000/coordinator |
| 📅 My Events | http://localhost:3000/coordinator/events |
| 📤 My Submissions | http://localhost:3000/coordinator/submissions |
| ➕ Create Event | http://localhost:3000/coordinator/events/create |
| ✏️ Edit Event | *(go to My Events → click Edit on an event)* |
| 📋 Event Registrations | *(go to My Events → click Registrations)* |
| 🎯 Manage Attendance | *(go to My Events → click Attendance)* |
| 👥 Event Teams | *(go to My Events → click Teams)* |
| 🔍 Team Details | *(go to Event Teams → click a team)* |
| 🏆 Publish Results | *(go to My Events → click Results)* |
| 💬 Event Feedback | *(go to My Events → click Feedback)* |
| ✅ Mark Event Complete | *(go to My Events → click Completion)* |
| 📈 Coordinator Analytics | http://localhost:3000/coordinator/analytics |
| 🪪 Club Memberships | http://localhost:3000/coordinator/members |
| 🎓 Certificates Manager | http://localhost:3000/coordinator/certificates |
| 🔔 Notification Settings | http://localhost:3000/coordinator/settings |
| 💬 Tech Innovators Club Chat | http://localhost:3000/coordinator/clubs/a248dc00-c4ab-4aa7-b5bb-cef51653b6ee/chat |
| 💬 Creative Arts Club Chat | http://localhost:3000/coordinator/clubs/90e1d26f-48c1-4a0c-9a51-b70882134683/chat |

---

## 👨‍🎓 Student Features (Login at /login first)

| Feature | Link |
|---------|------|
| 📊 Student Dashboard | http://localhost:3000/student |
| 📅 My Events | http://localhost:3000/student/events |
| 🔍 Browse Events | http://localhost:3000/student/browse-events |
| 📋 My Registrations | http://localhost:3000/student/registrations |
| 🏛️ My Clubs | http://localhost:3000/student/clubs |
| 🌐 Discover Clubs | http://localhost:3000/student/clubs/discover |
| 🎯 My Attendance | http://localhost:3000/student/attendance |
| 🔔 My Notifications | http://localhost:3000/student/notifications |
| 👤 My Profile | http://localhost:3000/student/profile |
| 📷 Scan QR Attendance | http://localhost:3000/student/scan |
| 👥 My Event Team | *(go to My Events → click your team)* |
| 🎓 My Certificates | http://localhost:3000/student/certificates |
| 💬 Submit Feedback | *(go to My Events → click Feedback on completed event)* |
| 💬 Team Chat | *(go to My Events → click Team Chat)* |
| 🏆 Leaderboard | http://localhost:3000/student/leaderboard |
| 🏅 My Results | http://localhost:3000/student/results |
| 📈 My Analytics | http://localhost:3000/student/analytics |
| 💬 Tech Innovators Club Chat | http://localhost:3000/student/clubs/a248dc00-c4ab-4aa7-b5bb-cef51653b6ee/chat |
| 💬 Creative Arts Club Chat | http://localhost:3000/student/clubs/90e1d26f-48c1-4a0c-9a51-b70882134683/chat |
| ⚙️ Notification Settings | http://localhost:3000/student/settings |
| 🌐 Global Event Chat | *(go to /events → click an event → Chat tab)* |
