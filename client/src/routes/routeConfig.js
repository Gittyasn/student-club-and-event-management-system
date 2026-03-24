/**
 * ROUTE CONFIG — Single source of truth for all app routes.
 * When you add, rename, or remove a route in App.jsx, update this file too.
 * The /routes dev page reads this file and auto-updates its link list.
 */

export const ROUTES = [
    // ─── Public ────────────────────────────────────────────────────────────────
    {
        group: "Public",
        color: "blue",
        pages: [
            { label: "Home", path: "/" },
            { label: "Clubs", path: "/clubs" },
            { label: "Events", path: "/events" },
            { label: "Event Details", path: "/events/:id", demo: "/events/1" },
            { label: "Event Results", path: "/events/:id/results", demo: "/events/1/results" },
            { label: "Verify Certificate", path: "/verify/:id", demo: "/verify/1" },
        ],
    },

    // ─── Auth ──────────────────────────────────────────────────────────────────
    {
        group: "Auth",
        color: "slate",
        pages: [
            { label: "Login", path: "/login" },
            { label: "Register", path: "/register" },
            { label: "Verify Email", path: "/verify-email" },
        ],
    },

    // ─── Student ───────────────────────────────────────────────────────────────
    {
        group: "Student",
        color: "green",
        pages: [
            { label: "Dashboard", path: "/student" },
            { label: "Club Management", path: "/student/clubs" },
            { label: "My Registrations", path: "/student/registrations" },
            { label: "Scan Attendance", path: "/student/scan" },
            { label: "Certificates", path: "/student/certificates" },
            { label: "Teams", path: "/student/events/:id/team", demo: "/student/events/1/team" },
            { label: "Submit Feedback", path: "/student/events/:id/feedback", demo: "/student/events/1/feedback" },
            { label: "Team Chat", path: "/student/team/:teamId/chat", demo: "/student/team/1/chat" },
            { label: "Event Chat", path: "/events/:id/chat", demo: "/events/1/chat" },
        ],
    },

    // ─── Coordinator ───────────────────────────────────────────────────────────
    {
        group: "Coordinator",
        color: "amber",
        pages: [
            { label: "Dashboard", path: "/coordinator" },
            { label: "My Events", path: "/coordinator/events" },
            { label: "Create Event", path: "/coordinator/events/create" },
            { label: "Edit Event", path: "/coordinator/events/:id/edit", demo: "/coordinator/events/1/edit" },
            { label: "Registrations", path: "/coordinator/events/:id/registrations", demo: "/coordinator/events/1/registrations" },
            { label: "Attendance", path: "/coordinator/events/:id/attendance", demo: "/coordinator/events/1/attendance" },
            { label: "Teams", path: "/coordinator/events/:id/teams", demo: "/coordinator/events/1/teams" },
            { label: "Team Details", path: "/coordinator/events/:id/teams/:teamId", demo: "/coordinator/events/1/teams/1" },
            { label: "Publish Results", path: "/coordinator/events/:id/results", demo: "/coordinator/events/1/results" },
            { label: "Event Feedback", path: "/coordinator/events/:id/feedback", demo: "/coordinator/events/1/feedback" },
            { label: "Analytics", path: "/coordinator/analytics" },
            { label: "Membership Requests", path: "/coordinator/members" },
            { label: "Membership Management", path: "/coordinator/membership" },
            { label: "Club Chat", path: "/coordinator/clubs/:id/chat", demo: "/coordinator/clubs/1/chat" },
        ],
    },

    // ─── Admin ─────────────────────────────────────────────────────────────────
    {
        group: "Admin",
        color: "red",
        pages: [
            { label: "Dashboard", path: "/admin" },
            { label: "Clubs", path: "/admin/clubs" },
            { label: "Users", path: "/admin/users" },
            { label: "Events", path: "/admin/events" },
            { label: "Analytics", path: "/admin/analytics" },
            { label: "Feedback", path: "/admin/feedback" },
            { label: "Announcements", path: "/admin/announcements" },
            { label: "Memberships", path: "/admin/memberships" },
            { label: "Event Approvals", path: "/admin/approvals" },
            { label: "Event Approval Workflow", path: "/admin/event-approval" },
        ],
    },

    // ─── Dev ───────────────────────────────────────────────────────────────────
    {
        group: "Dev",
        color: "purple",
        pages: [
            { label: "Route Map (this page)", path: "/routes" },
        ],
    },
];
