import { createBrowserRouter, Navigate } from 'react-router-dom'
import AppShell from '@/components/layout/AppShell'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import NotFoundPage from '@/components/shared/NotFoundPage'

// Auth pages
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import VerifyEmailPage from '@/pages/auth/VerifyEmailPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage'

// Dashboard
import DashboardPage from '@/pages/dashboard/DashboardPage'

// Placeholders — replaced when modules are implemented
const InventoryListPage = () => <div>Inventory</div>
const InventoryItemPage = () => <div>Inventory Item</div>
const BookingsListPage = () => <div>Bookings</div>
const BookingDetailPage = () => <div>Booking Detail</div>
const UsersListPage = () => <div>Users</div>
const UserDetailPage = () => <div>User Detail</div>
const AuditPage = () => <div>Audit</div>
const AnalyticsPage = () => <div>Analytics</div>

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  // Public routes
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/verify-email',
    element: <VerifyEmailPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
  },
  // Authenticated routes — wrapped in AppShell
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/inventory', element: <InventoryListPage /> },
          { path: '/inventory/:id', element: <InventoryItemPage /> },
          { path: '/bookings', element: <BookingsListPage /> },
          { path: '/bookings/:id', element: <BookingDetailPage /> },
        ],
      },
    ],
  },
  // Role-gated routes
  {
    element: <ProtectedRoute requiredRole={['admin', 'manager']} />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/users', element: <UsersListPage /> },
          { path: '/users/:id', element: <UserDetailPage /> },
          { path: '/analytics', element: <AnalyticsPage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute requiredRole="admin" />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/audit', element: <AuditPage /> },
        ],
      },
    ],
  },
  // 404
  {
    path: '*',
    element: <NotFoundPage />,
  },
])