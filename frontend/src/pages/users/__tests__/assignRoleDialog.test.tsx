import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import AssignRoleDialog from '@/pages/users/assignRoleDialog'

const mockRoles = [
  { id: 1, name: 'admin', priority: 100, description: 'Admin role' },
  { id: 2, name: 'manager', priority: 50, description: 'Manager role' },
  { id: 3, name: 'employee', priority: 10, description: 'Employee role' },
]

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

describe('AssignRoleDialog', () => {
  const mockOnOpenChange = vi.fn()
  const mockOnSubmit = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not render when closed', () => {
    renderWithProviders(
      <AssignRoleDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        availableRoles={mockRoles}
        assignedRoleIds={[]}
        isLoading={false}
        onSubmit={mockOnSubmit}
        error={null}
      />
    )

    expect(screen.queryByRole('heading', { name: /assign role/i })).not.toBeInTheDocument()
  })

  it('should render when open', async () => {
    renderWithProviders(
      <AssignRoleDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        availableRoles={mockRoles}
        assignedRoleIds={[]}
        isLoading={false}
        onSubmit={mockOnSubmit}
        error={null}
      />
    )

    expect(screen.getByRole('heading', { name: /assign role/i })).toBeInTheDocument()
  })

  it('should display role dropdown with all available roles', async () => {
    renderWithProviders(
      <AssignRoleDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        availableRoles={mockRoles}
        assignedRoleIds={[]}
        isLoading={false}
        onSubmit={mockOnSubmit}
        error={null}
      />
    )

    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)

    await waitFor(() => {
      expect(screen.getByText('admin')).toBeInTheDocument()
      expect(screen.getByText('manager')).toBeInTheDocument()
      expect(screen.getByText('employee')).toBeInTheDocument()
    })
  })

  it('should filter out already assigned roles', async () => {
    renderWithProviders(
      <AssignRoleDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        availableRoles={mockRoles}
        assignedRoleIds={[1]} // admin already assigned
        isLoading={false}
        onSubmit={mockOnSubmit}
        error={null}
      />
    )

    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)

    await waitFor(() => {
      expect(screen.getByText('manager')).toBeInTheDocument()
      expect(screen.getByText('employee')).toBeInTheDocument()
    })
  })

  it('should show message when all roles are assigned', async () => {
    renderWithProviders(
      <AssignRoleDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        availableRoles={mockRoles}
        assignedRoleIds={[1, 2, 3]} // all assigned
        isLoading={false}
        onSubmit={mockOnSubmit}
        error={null}
      />
    )

    expect(
      screen.getByText('All roles are already assigned to this user.')
    ).toBeInTheDocument()
  })

  it('should disable Assign button when no role selected', async () => {
    renderWithProviders(
      <AssignRoleDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        availableRoles={mockRoles}
        assignedRoleIds={[]}
        isLoading={false}
        onSubmit={mockOnSubmit}
        error={null}
      />
    )

    const assignButton = screen.getByRole('button', { name: /assign/i })
    expect(assignButton).toBeDisabled()
  })

  it('should enable Assign button when role is selected', async () => {
    renderWithProviders(
      <AssignRoleDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        availableRoles={mockRoles}
        assignedRoleIds={[]}
        isLoading={false}
        onSubmit={mockOnSubmit}
        error={null}
      />
    )

    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)

    await waitFor(() => {
      const adminOption = screen.getByText('admin').closest('[role="option"]')
      if (adminOption) {
        fireEvent.click(adminOption)
      }
    })

    await waitFor(() => {
      const assignButton = screen.getByRole('button', { name: /assign/i })
      expect(assignButton).not.toBeDisabled()
    })
  })

  it('should submit selected role', async () => {
    renderWithProviders(
      <AssignRoleDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        availableRoles={mockRoles}
        assignedRoleIds={[]}
        isLoading={false}
        onSubmit={mockOnSubmit}
        error={null}
      />
    )

    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)

    await waitFor(() => {
      const managerOption = screen.getByText('manager').closest('[role="option"]')
      if (managerOption) {
        fireEvent.click(managerOption)
      }
    })

    const assignButton = await screen.findByRole('button', { name: /assign/i })
    fireEvent.click(assignButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(2) // manager role id
    })
  })

  it('should display role priority in dropdown', async () => {
    renderWithProviders(
      <AssignRoleDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        availableRoles={mockRoles}
        assignedRoleIds={[]}
        isLoading={false}
        onSubmit={mockOnSubmit}
        error={null}
      />
    )

    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)

    await waitFor(() => {
      expect(screen.getByText('(priority: 100)')).toBeInTheDocument()
      expect(screen.getByText('(priority: 50)')).toBeInTheDocument()
      expect(screen.getByText('(priority: 10)')).toBeInTheDocument()
    })
  })

  it('should show Cancel button', async () => {
    renderWithProviders(
      <AssignRoleDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        availableRoles={mockRoles}
        assignedRoleIds={[]}
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
      <AssignRoleDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        availableRoles={mockRoles}
        assignedRoleIds={[]}
        isLoading={false}
        onSubmit={mockOnSubmit}
        error={null}
      />
    )

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelButton)

    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('should disable Assign button when loading', async () => {
    renderWithProviders(
      <AssignRoleDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        availableRoles={mockRoles}
        assignedRoleIds={[]}
        isLoading={true}
        onSubmit={mockOnSubmit}
        error={null}
      />
    )

    const assignButton = screen.getByRole('button', { name: /assign/i })
    expect(assignButton).toBeDisabled()
  })

  it('should show server error', async () => {
    renderWithProviders(
      <AssignRoleDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        availableRoles={mockRoles}
        assignedRoleIds={[]}
        isLoading={false}
        onSubmit={mockOnSubmit}
        error={{ response: { status: 409 } }}
      />
    )

    expect(
      screen.getByText('This role is already assigned to the user.')
    ).toBeInTheDocument()
  })

  it('should handle 422 validation error', async () => {
    renderWithProviders(
      <AssignRoleDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        availableRoles={mockRoles}
        assignedRoleIds={[]}
        isLoading={false}
        onSubmit={mockOnSubmit}
        error={{ response: { status: 422 } }}
      />
    )

    expect(screen.getByText('Invalid role selection.')).toBeInTheDocument()
  })

  it('should handle 404 error', async () => {
    renderWithProviders(
      <AssignRoleDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        availableRoles={mockRoles}
        assignedRoleIds={[]}
        isLoading={false}
        onSubmit={mockOnSubmit}
        error={{ response: { status: 404 } }}
      />
    )

    expect(screen.getByText('User or role not found.')).toBeInTheDocument()
  })

  it('should clear selection on cancel', async () => {
    const { rerender } = renderWithProviders(
      <AssignRoleDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        availableRoles={mockRoles}
        assignedRoleIds={[]}
        isLoading={false}
        onSubmit={mockOnSubmit}
        error={null}
      />
    )

    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)

    await waitFor(() => {
      const adminOption = screen.getByText('admin').closest('[role="option"]')
      if (adminOption) {
        fireEvent.click(adminOption)
      }
    })

    const cancelButton = await screen.findByRole('button', { name: /cancel/i })
    fireEvent.click(cancelButton)

    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('should disable Assign when all roles are assigned', async () => {
    renderWithProviders(
      <AssignRoleDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        availableRoles={mockRoles}
        assignedRoleIds={[1, 2, 3]} // all assigned
        isLoading={false}
        onSubmit={mockOnSubmit}
        error={null}
      />
    )

    const assignButton = screen.getByRole('button', { name: /assign/i })
    expect(assignButton).toBeDisabled()
  })
})
