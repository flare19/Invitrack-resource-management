import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import MyProfilePage from '@/pages/users/myProfilePage'
import * as AuthContextModule from '@/context/AuthContext'
import * as usersApi from '@/api/users'

vi.mock('@/api/users', () => ({
  updateMyProfile: vi.fn(),
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

function makeAuthState(overrides = {}) {
  return {
    isLoading: false,
    isAuthenticated: true,
    accessToken: 'token-123',
    user: { ...mockUser, ...overrides },
    roles: mockUser.roles,
    permissions: [],
    login: vi.fn(),
    setToken: vi.fn(),
    logout: vi.fn(),
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

describe('MyProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue(makeAuthState())
    vi.mocked(usersApi.updateMyProfile).mockResolvedValue(mockUser)
  })

  it('should render profile page', async () => {
    renderWithProviders(<MyProfilePage />)

    expect(screen.getByText('My Profile')).toBeInTheDocument()
  })

  it('should display read-only account fields', async () => {
    renderWithProviders(<MyProfilePage />)

    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    expect(screen.getByText('Verified')).toBeInTheDocument()
  })

  it('should display roles', async () => {
    renderWithProviders(<MyProfilePage />)

    expect(screen.getByText('admin')).toBeInTheDocument()
  })

  it('should display member since date', async () => {
    renderWithProviders(<MyProfilePage />)

    const memberDate = new Date('2024-01-01T00:00:00Z').toLocaleDateString()
    expect(screen.getByText(memberDate)).toBeInTheDocument()
  })

  it('should display editable profile fields initially as read-only', async () => {
    renderWithProviders(<MyProfilePage />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('jdoe')).toBeInTheDocument()
    expect(screen.getByText('Engineering')).toBeInTheDocument()
  })

  it('should show Edit button initially', async () => {
    renderWithProviders(<MyProfilePage />)

    const editButton = screen.getByRole('button', { name: /edit/i })
    expect(editButton).toBeInTheDocument()
  })

  it('should switch to edit mode when Edit button clicked', async () => {
    renderWithProviders(<MyProfilePage />)

    const editButton = screen.getByRole('button', { name: /edit/i })
    fireEvent.click(editButton)

    await waitFor(() => {
      const fullNameInput = screen.getByDisplayValue('John Doe')
      expect(fullNameInput).toBeInTheDocument()
    })
  })

  it('should show form inputs in edit mode', async () => {
    renderWithProviders(<MyProfilePage />)

    const editButton = screen.getByRole('button', { name: /edit/i })
    fireEvent.click(editButton)

    await waitFor(() => {
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument()
      expect(screen.getByDisplayValue('jdoe')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Engineering')).toBeInTheDocument()
    })
  })

  it('should show Save and Cancel buttons in edit mode', async () => {
    renderWithProviders(<MyProfilePage />)

    const editButton = screen.getByRole('button', { name: /edit/i })
    fireEvent.click(editButton)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })
  })

  it('should cancel edit and return to read-only mode', async () => {
    renderWithProviders(<MyProfilePage />)

    const editButton = screen.getByRole('button', { name: /edit/i })
    fireEvent.click(editButton)

    const cancelButton = await screen.findByRole('button', { name: /cancel/i })
    fireEvent.click(cancelButton)

    await waitFor(() => {
      expect(screen.queryByDisplayValue('John Doe')).not.toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
  })

  it('should validate full name is required', async () => {
    renderWithProviders(<MyProfilePage />)

    const editButton = screen.getByRole('button', { name: /edit/i })
    fireEvent.click(editButton)

    const fullNameInput = await screen.findByDisplayValue('John Doe')
    fireEvent.change(fullNameInput, { target: { value: '' } })

    const saveButton = screen.getByRole('button', { name: /save changes/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText('Full name is required')).toBeInTheDocument()
    })
  })

  it('should submit profile update', async () => {
    renderWithProviders(<MyProfilePage />)

    const editButton = screen.getByRole('button', { name: /edit/i })
    fireEvent.click(editButton)

    const fullNameInput = await screen.findByDisplayValue('John Doe')
    fireEvent.change(fullNameInput, { target: { value: 'Jane Doe' } })

    const saveButton = screen.getByRole('button', { name: /save changes/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(vi.mocked(usersApi.updateMyProfile)).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: 'Jane Doe',
        })
      )
    })
  })

  it('should show success message after update', async () => {
    renderWithProviders(<MyProfilePage />)

    const editButton = screen.getByRole('button', { name: /edit/i })
    fireEvent.click(editButton)

    const fullNameInput = await screen.findByDisplayValue('John Doe')
    fireEvent.change(fullNameInput, { target: { value: 'Jane Doe' } })

    const saveButton = screen.getByRole('button', { name: /save changes/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText('Profile updated successfully.')).toBeInTheDocument()
    })
  })

  it('should handle update errors', async () => {
    vi.mocked(usersApi.updateMyProfile).mockRejectedValueOnce({
      response: { status: 422 },
    })

    renderWithProviders(<MyProfilePage />)

    const editButton = screen.getByRole('button', { name: /edit/i })
    fireEvent.click(editButton)

    const fullNameInput = await screen.findByDisplayValue('John Doe')
    fireEvent.change(fullNameInput, { target: { value: 'Jane Doe' } })

    const saveButton = screen.getByRole('button', { name: /save changes/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(
        screen.getByText('Validation failed. Please check your inputs.')
      ).toBeInTheDocument()
    })
  })

  it('should display unverified status', async () => {
    mockUseAuth.mockReturnValue(
      makeAuthState({ is_verified: false })
    )

    renderWithProviders(<MyProfilePage />)

    expect(screen.getByText('Unverified')).toBeInTheDocument()
  })

  it('should handle missing user gracefully', async () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      accessToken: 'token-123',
      user: null,
      roles: [],
      permissions: [],
      login: vi.fn(),
      setToken: vi.fn(),
      logout: vi.fn(),
    })

    const { container } = renderWithProviders(<MyProfilePage />)

    // LoadingSpinner is displayed when user is null
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('should display multiple roles', async () => {
    mockUseAuth.mockReturnValue(
      makeAuthState({
        roles: [
          { id: 1, name: 'admin', priority: 100, description: 'Admin' },
          { id: 2, name: 'manager', priority: 50, description: 'Manager' },
        ],
      })
    )

    renderWithProviders(<MyProfilePage />)

    expect(screen.getByText('admin, manager')).toBeInTheDocument()
  })

  it('should update display_name and department', async () => {
    renderWithProviders(<MyProfilePage />)

    const editButton = screen.getByRole('button', { name: /edit/i })
    fireEvent.click(editButton)

    const displayNameInput = await screen.findByDisplayValue('jdoe')
    const deptInput = screen.getByDisplayValue('Engineering')

    fireEvent.change(displayNameInput, { target: { value: 'johndoe' } })
    fireEvent.change(deptInput, { target: { value: 'Management' } })

    const saveButton = screen.getByRole('button', { name: /save changes/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(vi.mocked(usersApi.updateMyProfile)).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: 'John Doe',
          display_name: 'johndoe',
          department: 'Management',
        })
      )
    })
  })
})
