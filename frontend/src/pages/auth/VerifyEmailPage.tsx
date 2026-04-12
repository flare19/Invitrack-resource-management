import { useEffect, useState, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { verifyEmail } from '@/api/auth'
import LoadingSpinner from '@/components/shared/LoadingSpinner'

type Status = 'loading' | 'success' | 'error'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<Status>('loading')
  const called = useRef(false)

  useEffect(() => {
    if (called.current) return
    called.current = true

    const token = searchParams.get('token')

    if (!token) {
      setStatus('error')
      return
    }

    verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'))
  }, [searchParams])

  if (status === 'loading') return <LoadingSpinner fullPage />

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-8 shadow-sm text-center">
        <h1 className="text-2xl font-semibold">Invitrack</h1>

        {status === 'success' ? (
          <>
            <p className="text-sm text-muted-foreground">
              Your email has been verified successfully.
            </p>
            <Link
              to="/login"
              className="inline-block text-sm underline hover:text-foreground text-muted-foreground"
            >
              Sign in
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm text-destructive">
              This verification link is invalid or has expired.
            </p>
            <p className="text-xs text-muted-foreground">
              Please request a new verification email when that option becomes available.
            </p>
            <Link
              to="/login"
              className="inline-block text-sm underline hover:text-foreground text-muted-foreground"
            >
              Back to Sign in
            </Link>
          </>
        )}
      </div>
    </div>
  )
}