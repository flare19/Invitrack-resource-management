import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StockLevelTable } from '@/pages/inventory/StockLevelTable'
import type { StockLevel } from '@/types/inventory'

const mockStockLevels: StockLevel[] = [
  { location_id: 'loc-1', location_name: 'Warehouse A', quantity: 10 },
  { location_id: 'loc-2', location_name: 'Office Shelf', quantity: 5 },
  { location_id: 'loc-3', location_name: 'Storage Room', quantity: 3 },
]

describe('StockLevelTable', () => {
  it('renders table with headers', () => {
    render(<StockLevelTable stockLevels={mockStockLevels} />)
    expect(screen.getByText('Location')).toBeInTheDocument()
    expect(screen.getByText('Quantity')).toBeInTheDocument()
  })

  it('renders all stock level rows', () => {
    render(<StockLevelTable stockLevels={mockStockLevels} />)
    expect(screen.getByText('Warehouse A')).toBeInTheDocument()
    expect(screen.getByText('Office Shelf')).toBeInTheDocument()
    expect(screen.getByText('Storage Room')).toBeInTheDocument()
  })

  it('renders quantities correctly', () => {
    render(<StockLevelTable stockLevels={mockStockLevels} />)
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('calculates and displays total quantity', () => {
    render(<StockLevelTable stockLevels={mockStockLevels} />)
    expect(screen.getByText('18')).toBeInTheDocument() // 10 + 5 + 3
  })

  it('shows empty state when no stock levels', () => {
    render(<StockLevelTable stockLevels={[]} />)
    expect(screen.getByText('No stock levels recorded.')).toBeInTheDocument()
  })

  it('shows empty state when stock levels is null-like', () => {
    render(<StockLevelTable stockLevels={null as any} />)
    expect(screen.getByText('No stock levels recorded.')).toBeInTheDocument()
  })

  it('handles single stock level', () => {
    const singleLevel: StockLevel[] = [
      { location_id: 'loc-1', location_name: 'Warehouse A', quantity: 5 },
    ]
    render(<StockLevelTable stockLevels={singleLevel} />)
    expect(screen.getByText('Warehouse A')).toBeInTheDocument()
    // Use getAllByText since there are multiple '5' values (table cell + total)
    const quantities = screen.getAllByText('5')
    expect(quantities.length).toBeGreaterThan(0)
  })

  it('displays total row with label', () => {
    render(<StockLevelTable stockLevels={mockStockLevels} />)
    expect(screen.getByText('Total:')).toBeInTheDocument()
  })
})
