import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Spin } from 'antd'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './components/AppLayout'

const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'))
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'))
const InterviewWizardPage = lazy(() => import('./pages/interview/InterviewWizardPage'))
const InterviewSessionPage = lazy(() => import('./pages/interview/InterviewSessionPage'))
const InterviewConfirmationPage = lazy(
  () => import('./pages/interview/InterviewConfirmationPage'),
)
const FeedbackPage = lazy(() => import('./pages/feedback/FeedbackPage'))
const FeedbackHistoryPage = lazy(() => import('./pages/feedback/FeedbackHistoryPage'))
const RecruiterDashboardPage = lazy(
  () => import('./pages/recruiter/RecruiterDashboardPage'),
)
const StudentProfilePage = lazy(() => import('./pages/recruiter/StudentProfilePage'))
const AdminQuestionsPage = lazy(() => import('./pages/admin/AdminQuestionsPage'))
const AdminAuditPage = lazy(() => import('./pages/admin/AdminAuditPage'))
const AdminAnalyticsPage = lazy(() => import('./pages/admin/AdminAnalyticsPage'))
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'))
const StudyPlanPage = lazy(() => import('./pages/dashboard/StudyPlanPage'))
const SharedReportPage = lazy(() => import('./pages/feedback/SharedReportPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

const Loading = () => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
    }}
  >
    <Spin size="large" />
  </div>
)

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/shared/:token" element={<SharedReportPage />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                {/* Student */}
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/interview/new" element={<InterviewWizardPage />} />
                <Route path="/interview/:id" element={<InterviewSessionPage />} />
                <Route
                  path="/interview/:id/confirmation"
                  element={<InterviewConfirmationPage />}
                />
                <Route path="/feedback/:id" element={<FeedbackPage />} />
                <Route path="/history" element={<FeedbackHistoryPage />} />
                <Route path="/study-plan" element={<StudyPlanPage />} />
                <Route path="/settings" element={<ProfilePage />} />

                {/* Recruiter */}
                <Route element={<ProtectedRoute roles={['recruiter', 'admin']} />}>
                  <Route path="/recruiter" element={<RecruiterDashboardPage />} />
                  <Route
                    path="/recruiter/students/:studentId"
                    element={<StudentProfilePage />}
                  />
                </Route>

                {/* Admin */}
                <Route element={<ProtectedRoute roles={['admin']} />}>
                  <Route path="/admin/questions" element={<AdminQuestionsPage />} />
                  <Route path="/admin/audit" element={<AdminAuditPage />} />
                  <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
                </Route>
              </Route>
            </Route>

            {/* Redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
