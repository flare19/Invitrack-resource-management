import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CreateItemModal } from '@/pages/inventory/CreateItemModal'
import * as inventoryApi from '@/api/inventory'

vi.mock('@/api/inventory', () => ({
  createItem: vi.fn(),
  getCategories: vi.fn(),
}))

const mockCategories = [
  { id: 'cat-1', name: 'Electronics', parent_id: null, created_at: '2024-01-01T00:00:00Z' },
]

function renderCreateItemModal(
  open = true,
  onOpenChange = vi.fn()
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <CreateItemModal open={open} onOpenChange={onOpenChange} />
    </QueryClientProvider>
  )
}

describe('CreateItemModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(inventoryApi.getCategories).mockResolvedValue(mockCategories)
  })

  it('renders modal when open is true', () => {
    renderCreateItemModal(true)
    expect(screen.getByText('Add Inventory Item')).toBeInTheDocument()
  })

  it('does not render modal when open is false', () => {
    renderCreateItemModal(false)
    expect(screen.queryByText('Add Inventory Item')).not.toBeInTheDocument()
  })

  it('renders required form fields', async () => {
    renderCreateItemModal(true)
    await waitFor(() => {
      expect(screen.getByLabelText('SKU')).toBeInTheDocument()
      expect(screen.getByLabelText('Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Unit')).toBeInTheDocument()
    })
  })

  it('renders optional form fields', async () => {
    renderCreateItemModal(true)
    await waitFor(() => {
      expect(screen.getByLabelText('Description')).toBeInTheDocument()
      expect(screen.getByLabelText('Category')).toBeInTheDocument()
      expect(screen.getByLabelText('Reorder Threshold')).toBeInTheDocument()
      expect(screen.getByLabelText('Bookable')).toBeInTheDocument()
    })
  })

  it('renders Create Item button', async () => {
    renderCreateItemModal(true)
    await waitFor(() => {
      expect(screen.getByText('Create Item')).toBeInTheDocument()
    })
  })

  it('populates category dropdown from API', async () => {
    renderCreateItemModal(true)
    await waitFor(() => {
      expect(screen.getByText('Electronics')).toBeInTheDocument()
    })
  })

  it('renders Cancel button', async () => {
    renderCreateItemModal(true)
    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })
  })
})
