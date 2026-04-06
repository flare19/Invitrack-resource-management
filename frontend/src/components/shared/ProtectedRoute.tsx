import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import LoadingSpinner from './LoadingSpinner'
import ForbiddenPage from './ForbiddenPage'

type Props = {
  requiredRole?: string | string[] | undefined
}

export default function ProtectedRoute({ requiredRole }: Props) {
  const { isLoading, isAuthenticated, roles } = useAuth()

  if (isLoading) {
    return <LoadingSpinner fullPage />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole) {
    const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    const hasRole = roles.some((r) => requiredRoles.includes(r.name))

    if (!hasRole) {
      return <ForbiddenPage />
    }
  }

  return <Outlet />
}