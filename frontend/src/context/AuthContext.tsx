import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { setAccessToken, setAuthHandlers } from '@/api/axios'
import { refreshToken, logout as apiLogout } from '@/api/auth'
import { getMe, getRolePermissions } from '@/api/users'
import type { UserProfile, Role } from '@/types/users'

type AuthState = {
  accessToken: string | null
  user: UserProfile | null
  roles: Role[]
  permissions: string[]
  isAuthenticated: boolean
  isLoading: boolean
}

type AuthContextValue = AuthState & {
  login: (token: string, user: UserProfile, permissions: string[]) => void
  logout: () => Promise<void>
  setToken: (token: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function hydratePermissions(user: UserProfile): Promise<string[]> {
  const results = await Promise.all(
    user.roles.map((role) => getRolePermissions(role.id))
  )
  return [...new Set(results.flat().map((p) => p.code))]
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    accessToken: null,
    user: null,
    roles: [],
    permissions: [],
    isAuthenticated: false,
    isLoading: true,
  })

  const login = useCallback((token: string, user: UserProfile, permissions: string[]) => {
    setAccessToken(token)
    setState({
      accessToken: token,
      user,
      roles: user.roles,
      permissions,
      isAuthenticated: true,
      isLoading: false,
    })
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiLogout()
    } catch {
      // ignore — clear state regardless
    }
    setAccessToken(null)
    setState({
      accessToken: null,
      user: null,
      roles: [],
      permissions: [],
      isAuthenticated: false,
      isLoading: false,
    })
  }, [])

  const setToken = useCallback((token: string) => {
    setAccessToken(token)
    setState((prev) => ({ ...prev, accessToken: token }))
  }, [])

  useEffect(() => {
    setAuthHandlers({
      onTokenRefreshed: setToken,
      onAuthFailure: () => {
        setAccessToken(null)
        setState({
          accessToken: null,
          user: null,
          roles: [],
          permissions: [],
          isAuthenticated: false,
          isLoading: false,
        })
      },
    })
  }, [setToken])

  useEffect(() => {
    async function rehydrate() {
      try {
        const response = await refreshToken()
        setAccessToken(response.access_token)
        const user = await getMe()
        const permissions = await hydratePermissions(user)
        setState({
          accessToken: response.access_token,
          user,
          roles: user.roles,
          permissions,
          isAuthenticated: true,
          isLoading: false,
        })
      } catch {
        setAccessToken(null)
        setState({
          accessToken: null,
          user: null,
          roles: [],
          permissions: [],
          isAuthenticated: false,
          isLoading: false,
        })
      }
    }

    void rehydrate()
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, logout, setToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}