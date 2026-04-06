import { Link } from 'react-router-dom'

export default function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
      <h1 className="text-2xl font-semibold">403 — Forbidden</h1>
      <p className="text-muted-foreground text-sm">
        You don't have permission to view this page.
      </p>
      <Link to="/dashboard" className="text-sm underline text-muted-foreground hover:text-foreground">
        Back to Dashboard
      </Link>
    </div>
  )
}