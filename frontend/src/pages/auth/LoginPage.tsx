import { useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/context/AuthContext'
import { setAccessToken } from '@/api/axios'
import { login as apiLogin } from '@/api/auth'
import { getMe, getRolePermissions } from '@/api/users'
import LoadingSpinner from '@/components/shared/LoadingSpinner'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type FormData = z.infer<typeof schema>

function getErrorMessage(status: number, data: unknown): string {
  if (status === 401) return 'Invalid email or password'
  if (status === 403) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof (data as { error: { message?: string } }).error.message === 'string'
        ? (data as { error: { message: string } }).error.message.toLowerCase()
        : ''
    if (message.includes('verify')) return 'Please verify your email before logging in'
    return 'Your account has been deactivated'
  }
  return 'Something went wrong. Please try again.'
}

export default function LoginPage() {
  const { isAuthenticated, isLoading, login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const registered = searchParams.get('registered') === 'true'
  const emailConflict = searchParams.get('error') === 'email_conflict'

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      void navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate])

  async function onSubmit(data: FormData) {
    try {
      const { access_token } = await apiLogin(data.email, data.password)
      setAccessToken(access_token)
      const user = await getMe()

      let permissions: string[] = []
      try {
        const results = await Promise.all(
          user.roles.map((role) => getRolePermissions(role.id))
        )
        permissions = [...new Set(results.flat().map((p) => p.code))]
      } catch {
        // Non-admin users may not have access to role permissions endpoint
        // Proceed with empty permissions array
      }

      login(access_token, user, permissions)
      void navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      const status =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { status?: number } }).response?.status === 'number'
          ? (err as { response: { status: number } }).response.status
          : 0
      const data =
        typeof err === 'object' &&
        err !== null &&
        'response' in err
          ? (err as { response: { data?: unknown } }).response.data
          : undefined
      setError('root', { message: getErrorMessage(status, data) })
    }
  }

  if (isLoading) return <LoadingSpinner fullPage />

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-8 shadow-sm">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Invitrack</h1>
          <p className="text-sm text-muted-foreground">Sign in to your account</p>
        </div>

        {registered && (
          <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            Account created. Check your email to verify your account.
          </p>
        )}

        {emailConflict && (
          <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            This email is already registered. Please sign in with your password.
          </p>
        )}

        {errors.root && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errors.root.message}
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
  <label htmlFor="email" className="text-sm font-medium">Email</label>
  <input
    id="email"
    {...register('email')}
    type="email"
    autoComplete="email"
    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
  />
  {errors.email && (
    <p className="text-xs text-destructive">{errors.email.message}</p>
  )}
</div>

<div className="space-y-1">
  <label htmlFor="password" className="text-sm font-medium">Password</label>
  <input
    id="password"
    {...register('password')}
    type="password"
    autoComplete="current-password"
    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
  />
  {errors.password && (
    <p className="text-xs text-destructive">{errors.password.message}</p>
  )}
</div>

          <div className="text-right">
            <Link
              to="/forgot-password"
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <div className="space-y-2">
          <a
            href="/api/v1/auth/oauth/google"
            className="flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-accent transition-colors"
          >
            Continue with Google
          </a>
          <a
            href="/api/v1/auth/oauth/github"
            className="flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-accent transition-colors"
          >
            Continue with GitHub
          </a>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/register" className="underline hover:text-foreground">
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}