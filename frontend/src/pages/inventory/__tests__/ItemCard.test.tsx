import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ItemCard } from '@/pages/inventory/ItemCard'
import * as AuthContextModule from '@/context/AuthContext'
import * as inventoryApi from '@/api/inventory'

vi.mock('@/api/inventory', () => ({
  deleteItem: vi.fn(),
}))

vi.mock('@/context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof AuthContextModule>()
  return { ...actual, useAuth: vi.fn() }
})

const mockUseAuth = vi.mocked(AuthContextModule.useAuth)

const mockItem = {
  id: 'item-1',
  sku: 'SKU-001',
  name: 'Projector',
  description: '4K projector',
  category_id: 'cat-1',
  unit: 'pcs',
  reorder_threshold: 2,
  is_bookable: true,
  is_active: true,
  version: 1,
  image_url: null,
  created_by: 'user-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

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
      display_name: null,
      avatar_url: null,
      department: null,
      roles: [{ id: 1, name: 'employee', priority: 10, description: null }],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    roles: [{ id: 1, name: 'employee', priority: 10, description: null }],
    permissions: ['inventory:write'],
    login: vi.fn(),
    logout: vi.fn(),
    setToken: vi.fn(),
    ...overrides,
  } as any
}

function renderItemCard(item = mockItem) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ItemCard item={item} />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ItemCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue(makeAuthState())
    vi.mocked(inventoryApi.deleteItem).mockResolvedValue(undefined)
    vi.stubGlobal('confirm', vi.fn(() => true))
  })

  it('renders item name and SKU', () => {
    renderItemCard()
    expect(screen.getByText('Projector')).toBeInTheDocument()
    // SKU text is split: "SKU: " and "SKU-001" are in separate nodes
    expect(screen.getByText((content) => content.includes('SKU-001'))).toBeInTheDocument()
  })

  it('renders description when present', () => {
    renderItemCard()
    expect(screen.getByText('4K projector')).toBeInTheDocument()
  })

  it('renders unit and reorder threshold', () => {
    renderItemCard()
    expect(screen.getByText(/Unit: pcs/)).toBeInTheDocument()
    expect(screen.getByText(/Reorder threshold: 2/)).toBeInTheDocument()
  })

  it('displays bookable badge when is_bookable is true', () => {
    renderItemCard()
    expect(screen.getByText('Bookable')).toBeInTheDocument()
  })

  it('hides bookable badge when is_bookable is false', () => {
    const nonBookableItem = { ...mockItem, is_bookable: false }
    renderItemCard(nonBookableItem)
    expect(screen.queryByText('Bookable')).not.toBeInTheDocument()
  })

  it('shows delete button when user is admin', () => {
    mockUseAuth.mockReturnValue(
      makeAuthState({
        roles: [{ id: 1, name: 'admin', priority: 100, description: null }],
      })
    )
    renderItemCard()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('hides delete button when user is not admin', () => {
    renderItemCard()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('links to detail page', () => {
    const { container } = renderItemCard()
    const link = container.querySelector('a')
    expect(link).toHaveAttribute('href', '/inventory/item-1')
  })

  it('prompts for confirmation before deleting', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue(
      makeAuthState({
        roles: [{ id: 1, name: 'admin', priority: 100, description: null }],
      })
    )
    renderItemCard()
    const deleteButton = screen.getByRole('button')
    await user.click(deleteButton)
    expect(confirm).toHaveBeenCalledWith('Delete "Projector"? This cannot be undone.')
  })

  it('deletes item when user confirms', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue(
      makeAuthState({
        roles: [{ id: 1, name: 'admin', priority: 100, description: null }],
      })
    )
    renderItemCard()
    const deleteButton = screen.getByRole('button')
    await user.click(deleteButton)
    await waitFor(() => {
      expect(inventoryApi.deleteItem).toHaveBeenCalledWith('item-1')
    })
  })

  it('does not delete item when user cancels confirmation', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('confirm', vi.fn(() => false))
    mockUseAuth.mockReturnValue(
      makeAuthState({
        roles: [{ id: 1, name: 'admin', priority: 100, description: null }],
      })
    )
    renderItemCard()
    const deleteButton = screen.getByRole('button')
    await user.click(deleteButton)
    expect(inventoryApi.deleteItem).not.toHaveBeenCalled()
  })

  it('does not show reorder threshold when it is 0', () => {
    const itemNoThreshold = { ...mockItem, reorder_threshold: 0 }
    renderItemCard(itemNoThreshold)
    expect(screen.queryByText(/Reorder threshold/)).not.toBeInTheDocument()
  })

  it('does not show description when not present', () => {
    const itemNoDesc = { ...mockItem, description: null } as unknown as typeof mockItem
    renderItemCard(itemNoDesc)
    expect(screen.queryByText('4K projector')).not.toBeInTheDocument()
  })
})
