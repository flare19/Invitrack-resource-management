import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import {
  Package,
  CalendarCheck,
  Users,
  ScrollText,
  BarChart2,
} from 'lucide-react'

export default function DashboardPage() {
  const { user, roles, permissions } = useAuth()

  const isAdmin = roles.some((r) => r.name === 'admin')
  const isAdminOrManager = roles.some(
    (r) => r.name === 'admin' || r.name === 'manager'
  )

  const quickLinks = [
    {
      to: '/inventory',
      label: 'Inventory',
      icon: <Package className="h-5 w-5" />,
      visible: true,
    },
    {
      to: '/bookings',
      label: 'Bookings',
      icon: <CalendarCheck className="h-5 w-5" />,
      visible: true,
    },
    {
      to: '/users',
      label: 'Users',
      icon: <Users className="h-5 w-5" />,
      visible: isAdminOrManager,
    },
    {
      to: '/audit',
      label: 'Audit',
      icon: <ScrollText className="h-5 w-5" />,
      visible: isAdmin,
    },
    {
      to: '/analytics',
      label: 'Analytics',
      icon: <BarChart2 className="h-5 w-5" />,
      visible: isAdminOrManager,
    },
  ].filter((link) => link.visible)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Welcome, {user?.display_name ?? user?.full_name}
        </h1>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {roles.map((role) => (
          <span
            key={role.id}
            className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground"
          >
            {role.name}
          </span>
        ))}
      </div>

      {permissions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {permissions.map((code) => (
            <span
              key={code}
              className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
            >
              {code}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {quickLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="flex items-center gap-3 rounded-lg border bg-card p-4 text-sm font-medium hover:bg-accent transition-colors"
          >
            {link.icon}
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  )
}