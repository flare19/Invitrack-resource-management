import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
      <h1 className="text-2xl font-semibold">404 — Page Not Found</h1>
      <p className="text-muted-foreground text-sm">
        The page you're looking for doesn't exist.
      </p>
      <Link to="/dashboard" className="text-sm underline text-muted-foreground hover:text-foreground">
        Back to Dashboard
      </Link>
    </div>
  )
}