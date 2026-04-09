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

// Inventory
import InventoryListPage from '@/pages/inventory/InventoryListPage'
import InventoryItemPage from '@/pages/inventory/InventoryItemPage'
import CategoriesPage from '@/pages/inventory/CategoriesPage'
import LocationsPage from '@/pages/inventory/LocationsPage'
import TransactionsPage from '@/pages/inventory/TransactionsPage'

// Users
import MyProfilePage from '@/pages/users/myProfilePage'
import { UsersListPage } from '@/pages/users/usersListPage'
import UserDetailPage from '@/pages/users/UserDetailPage'

// Bookings
import ReservationsListPage from '@/pages/bookings/ReservationsListPage'
import ReservationDetailPage from '@/pages/bookings/ReservationDetailPage'
import ResourcesListPage from '@/pages/bookings/ResourcesListPage'
import ResourceDetailPage from '@/pages/bookings/ResourceDetailPage'
// Settings
import RolesManagementPage from '@/pages/settings/RolesManagementPage'

// Audit
import AuditPage from '@/pages/audit/AuditPage'

// Placeholders — replaced when modules are implemented
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
          { path: '/inventory/categories', element: <CategoriesPage /> },
          { path: '/inventory/locations', element: <LocationsPage /> },
          { path: '/inventory/transactions', element: <TransactionsPage /> },
          { path: '/inventory/:id', element: <InventoryItemPage /> },
          { path: '/bookings', element: <ReservationsListPage /> },
          { path: '/bookings/:id', element: <ReservationDetailPage /> },
          { path: '/bookings/resources', element: <ResourcesListPage /> },
          { path: '/bookings/resources/:id', element: <ResourceDetailPage /> },
          { path: '/profile', element: <MyProfilePage /> },
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
          { path: '/settings/roles', element: <RolesManagementPage /> },
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