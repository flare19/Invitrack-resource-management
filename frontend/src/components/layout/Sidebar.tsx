import { NavLink } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import {
  LayoutDashboard,
  Package,
  CalendarCheck,
  Users,
  ScrollText,
  BarChart2,
  Settings,
} from 'lucide-react'

type NavItem = {
  to: string
  label: string
  icon: React.ReactNode
}

export default function Sidebar() {
  const { roles } = useAuth()

  const isAdmin = roles.some((r) => r.name === 'admin')
  const isAdminOrManager = roles.some(
    (r) => r.name === 'admin' || r.name === 'manager'
  )

  const navItems: NavItem[] = [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { to: '/inventory', label: 'Inventory', icon: <Package className="h-4 w-4" /> },
    { to: '/bookings', label: 'Bookings', icon: <CalendarCheck className="h-4 w-4" /> },
    ...(isAdminOrManager
      ? [{ to: '/users', label: 'Users', icon: <Users className="h-4 w-4" /> }]
      : []),
    ...(isAdminOrManager
      ? [{ to: '/analytics', label: 'Analytics', icon: <BarChart2 className="h-4 w-4" /> }]
      : []),
    ...(isAdmin
      ? [{ to: '/audit', label: 'Audit', icon: <ScrollText className="h-4 w-4" /> }]
      : []),
    ...(isAdmin
      ? [{ to: '/settings/roles', label: 'Settings', icon: <Settings className="h-4 w-4" /> }]
      : []),
  ]

  return (
    <aside className="w-56 border-r bg-background flex flex-col py-4">
      <nav className="flex flex-col gap-1 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}