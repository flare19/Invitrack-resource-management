import { useAuth } from '@/context/AuthContext'
import { LogOut, User } from 'lucide-react'

export default function Navbar() {
  const { user, logout } = useAuth()

  return (
    <header className="h-14 border-b bg-background flex items-center justify-between px-6">
      <span className="font-semibold text-sm tracking-tight">Invitrack</span>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          <span>{user?.display_name ?? user?.full_name}</span>
        </div>
        <button
          onClick={() => void logout()}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  )
}