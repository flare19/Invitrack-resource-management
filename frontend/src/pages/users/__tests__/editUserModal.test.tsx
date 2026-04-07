import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import EditUserModal from '@/pages/users/editUserModal'

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

describe('EditUserModal', () => {
  const mockOnOpenChange = vi.fn()
  const mockOnSubmit = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not render when closed', () => {
    renderWithProviders(
      <EditUserModal
        open={false}
        onOpenChange={mockOnOpenChange}
        user={mockUser}
        isLoading={false}
        onSubmit={mockOnSubmit}
        error={null}
      />
    )

    expect(screen.queryByRole('heading', { name: /edit user/i })).not.toBeInTheDocument()
  })

  it('should render when open', async () => {
    renderWithProviders(
      <EditUserModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={mockUser}
        isLoading={false}
        onSubmit={mockOnSubmit}
        error={null}
      />
    )

    expect(screen.getByRole('heading', { name: /edit user/i })).toBeInTheDocument()
  })

  it('should populate form with user data', async () => {
    renderWithProviders(
      <EditUserModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={mockUser}
        isLoading={false}
        onSubmit={mockOnSubmit}
        error={null}
      />
    )

    const fullNameInput = screen.getByDisplayValue('John Doe')
    const displayNameInput = screen.getByDisplayValue('jdoe')
    const deptInput = screen.getByDisplayValue('Engineering')

    expect(fullNameInput).toBeInTheDocument()
    expect(displayNameInput).toBeInTheDocument()
    expect(deptInput).toBeInTheDocument()
  })

  it('should show all form fields', async () => {
    renderWithProviders(
      <EditUserModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={mockUser}
        isLoading={false}
        onSubmit={mockOnSubmit}
        error={null}
      />
    )

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/department/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/active/i)).toBeInTheDocument()
  })

  it('should have active checkbox checked for active user', async () => {
    renderWithProviders(
      <EditUserModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={mockUser}
        isLoading={false}
        onSubmit={mockOnSubmit}
        error={null}
      />
    )

    const activeCheckbox = screen.getByRole('checkbox', { name: /active/i })
    expect(activeCheckbox).toBeChecked()
  })

  it('should have active checkbox unchecked for inactive user', async () => {
    const inactiveUser = { ...mockUser, is_active: false }

    renderWithProviders(
      <EditUserModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={inactiveUser}
        isLoading={false}
        onSubmit={mockOnSubmit}
        error={null}
      />
    )

    const activeCheckbox = screen.getByRole('checkbox', { name: /active/i })
    expect(activeCheckbox).not.toBeChecked()
  })

  it('should validate full name is required', async () => {
    renderWithProviders(
      <EditUserModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={mockUser}
        isLoading={false}
        onSubmit={mockOnSubmit}
        error={null}
      />
    )

    const fullNameInput = screen.getByDisplayValue('John Doe')
    fireEvent.change(fullNameInput, { target: { value: '' } })

    const submitButton = screen.getByRole('button', { name: /save changes/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Full name is required')).toBeInTheDocument()
    })
  })

  it('should submit form with updated data', async () => {
    renderWithProviders(
      <EditUserModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={mockUser}
        isLoading={false}
        onSubmit={mockOnSubmit}
        error={null}
      />
    )

    const fullNameInput = screen.getByDisplayValue('John Doe')
    fireEvent.change(fullNameInput, { target: { value: 'Jane Doe' } })

    const submitButton = screen.getByRole('button', { name: /save changes/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        full_name: 'Jane Doe',
        display_name: 'jdoe',
        department: 'Engineering',
        is_active: true,
      })
    })
  })

  it('should toggle active status', async () => {
    renderWithProviders(
      <EditUserModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={mockUser}
        isLoading={false}
        onSubmit={mockOnSubmit}
        error={null}
      />
    )

    const activeCheckbox = screen.getByRole('checkbox', { name: /active/i })
    fireEvent.click(activeCheckbox)

    const submitButton = screen.getByRole('button', { name: /save changes/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          is_active: false,
        })
      )
    })
  })

  it('should show Cancel button', async () => {
    renderWithProviders(
      <EditUserModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={mockUser}
        isLoading={false}
        onSubmit={mockOnSubmit}
        error={null}
      />
    )

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    expect(cancelButton).toBeInTheDocument()
  })

  it('should close on cancel', async () => {
    renderWithProviders(
      <EditUserModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={mockUser}
        isLoading={false}
        onSubmit={mockOnSubmit}
        error={null}
      />
    )

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelButton)

    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('should disable submit button when loading', async () => {
    renderWithProviders(
      <EditUserModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={mockUser}
        isLoading={true}
        onSubmit={mockOnSubmit}
        error={null}
      />
    )

    const submitButton = screen.getByRole('button', { name: /save changes/i })
    expect(submitButton).toBeDisabled()
  })

  it('should show server error', async () => {
    renderWithProviders(
      <EditUserModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={mockUser}
        isLoading={false}
        onSubmit={mockOnSubmit}
        error={{ response: { status: 422 } }}
      />
    )

    expect(
      screen.getByText('Validation failed. Please check your inputs.')
    ).toBeInTheDocument()
  })

  it('should handle 404 error', async () => {
    renderWithProviders(
      <EditUserModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={mockUser}
        isLoading={false}
        onSubmit={mockOnSubmit}
        error={{ response: { status: 404 } }}
      />
    )

    expect(screen.getByText('User not found.')).toBeInTheDocument()
  })

  it('should update optional fields', async () => {
    const userNoOptionals = { ...mockUser, display_name: null, department: null }

    renderWithProviders(
      <EditUserModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={userNoOptionals}
        isLoading={false}
        onSubmit={mockOnSubmit}
        error={null}
      />
    )

    const displayNameInput = screen.getByLabelText(/display name/i) as HTMLInputElement
    const deptInput = screen.getByLabelText(/department/i) as HTMLInputElement

    fireEvent.change(displayNameInput, { target: { value: 'newdisplayname' } })
    fireEvent.change(deptInput, { target: { value: 'Sales' } })

    const submitButton = screen.getByRole('button', { name: /save changes/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          display_name: 'newdisplayname',
          department: 'Sales',
        })
      )
    })
  })
})
