import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import InventoryListPage from '@/pages/inventory/InventoryListPage'
import * as AuthContextModule from '@/context/AuthContext'
import * as inventoryApi from '@/api/inventory'

vi.mock('@/api/inventory', () => ({
  getItems: vi.fn(),
  getCategories: vi.fn(),
}))

vi.mock('@/context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof AuthContextModule>()
  return { ...actual, useAuth: vi.fn() }
})

const mockUseAuth = vi.mocked(AuthContextModule.useAuth)

const mockItems = [
  {
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

function renderInventoryListPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/inventory']}>
        <Routes>
          <Route path="/inventory" element={<InventoryListPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('InventoryListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue(makeAuthState())
    vi.mocked(inventoryApi.getItems).mockResolvedValue({
      data: mockItems,
      meta: { page: 1, per_page: 20, total: 50 }, // Total > per_page to show pagination
    })
    vi.mocked(inventoryApi.getCategories).mockResolvedValue([])
  })

  it('renders the inventory list page header', async () => {
    renderInventoryListPage()
    await waitFor(() => {
      expect(screen.getByText('Inventory')).toBeInTheDocument()
    })
  })

  it('shows Add Item button when user has inventory:write permission', async () => {
    renderInventoryListPage()
    await waitFor(() => {
      expect(screen.getByText('Add Item')).toBeInTheDocument()
    })
  })

  it('hides Add Item button when user lacks inventory:write permission', async () => {
    mockUseAuth.mockReturnValue(makeAuthState({ permissions: [] }))
    renderInventoryListPage()
    await waitFor(() => {
      expect(screen.queryByText('Add Item')).not.toBeInTheDocument()
    })
  })

  it('renders list of items', async () => {
    renderInventoryListPage()
    await waitFor(() => {
      expect(screen.getByText('Projector')).toBeInTheDocument()
      // SKU text is split across elements
      expect(screen.getByText((content) => content.includes('SKU-001'))).toBeInTheDocument()
    })
  })

  it('shows empty state when no items exist', async () => {
    vi.mocked(inventoryApi.getItems).mockResolvedValue({
      data: [],
      meta: { page: 1, per_page: 20, total: 0 },
    })
    renderInventoryListPage()
    await waitFor(() => {
      expect(screen.getByText('No items found.')).toBeInTheDocument()
    })
  })

  it('calls getItems with correct initial params', async () => {
    renderInventoryListPage()
    await waitFor(() => {
      expect(inventoryApi.getItems).toHaveBeenCalledWith({
        page: 1,
        per_page: 20,
      })
    })
  })

  it('shows pagination controls', async () => {
    vi.mocked(inventoryApi.getItems).mockResolvedValue({
      data: mockItems,
      meta: { page: 1, per_page: 1, total: 10 },
    })
    renderInventoryListPage()
    await waitFor(() => {
      expect(screen.getByText(/Showing/i)).toBeInTheDocument()
      expect(screen.getByText('Next')).toBeInTheDocument()
    })
  })

  it('disables Previous button on first page', async () => {
    renderInventoryListPage()
    await waitFor(() => {
      const prevButton = screen.getByText('Previous')
      expect(prevButton).toBeDisabled()
    })
  })
})
