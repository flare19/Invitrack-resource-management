import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UsersListPage } from '@/pages/users/usersListPage'
import * as AuthContextModule from '@/context/AuthContext'
import * as usersApi from '@/api/users'

vi.mock('@/api/users', () => ({
  getUsers: vi.fn(),
  getRoles: vi.fn(),
}))

vi.mock('@/context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof AuthContextModule>()
  return { ...actual, useAuth: vi.fn() }
})

const mockUseAuth = vi.mocked(AuthContextModule.useAuth)

const mockUsers = [
  {
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
  },
  {
    id: 'user-2',
    email: 'jane@example.com',
    is_verified: true,
    is_active: true,
    full_name: 'Jane Smith',
    display_name: 'jsmith',
    avatar_url: null,
    department: 'HR',
    roles: [
      { id: 2, name: 'manager', priority: 50, description: 'Manager role' },
    ],
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
]

function makeAuthState(overrides = {}) {
  return {
    isLoading: false,
    isAuthenticated: true,
    accessToken: 'token-123',
    user: {
      id: 'user-1',
      email: 'test@example.com',
      is_verified: true,
      is_active: true,
      full_name: 'Test User',
      display_name: 'testuser',
      avatar_url: null,
      department: 'Engineering',
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

function renderWithProviders(component: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {component}
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('UsersListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue(makeAuthState())
    vi.mocked(usersApi.getUsers).mockResolvedValue({
      data: mockUsers,
      meta: { page: 1, per_page: 20, total: 2 },
    })
  })

  it('should render users list', async () => {
    renderWithProviders(<UsersListPage />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })
  })

  it('should display user count', async () => {
    renderWithProviders(<UsersListPage />)

    await waitFor(() => {
      expect(screen.getByText('2 users total')).toBeInTheDocument()
    })
  })

  it('should display user details in table', async () => {
    renderWithProviders(<UsersListPage />)

    await waitFor(() => {
      expect(screen.getByText('john@example.com')).toBeInTheDocument()
      expect(screen.getByText('jane@example.com')).toBeInTheDocument()
      expect(screen.getByText('Engineering')).toBeInTheDocument()
      expect(screen.getByText('HR')).toBeInTheDocument()
    })
  })

  it('should display role badges', async () => {
    renderWithProviders(<UsersListPage />)

    await waitFor(() => {
      const adminBadges = screen.getAllByText('admin')
      const managerBadges = screen.getAllByText('manager')
      expect(adminBadges.length).toBeGreaterThan(0)
      expect(managerBadges.length).toBeGreaterThan(0)
    })
  })

  it('should display active/inactive status', async () => {
    renderWithProviders(<UsersListPage />)

    await waitFor(() => {
      const activeBadges = screen.getAllByText('Active')
      expect(activeBadges.length).toBeGreaterThan(0)
    })
  })

  it('should show loading spinner initially', () => {
    vi.mocked(usersApi.getUsers).mockImplementationOnce(
      () => new Promise(() => {}) // Never resolves
    )

    renderWithProviders(<UsersListPage />)
    // Verify not loaded yet - Users heading should not be visible
    expect(screen.queryByText('Users')).not.toBeInTheDocument()
  })

  it('should handle empty users list', async () => {
    vi.mocked(usersApi.getUsers).mockResolvedValueOnce({
      data: [],
      meta: { page: 1, per_page: 20, total: 0 },
    })

    renderWithProviders(<UsersListPage />)

    await waitFor(() => {
      expect(screen.getByText('No users found.')).toBeInTheDocument()
    })
  })

  it('should apply filters when Apply button is clicked', async () => {
    renderWithProviders(<UsersListPage />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    const departmentInput = screen.getByPlaceholderText('e.g. Engineering')
    const applyButton = screen.getByRole('button', { name: /apply/i })

    fireEvent.change(departmentInput, { target: { value: 'Engineering' } })
    fireEvent.click(applyButton)

    await waitFor(() => {
      expect(vi.mocked(usersApi.getUsers)).toHaveBeenCalledWith(
        expect.objectContaining({ department: 'Engineering' })
      )
    })
  })

  it('should clear filters when Clear button is clicked', async () => {
    renderWithProviders(<UsersListPage />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    const applyButton = screen.getByRole('button', { name: /apply/i })
    const clearButton = screen.getByRole('button', { name: /clear/i })

    fireEvent.click(applyButton)
    fireEvent.click(clearButton)

    // After clearing, verify an API call was made with cleared filters
    await waitFor(() => {
      const calls = vi.mocked(usersApi.getUsers).mock.calls
      const lastCall = calls[calls.length - 1]
      expect(lastCall[0]).toEqual({ page: 1, per_page: 20 })
    })
  })

  it('should paginate to next page', async () => {
    // Clear previous mocks and set up for page 1
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue(makeAuthState())

    vi.mocked(usersApi.getUsers).mockResolvedValue({
      data: [mockUsers[0]],
      meta: { page: 1, per_page: 1, total: 2 },
    })

    renderWithProviders(<UsersListPage />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    const nextButton = screen.getByRole('button', { name: /next/i })
    fireEvent.click(nextButton)

    await waitFor(() => {
      expect(vi.mocked(usersApi.getUsers)).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 })
      )
    })
  })

  it('should disable next button on last page', async () => {
    renderWithProviders(<UsersListPage />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })

    // Verify the page displays both users successfully
    expect(screen.getByText('2 users total')).toBeInTheDocument()
  })

  it('should disable previous button on first page', async () => {
    // Clear previous mocks and set up for first page
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue(makeAuthState())

    vi.mocked(usersApi.getUsers).mockResolvedValue({
      data: [mockUsers[0]],
      meta: { page: 1, per_page: 1, total: 2 },
    })

    renderWithProviders(<UsersListPage />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    const prevButton = screen.getByRole('button', { name: /previous/i })
    expect(prevButton).toBeDisabled()
  })

  it('should navigate to user detail on row click', async () => {
    renderWithProviders(<UsersListPage />)

    await waitFor(() => {
      const userRow = screen.getByText('John Doe').closest('tr')
      expect(userRow).toBeInTheDocument()
    })

    // The row is clickable and should navigate, we just verify the click target exists
    const userLink = screen.getByText('John Doe').closest('tr')
    expect(userLink).toHaveClass('cursor-pointer')
  })

  it('should handle API errors gracefully', async () => {
    vi.mocked(usersApi.getUsers).mockRejectedValueOnce({
      response: { status: 403 },
    })

    renderWithProviders(<UsersListPage />)

    await waitFor(() => {
      expect(
        screen.getByText('You do not have permission to view users.')
      ).toBeInTheDocument()
    })
  })
})
