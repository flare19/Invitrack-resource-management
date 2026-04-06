import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/context/AuthContext'

vi.mock('@/api/auth', () => ({
  refreshToken: vi.fn(),
  logout: vi.fn(),
}))

vi.mock('@/api/users', () => ({
  getMe: vi.fn(),
  getRolePermissions: vi.fn(),
}))

vi.mock('@/api/axios', () => ({
  setAccessToken: vi.fn(),
  setAuthHandlers: vi.fn(),
  default: { post: vi.fn() },
}))

import { refreshToken } from '@/api/auth'
import { getMe, getRolePermissions } from '@/api/users'

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  is_verified: true,
  is_active: true,
  full_name: 'Test User',
  display_name: null,
  avatar_url: null,
  department: null,
  roles: [{ id: 1, name: 'employee', priority: 10, description: null }],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const mockPermissions = [
  { id: 1, code: 'inventory:write', description: null },
]

function TestConsumer() {
  const { isAuthenticated, isLoading, user, roles, permissions } = useAuth()
  if (isLoading) return <div>loading</div>
  return (
    <div>
      <div data-testid="authenticated">{String(isAuthenticated)}</div>
      <div data-testid="user">{user?.email ?? 'none'}</div>
      <div data-testid="roles">{roles.map((r) => r.name).join(',')}</div>
      <div data-testid="permissions">{permissions.join(',')}</div>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sets isAuthenticated to false when refresh fails', async () => {
    vi.mocked(refreshToken).mockRejectedValueOnce(new Error('Unauthorized'))

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
    })
  })

  it('hydrates user, roles and permissions on successful refresh', async () => {
    vi.mocked(refreshToken).mockResolvedValueOnce({
      access_token: 'token-123',
      token_type: 'Bearer',
      expires_in: 900,
    })
    vi.mocked(getMe).mockResolvedValueOnce(mockUser)
    vi.mocked(getRolePermissions).mockResolvedValueOnce(mockPermissions)

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true')
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      expect(screen.getByTestId('roles')).toHaveTextContent('employee')
      expect(screen.getByTestId('permissions')).toHaveTextContent('inventory:write')
    })
  })

  it('deduplicates permissions from multiple roles', async () => {
    const userWithTwoRoles = {
      ...mockUser,
      roles: [
        { id: 1, name: 'employee', priority: 10, description: null },
        { id: 2, name: 'manager', priority: 50, description: null },
      ],
    }

    vi.mocked(refreshToken).mockResolvedValueOnce({
      access_token: 'token-123',
      token_type: 'Bearer',
      expires_in: 900,
    })
    vi.mocked(getMe).mockResolvedValueOnce(userWithTwoRoles)
    vi.mocked(getRolePermissions)
      .mockResolvedValueOnce(mockPermissions)
      .mockResolvedValueOnce(mockPermissions) // same permission from both roles

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      // inventory:write should appear only once despite coming from two roles
      expect(screen.getByTestId('permissions')).toHaveTextContent('inventory:write')
      expect(screen.getByTestId('permissions').textContent).toBe('inventory:write')
    })
  })
})