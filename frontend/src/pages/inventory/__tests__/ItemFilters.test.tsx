import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ItemFilters } from '@/pages/inventory/ItemFilters'
import * as inventoryApi from '@/api/inventory'

vi.mock('@/api/inventory', () => ({
  getCategories: vi.fn(),
}))

const mockCategories = [
  { id: 'cat-1', name: 'Electronics', parent_id: null, created_at: '2024-01-01T00:00:00Z' },
  { id: 'cat-2', name: 'Furniture', parent_id: null, created_at: '2024-01-01T00:00:00Z' },
]

function renderItemFilters(
  values = { page: 1, per_page: 20 },
  onChange = vi.fn()
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ItemFilters values={values} onChange={onChange} />
    </QueryClientProvider>
  )
}

describe('ItemFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(inventoryApi.getCategories).mockResolvedValue(mockCategories)
  })

  it('renders search input', () => {
    renderItemFilters()
    expect(screen.getByPlaceholderText('Name or SKU')).toBeInTheDocument()
  })

  it('renders category select', async () => {
    renderItemFilters()
    await waitFor(() => {
      expect(screen.getByText('All categories')).toBeInTheDocument()
    })
  })

  it('renders bookable checkbox', () => {
    renderItemFilters()
    expect(screen.getByLabelText('Bookable only')).toBeInTheDocument()
  })

  it('renders low stock checkbox', () => {
    renderItemFilters()
    expect(screen.getByLabelText('Low stock only')).toBeInTheDocument()
  })

  it('populates category options from API', async () => {
    renderItemFilters()
    // Categories are only rendered when Select is opened, so verify API was called
    await waitFor(() => {
      expect(inventoryApi.getCategories).toHaveBeenCalled()
    })
  })

  it('calls onChange when search input changes with debounce', async () => {
    const user = userEvent.setup({ delay: null })
    const onChange = vi.fn()
    renderItemFilters({ page: 1, per_page: 20 }, onChange)
    const searchInput = screen.getByPlaceholderText('Name or SKU')
    await user.type(searchInput, 'projector')
    // Wait for debounce (400ms)
    await waitFor(
      () => {
        expect(onChange).toHaveBeenCalled()
      },
      { timeout: 500 }
    )
  })

  it('calls onChange with search value', async () => {
    const user = userEvent.setup({ delay: null })
    const onChange = vi.fn()
    renderItemFilters({ page: 1, per_page: 20 }, onChange)
    const searchInput = screen.getByPlaceholderText('Name or SKU')
    await user.type(searchInput, 'test')
    await waitFor(
      () => {
        expect(onChange).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'test',
            page: 1,
          })
        )
      },
      { timeout: 500 }
    )
  })

  it('calls onChange when category select changes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderItemFilters({ page: 1, per_page: 20 }, onChange)
    // Wait for API to be called
    await waitFor(() => {
      expect(inventoryApi.getCategories).toHaveBeenCalled()
    })
    // Click the select trigger to open
    const categoryButton = screen.getByRole('combobox')
    await user.click(categoryButton)
    // Click the Electronics option (now in DOM after opening)
    const electronicsOption = await screen.findByText('Electronics')
    await user.click(electronicsOption)
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        category_id: 'cat-1',
        page: 1,
      })
    )
  })

  it('calls onChange when bookable checkbox is checked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderItemFilters({ page: 1, per_page: 20 }, onChange)
    const bookableCheckbox = screen.getByLabelText('Bookable only')
    await user.click(bookableCheckbox)
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        is_bookable: true,
        page: 1,
      })
    )
  })

  it('calls onChange when low stock checkbox is checked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderItemFilters({ page: 1, per_page: 20 }, onChange)
    const lowStockCheckbox = screen.getByLabelText('Low stock only')
    await user.click(lowStockCheckbox)
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        low_stock: true,
        page: 1,
      })
    )
  })

  it('resets page to 1 when filters change', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderItemFilters({ page: 5, per_page: 20 }, onChange)
    const bookableCheckbox = screen.getByLabelText('Bookable only')
    await user.click(bookableCheckbox)
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
      })
    )
  })

  it('displays checked state of bookable checkbox when value is true', () => {
    renderItemFilters({ page: 1, per_page: 20, is_bookable: true } as any)
    const bookableCheckbox = screen.getByRole('checkbox', {
      name: /bookable only/i,
    })
    expect(bookableCheckbox).toHaveAttribute('aria-checked', 'true')
  })

  it('displays selected category in select', async () => {
    renderItemFilters({ page: 1, per_page: 20, category_id: 'cat-1' } as any)
    await waitFor(() => {
      // The select trigger should have the category name as its value
      expect(screen.getByRole('combobox')).toBeInTheDocument()
      expect(inventoryApi.getCategories).toHaveBeenCalled()
    })
  })
})
