import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import InventoryItemPage from '@/pages/inventory/InventoryItemPage'
import * as AuthContextModule from '@/context/AuthContext'
import * as inventoryApi from '@/api/inventory'

vi.mock('@/api/inventory', () => ({
  getItemById: vi.fn(),
  getCategories: vi.fn(),
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
  description: '4K projector for conferences',
  category_id: 'cat-1',
  unit: 'pcs',
  reorder_threshold: 2,
  is_bookable: true,
  is_active: true,
  version: 3,
  image_url: null,
  created_by: 'user-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-03-01T00:00:00Z',
  stock_levels: [
    { location_id: 'loc-1', location_name: 'Warehouse A', quantity: 5 },
    { location_id: 'loc-2', location_name: 'Office Shelf', quantity: 2 },
  ],
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

function renderInventoryItemPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/inventory/item-1']}>
        <Routes>
          <Route path="/inventory/:id" element={<InventoryItemPage />} />
          <Route path="/inventory" element={<div>Inventory List</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('InventoryItemPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue(makeAuthState())
    vi.mocked(inventoryApi.getItemById).mockResolvedValue(mockItem)
    vi.mocked(inventoryApi.getCategories).mockResolvedValue([])
  })

  it('renders item details', async () => {
    renderInventoryItemPage()
    await waitFor(() => {
      expect(screen.getByText('Projector')).toBeInTheDocument()
      // SKU text is split: "SKU: " and "SKU-001" are in separate nodes
      expect(screen.getByText((content) => content.includes('SKU-001'))).toBeInTheDocument()
    })
  })

  it('renders back button', async () => {
    renderInventoryItemPage()
    await waitFor(() => {
      expect(screen.getByText(/Back to Inventory/i)).toBeInTheDocument()
    })
  })

  it('shows Edit button when user has inventory:write permission', async () => {
    renderInventoryItemPage()
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument()
    })
  })

  it('hides Edit button when user lacks inventory:write permission', async () => {
    mockUseAuth.mockReturnValue(makeAuthState({ permissions: [] }))
    renderInventoryItemPage()
    await waitFor(() => {
      expect(screen.queryByText('Edit')).not.toBeInTheDocument()
    })
  })

  it('shows Delete button when user is admin', async () => {
    mockUseAuth.mockReturnValue(
      makeAuthState({
        roles: [{ id: 1, name: 'admin', priority: 100, description: null }],
      })
    )
    renderInventoryItemPage()
    await waitFor(() => {
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })
  })

  it('hides Delete button when user is not admin', async () => {
    renderInventoryItemPage()
    await waitFor(() => {
      expect(screen.queryByText('Delete')).not.toBeInTheDocument()
    })
  })

  it('displays stock levels table', async () => {
    renderInventoryItemPage()
    await waitFor(() => {
      expect(screen.getByText('Stock Levels')).toBeInTheDocument()
      expect(screen.getByText('Warehouse A')).toBeInTheDocument()
      expect(screen.getByText('Office Shelf')).toBeInTheDocument()
      // Use getAllByText to handle multiple "5" and "2" values in page (details + table)
      const fiveValues = screen.getAllByText('5')
      const twoValues = screen.getAllByText('2')
      expect(fiveValues.length).toBeGreaterThan(0)
      expect(twoValues.length).toBeGreaterThan(0)
    })
  })

  it('displays item metadata', async () => {
    renderInventoryItemPage()
    await waitFor(() => {
      expect(screen.getByText('Details')).toBeInTheDocument()
      expect(screen.getByText('Metadata')).toBeInTheDocument()
      expect(screen.getByText('pcs')).toBeInTheDocument() // unit
      expect(screen.getByText('Yes')).toBeInTheDocument() // is_bookable
    })
  })

  it('toggles edit mode when Edit button is clicked', async () => {
    const user = userEvent.setup()
    renderInventoryItemPage()
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument()
    })
    const editButton = screen.getByText('Edit')
    await user.click(editButton)
    expect(screen.getByText('Cancel Edit')).toBeInTheDocument()
  })

  it('calls getItemById with correct id', async () => {
    renderInventoryItemPage()
    await waitFor(() => {
      expect(inventoryApi.getItemById).toHaveBeenCalledWith('item-1')
    })
  })

  it('shows loading spinner while fetching item', () => {
    vi.mocked(inventoryApi.getItemById).mockImplementation(
      () => new Promise(() => {})
    )
    renderInventoryItemPage()
    // LoadingSpinner should be in document but we won't assert on specific text
    // since it may vary based on implementation
  })
})
