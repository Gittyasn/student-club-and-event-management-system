import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { supabase } from './services/supabaseClient';
import { useAuthStore } from './store/authStore';

// Eagerly load critical auth and public pages
import Login from './modules/auth/pages/Login';
import Register from './modules/auth/pages/Register';
import AdminRegister from './modules/auth/pages/AdminRegister';
import AdminLogin from './modules/auth/pages/AdminLogin';
import ForgotPassword from './modules/auth/pages/ForgotPassword';
import ResetPassword from './modules/auth/pages/ResetPassword';
import VerifyEmail from './modules/auth/pages/VerifyEmail';
import PublicLayout from './layouts/PublicLayout';
import Home from './modules/public/pages/Home';

// Lazy load everything else
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminClubs = lazy(() => import('./pages/admin/Clubs'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminEvents = lazy(() => import('./pages/admin/Events'));
const AdminAnalytics = lazy(() => import('./pages/admin/Analytics'));
const AdminFeedback = lazy(() => import('./pages/admin/Feedback'));
const AdminAnnouncements = lazy(() => import('./pages/admin/Announcements'));
const AdminMemberships = lazy(() => import('./pages/admin/Memberships'));
const EventApprovalWorkflow = lazy(() => import('./pages/admin/EventApprovalWorkflow'));
const EventApprovals = lazy(() => import('./pages/admin/EventApprovals'));
const AdminBudgets = lazy(() => import('./pages/admin/Budgets'));
const AdminResults = lazy(() => import('./pages/admin/Results'));
const AdminSecurity = lazy(() => import('./pages/admin/Security'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));
const AdminClubLeaderboard = lazy(() => import('./pages/admin/ClubLeaderboard'));
const AdminClubCategories = lazy(() => import('./pages/admin/ClubCategories'));
const AdminEventCategories = lazy(() => import('./pages/admin/EventCategories'));
const RegistrationOverview = lazy(() => import('./pages/admin/RegistrationOverview'));
const AttendanceOverview = lazy(() => import('./pages/admin/AttendanceOverview'));
const ResultsOverview = lazy(() => import('./pages/admin/ResultsOverview'));
const CertificateManagement = lazy(() => import('./pages/admin/CertificateManagement'));
const PerformanceDashboard = lazy(() => import('./pages/admin/PerformanceDashboard'));
const AdminAIGovernance = lazy(() => import('./pages/admin/AIGovernance'));
const AdminAIReports = lazy(() => import('./pages/admin/AIReports'));

const CoordinatorLayout = lazy(() => import('./layouts/CoordinatorLayout'));
const CoordinatorDashboard = lazy(() => import('./pages/coordinator/Dashboard'));
const CoordinatorEvents = lazy(() => import('./pages/coordinator/MyEvents'));
const MySubmissions = lazy(() => import('./pages/coordinator/MySubmissions'));
const CreateEvent = lazy(() => import('./pages/coordinator/CreateEvent'));
const EditEvent = lazy(() => import('./pages/coordinator/EditEvent'));
const EventRegistrations = lazy(() => import('./pages/coordinator/EventRegistrations'));
const Attendance = lazy(() => import('./pages/coordinator/Attendance'));
const EventTeams = lazy(() => import('./pages/coordinator/EventTeams'));
const TeamDetails = lazy(() => import('./pages/coordinator/TeamDetails'));
const CoordinatorClubChat = lazy(() => import('./pages/coordinator/ClubChat'));
const PublishResults = lazy(() => import('./pages/coordinator/PublishResults'));
const CoordinatorAnalytics = lazy(() => import('./pages/coordinator/Analytics'));
const EventFeedback = lazy(() => import('./pages/coordinator/EventFeedback'));
const MembershipManagement = lazy(() => import('./pages/coordinator/MembershipManagement'));
const CertificatesManager = lazy(() => import('./pages/coordinator/CertificatesManager'));
const CoordinatorSettings = lazy(() => import('./pages/coordinator/Settings'));
const EventCompletion = lazy(() => import('./pages/coordinator/EventCompletion'));

const StudentLayout = lazy(() => import('./layouts/StudentLayout'));
const StudentDashboard = lazy(() => import('./pages/student/Dashboard'));
const ClubManagement = lazy(() => import('./pages/student/ClubManagement'));
const MyEvents = lazy(() => import('./pages/student/MyEvents'));
const BrowseEvents = lazy(() => import('./pages/student/BrowseEvents'));
const MyClubs = lazy(() => import('./pages/student/MyClubs'));
const Certificates = lazy(() => import('./pages/student/Certificates'));
const AttendanceRecord = lazy(() => import('./pages/student/AttendanceRecord'));
const SubmitFeedback = lazy(() => import('./pages/student/SubmitFeedback'));
const Notifications = lazy(() => import('./pages/student/Notifications'));
const ProfileSettings = lazy(() => import('./pages/shared/ProfileSettings'));
const EventChat = lazy(() => import('./pages/student/EventChat'));
const TeamChat = lazy(() => import('./pages/student/TeamChat'));
const StudentLeaderboard = lazy(() => import('./pages/student/Leaderboard'));
const ScanAttendance = lazy(() => import('./pages/student/ScanAttendance'));
const Teams = lazy(() => import('./pages/student/Teams'));
const MyRegistrations = lazy(() => import('./pages/student/MyRegistrations'));
const MyResults = lazy(() => import('./pages/student/MyResults'));
const StudentAnalytics = lazy(() => import('./pages/student/Analytics'));
const ClubChat = lazy(() => import('./pages/student/ClubChat'));
const BroadcastChannel = lazy(() => import('./pages/admin/BroadcastChannel'));
const BroadcastNotification = lazy(() => import('./pages/admin/BroadcastNotification'));

const NotificationSettings = lazy(() => import('./components/notifications/NotificationSettings'));

// Lazy load less critical public pages
const Clubs = lazy(() => import('./pages/public/Clubs'));
const Events = lazy(() => import('./pages/public/Events'));
const EventDetails = lazy(() => import('./pages/public/EventDetails'));
const EventResults = lazy(() => import('./pages/public/EventResults'));
const ClubProfile = lazy(() => import('./pages/public/ClubProfile'));
const VerifyCertificate = lazy(() => import('./pages/public/VerifyCertificate'));

const Unauthorized = lazy(() => import('./modules/auth/pages/Unauthorized'));

// Components
import ProtectedRoute from './routes/ProtectedRoute';

import ScrollToHashElement from './components/ScrollToHashElement';
import { AppThemeProvider } from './components/AppThemeProvider';

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen bg-background">
    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        checkAuth();
      } else {
        useAuthStore.getState().setAuth(null, null);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkAuth]);

  return (
    <AppThemeProvider>
      <div>
        <Toaster position="top-right" richColors />
        <ScrollToHashElement />
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Public Routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={
                <>
                  <Home />
                </>
              } />
              <Route path="/clubs" element={<Clubs />} />
              <Route path="/clubs/:id" element={<ClubProfile />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/:id" element={<EventDetails />} />
              <Route path="/events/:id/results" element={<EventResults />} />
              <Route path="/login" element={<Login />} />
              <Route path="/coordinator/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/register" element={<AdminRegister />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/verify/:id" element={<VerifyCertificate />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route element={<ProtectedRoute allowedRoles={['student', 'coordinator', 'admin']} />}>
                <Route path="/events/:id/chat" element={<EventChat />} />
              </Route>
            </Route>

            {/* Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="clubs" element={<AdminClubs />} />
                <Route path="club-categories" element={<AdminClubCategories />} />
                <Route path="event-categories" element={<AdminEventCategories />} />
                <Route path="club-leaderboard" element={<AdminClubLeaderboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="events" element={<AdminEvents />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="feedback" element={<AdminFeedback />} />
                <Route path="announcements" element={<AdminAnnouncements />} />
                <Route path="memberships" element={<AdminMemberships />} />
                <Route path="event-approval" element={<EventApprovalWorkflow />} />
                <Route path="approvals" element={<EventApprovals />} />
                <Route path="registrations" element={<RegistrationOverview />} />
                <Route path="attendance" element={<AttendanceOverview />} />
                <Route path="budgets" element={<AdminBudgets />} />
                <Route path="results" element={<AdminResults />} />
                <Route path="results-overview" element={<ResultsOverview />} />
                <Route path="security" element={<AdminSecurity />} />
                <Route path="certificates" element={<CertificateManagement />} />
                <Route path="broadcast" element={<BroadcastChannel />} />
                <Route path="broadcast-alerts" element={<BroadcastNotification />} />

                <Route path="performance" element={<PerformanceDashboard />} />
                <Route path="ai-governance" element={<AdminAIGovernance />} />
                <Route path="ai-reports" element={<AdminAIReports />} />
                <Route path="profile" element={<ProfileSettings />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['coordinator']} />}>
              <Route path="/coordinator" element={<CoordinatorLayout />}>
                <Route index element={<CoordinatorDashboard />} />
                <Route path="events" element={<CoordinatorEvents />} />
                <Route path="submissions" element={<MySubmissions />} />
                <Route path="events/create" element={<CreateEvent />} />
                <Route path="events/:id/edit" element={<EditEvent />} />
                <Route path="events/:id/registrations" element={<EventRegistrations />} />
                <Route path="events/:id/attendance" element={<Attendance />} />
                <Route path="events/:id/teams" element={<EventTeams />} />
                <Route path="events/:id/teams/:teamId" element={<TeamDetails />} />
                <Route path="events/:id/results" element={<PublishResults />} />
                <Route path="events/:id/feedback" element={<EventFeedback />} />
                <Route path="events/:id/completion" element={<EventCompletion />} />
                <Route path="analytics" element={<CoordinatorAnalytics />} />
                <Route path="members" element={<MembershipManagement />} />
                <Route path="certificates" element={<CertificatesManager />} />
                <Route path="clubs/:id/chat" element={<CoordinatorClubChat />} />
                <Route path="profile" element={<ProfileSettings />} />
                <Route path="settings" element={<CoordinatorSettings />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['student']} />}>
              <Route path="/student" element={<StudentLayout />}>
                <Route index element={<StudentDashboard />} />
                <Route path="events" element={<MyEvents />} />
                <Route path="browse-events" element={<BrowseEvents />} />
                <Route path="registrations" element={<MyRegistrations />} />
                <Route path="clubs" element={<MyClubs />} />
                <Route path="clubs/discover" element={<ClubManagement />} />
                <Route path="attendance" element={<AttendanceRecord />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="profile" element={<ProfileSettings />} />
                <Route path="scan" element={<ScanAttendance />} />
                <Route path="events/:id/team" element={<Teams />} />
                <Route path="certificates" element={<Certificates />} />
                <Route path="events/:id/feedback" element={<SubmitFeedback />} />
                <Route path="team/:teamId/chat" element={<TeamChat />} />
                <Route path="leaderboard" element={<StudentLeaderboard />} />
                <Route path="results" element={<MyResults />} />
                <Route path="analytics" element={<StudentAnalytics />} />
                <Route path="clubs/:id/chat" element={<ClubChat />} />
                <Route path="settings" element={<NotificationSettings />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </div>
    </AppThemeProvider>
  );
}

export default App;
