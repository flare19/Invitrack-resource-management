import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { setAccessToken } from '@/api/axios'
import { getMe, getRolePermissions } from '@/api/users'
import LoadingSpinner from '@/components/shared/LoadingSpinner'

export default function OAuthSuccessPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const called = useRef(false)

  useEffect(() => {
    if (called.current) return
    called.current = true

    const accessToken = searchParams.get('access_token')

    if (!accessToken) {
      void navigate('/login?error=oauth_failed', { replace: true })
      return
    }

    async function hydrate() {
      try {
        setAccessToken(accessToken!)
        const user = await getMe()

        let permissions: string[] = []
        try {
          const results = await Promise.all(
            user.roles.map((role) => getRolePermissions(role.id))
          )
          permissions = [...new Set(results.flat().map((p) => p.code))]
        } catch {
          // Non-admin users may not have access to role permissions endpoint
        }

        login(accessToken!, user, permissions)
        void navigate('/dashboard', { replace: true })
      } catch {
        void navigate('/login?error=oauth_failed', { replace: true })
      }
    }

    void hydrate()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <LoadingSpinner fullPage />
}