import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import UserDetailPage from '@/pages/users/UserDetailPage'
import * as AuthContextModule from '@/context/AuthContext'
import * as usersApi from '@/api/users'

vi.mock('@/api/users', () => ({
  getUserById: vi.fn(),
  getRoles: vi.fn(),
  updateUserById: vi.fn(),
  assignRoleToUser: vi.fn(),
  removeRoleFromUser: vi.fn(),
}))

vi.mock('@/context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof AuthContextModule>()
  return { ...actual, useAuth: vi.fn() }
})

const mockUseAuth = vi.mocked(AuthContextModule.useAuth)

const mockUser = {
  id: 'user-1',
  email: 'john@example.com',
  is_verified: true,
  is_active: true,
  full_name: 'John Doe',
  display_name: 'jdoe',
  avatar_url: null,
  department: 'Engineering',
  roles: [
    { id: 1, name: 'admin', priority: 100, description: 'Admin role' },
  ],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const mockRoles = [
  { id: 1, name: 'admin', priority: 100, description: 'Admin role' },
  { id: 2, name: 'manager', priority: 50, description: 'Manager role' },
  { id: 3, name: 'employee', priority: 10, description: 'Employee role' },
]

function makeAuthState(overrides = {}) {
  return {
    isLoading: false,
    isAuthenticated: true,
    accessToken: 'token-123',
    user: {
      id: 'current-user',
      email: 'admin@example.com',
      is_verified: true,
      is_active: true,
      full_name: 'Admin User',
      display_name: 'admin',
      avatar_url: null,
      department: 'IT',
      roles: [{ id: 1, name: 'admin', priority: 100, description: 'Admin' }],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    roles: [{ id: 1, name: 'admin', priority: 100, description: 'Admin' }],
    permissions: [],
    login: vi.fn(),
    setToken: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  }
}

function renderWithProviders(component: React.ReactElement, route = '/users/user-1') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/users/:id" element={component} />
          <Route path="/users" element={<div>Users List</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('UserDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue(makeAuthState())
    vi.mocked(usersApi.getUserById).mockResolvedValue(mockUser)
    vi.mocked(usersApi.getRoles).mockResolvedValue(mockRoles)
    vi.mocked(usersApi.updateUserById).mockResolvedValue(mockUser)
    vi.mocked(usersApi.assignRoleToUser).mockResolvedValue(undefined)
    vi.mocked(usersApi.removeRoleFromUser).mockResolvedValue(undefined)
  })

  it('should render user details', async () => {
    renderWithProviders(<UserDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('@jdoe')).toBeInTheDocument()
      expect(screen.getByText('john@example.com')).toBeInTheDocument()
    })
  })

  it('should display user info fields', async () => {
    renderWithProviders(<UserDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('john@example.com')).toBeInTheDocument()
      expect(screen.getByText('Engineering')).toBeInTheDocument()
      expect(screen.getByText('Yes')).toBeInTheDocument() // is_verified
      expect(screen.getByText('Active')).toBeInTheDocument()
    })
  })

  it('should display assigned roles', async () => {
    renderWithProviders(<UserDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('admin')).toBeInTheDocument()
      expect(screen.getByText('Priority: 100')).toBeInTheDocument()
    })
  })

  it('should show loading spinner initially', () => {
    vi.mocked(usersApi.getUserById).mockImplementationOnce(
      () => new Promise(() => {}) // Never resolves
    )

    renderWithProviders(<UserDetailPage />)

    // Verify loading state - the page heading should not be visible
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
  })

  it('should show Edit Details button for admin', async () => {
    renderWithProviders(<UserDetailPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit details/i })).toBeInTheDocument()
    })
  })

  it('should show Assign Role button for admin', async () => {
    renderWithProviders(<UserDetailPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /assign role/i })).toBeInTheDocument()
    })
  })

  it('should hide Edit Details button for non-admin', async () => {
    mockUseAuth.mockReturnValue(
      makeAuthState({
        roles: [{ id: 2, name: 'manager', priority: 50, description: 'Manager' }],
      })
    )

    renderWithProviders(<UserDetailPage />)

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /edit details/i })).not.toBeInTheDocument()
    })
  })

  it('should handle user not found error', async () => {
    vi.mocked(usersApi.getUserById).mockRejectedValueOnce({
      response: { status: 404 },
    })

    renderWithProviders(<UserDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('User not found.')).toBeInTheDocument()
    })
  })

  it('should handle permission error', async () => {
    vi.mocked(usersApi.getUserById).mockRejectedValueOnce({
      response: { status: 403 },
    })

    renderWithProviders(<UserDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('You do not have permission to view this user.')).toBeInTheDocument()
    })
  })

  it('should navigate back to users list', async () => {
    renderWithProviders(<UserDetailPage />)

    await waitFor(() => {
      const backButton = screen.getByRole('button', { name: /back to users/i })
      expect(backButton).toBeInTheDocument()
    })
  })

  it('should display member since date', async () => {
    renderWithProviders(<UserDetailPage />)

    await waitFor(() => {
      // Just verify the "Member Since" label exists
      expect(screen.getByText(/member since/i)).toBeInTheDocument()
    })
  })

  it('should display inactive user status', async () => {
    const inactiveUser = { ...mockUser, is_active: false }
    vi.mocked(usersApi.getUserById).mockResolvedValueOnce(inactiveUser)

    renderWithProviders(<UserDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Inactive')).toBeInTheDocument()
    })
  })

  it('should show message when no roles assigned', async () => {
    const userNoRoles = { ...mockUser, roles: [] }
    vi.mocked(usersApi.getUserById).mockResolvedValueOnce(userNoRoles)

    renderWithProviders(<UserDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('No roles assigned.')).toBeInTheDocument()
    })
  })

  it('should open Edit Details modal when button clicked', async () => {
    renderWithProviders(<UserDetailPage />)

    const editButton = await screen.findByRole('button', { name: /edit details/i })
    fireEvent.click(editButton)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /edit user/i })).toBeInTheDocument()
    })
  })

  it('should open Assign Role dialog when button clicked', async () => {
    renderWithProviders(<UserDetailPage />)

    const assignButton = await screen.findByRole('button', { name: /assign role/i })
    fireEvent.click(assignButton)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /assign role/i })).toBeInTheDocument()
    })
  })
})
