import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import * as AuthContextModule from '@/context/AuthContext'

vi.mock('@/context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof AuthContextModule>()
  return { ...actual, useAuth: vi.fn() }
})

const mockUseAuth = vi.mocked(AuthContextModule.useAuth)

function renderWithRouter(requiredRole?: string | string[]) {
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route element={<ProtectedRoute requiredRole={requiredRole} />}>
          <Route path="/protected" element={<div>Protected Content</div>} />
        </Route>
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders spinner while loading', () => {
    mockUseAuth.mockReturnValue({
      isLoading: true,
      isAuthenticated: false,
      roles: [],
      permissions: [],
      accessToken: null,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      setToken: vi.fn(),
    })

    renderWithRouter()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
  })

  it('redirects to login when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
      roles: [],
      permissions: [],
      accessToken: null,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      setToken: vi.fn(),
    })

    renderWithRouter()
    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('renders children when authenticated', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      roles: [{ id: 3, name: 'employee', priority: 10, description: null }],
      permissions: [],
      accessToken: 'token-123',
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      setToken: vi.fn(),
    })

    renderWithRouter()
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('renders forbidden page when user lacks required role', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      roles: [{ id: 3, name: 'employee', priority: 10, description: null }],
      permissions: [],
      accessToken: 'token-123',
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      setToken: vi.fn(),
    })

    renderWithRouter('admin')
    expect(screen.getByText('403 — Forbidden')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('renders children when user has required role', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      roles: [{ id: 1, name: 'admin', priority: 100, description: null }],
      permissions: [],
      accessToken: 'token-123',
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      setToken: vi.fn(),
    })

    renderWithRouter('admin')
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('renders children when user has one of multiple required roles', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      roles: [{ id: 2, name: 'manager', priority: 50, description: null }],
      permissions: [],
      accessToken: 'token-123',
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      setToken: vi.fn(),
    })

    renderWithRouter(['admin', 'manager'])
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })
})