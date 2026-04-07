import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import LoginPage from '@/pages/auth/LoginPage'
import * as AuthContextModule from '@/context/AuthContext'
import * as authApi from '@/api/auth'
import * as usersApi from '@/api/users'

vi.mock('@/api/auth', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  refreshToken: vi.fn(),
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

vi.mock('@/context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof AuthContextModule>()
  return { ...actual, useAuth: vi.fn() }
})

const mockLogin = vi.fn()
const mockUseAuth = vi.mocked(AuthContextModule.useAuth)

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

function makeAuthState(overrides = {}) {
  return {
    isLoading: false,
    isAuthenticated: false,
    accessToken: null,
    user: null,
    roles: [],
    permissions: [],
    login: mockLogin,
    logout: vi.fn(),
    setToken: vi.fn(),
    ...overrides,
  }
}

function renderLoginPage(initialPath = '/login') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue(makeAuthState())
  })

  it('renders the login form', () => {
    renderLoginPage()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByText('Sign in')).toBeInTheDocument()
  })

  it('redirects to dashboard if already authenticated', () => {
    mockUseAuth.mockReturnValue(makeAuthState({ isAuthenticated: true }))
    renderLoginPage()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('shows registered banner when ?registered=true', () => {
    renderLoginPage('/login?registered=true')
    expect(screen.getByText(/check your email/i)).toBeInTheDocument()
  })

  it('shows validation error when email is empty', async () => {
    const user = userEvent.setup()
    renderLoginPage()

    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
        expect(screen.getByText(/valid email/i)).toBeInTheDocument()
    })
})

  it('calls login API and hydrates auth context on success', async () => {
    const user = userEvent.setup()

    vi.mocked(authApi.login).mockResolvedValueOnce({
      access_token: 'token-123',
      token_type: 'Bearer',
      expires_in: 900,
    })
    vi.mocked(usersApi.getMe).mockResolvedValueOnce(mockUser)
    vi.mocked(usersApi.getRolePermissions).mockResolvedValueOnce([
      { id: 1, code: 'inventory:write', description: null },
    ])

    renderLoginPage()

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith('test@example.com', 'password123')
      expect(mockLogin).toHaveBeenCalledWith(
        'token-123',
        mockUser,
        ['inventory:write']
      )
    })
  })

  it('shows error on 401 response', async () => {
    const user = userEvent.setup()

    vi.mocked(authApi.login).mockRejectedValueOnce({
      response: { status: 401, data: {} },
    })

    renderLoginPage()

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument()
    })
  })

  it('shows deactivated error on 403 with no verify keyword', async () => {
    const user = userEvent.setup()

    vi.mocked(authApi.login).mockRejectedValueOnce({
      response: {
        status: 403,
        data: { error: { message: 'Account is inactive' } },
      },
    })

    renderLoginPage()

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText('Your account has been deactivated')).toBeInTheDocument()
    })
  })

  it('shows unverified error on 403 with verify keyword', async () => {
    const user = userEvent.setup()

    vi.mocked(authApi.login).mockRejectedValueOnce({
      response: {
        status: 403,
        data: { error: { message: 'Please verify your email' } },
      },
    })

    renderLoginPage()

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText('Please verify your email before logging in')).toBeInTheDocument()
    })
  })
})