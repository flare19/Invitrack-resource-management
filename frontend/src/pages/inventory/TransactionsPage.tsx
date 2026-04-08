import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useTransactions, useItems, useLocations } from '@/hooks/useInventory'
import { TransactionFilters } from './TransactionFilters'
import { TransactionRow } from './TransactionRow'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import PageError from '@/components/shared/PageError'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import type { GetTransactionsParams } from '@/api/inventory'

export default function TransactionsPage() {
  const { permissions, user } = useAuth()
  const [filters, setFilters] = useState<GetTransactionsParams>({ page: 1 })
  const [showRecordTransaction, setShowRecordTransaction] = useState(false)

  const canViewAllTransactions =
    permissions.includes('user:admin') || permissions.includes('audit:view')
  const canRecord = permissions.includes('inventory:write')

  // Auto-filter by current user if they don't have permission to view all
  const queryParams: GetTransactionsParams = {
    ...filters,
    ...(canViewAllTransactions || !user?.id ? {} : { performed_by: user.id }),
  }

  const { data: transactionsData, isLoading, error } =
    useTransactions(queryParams)
  const { data: items } = useItems({ per_page: 100 })
  const { data: locations } = useLocations()

  if (isLoading) return <LoadingSpinner />

  if (error) {
    return (
      <PageError
        message="Failed to load transactions"
        onRetry={() => window.location.reload()}
      />
    )
  }

  const transactions = transactionsData?.data ?? []
  const currentPage = transactionsData?.meta.page ?? 1
  const perPage = transactionsData?.meta.per_page ?? 20
  const total = transactionsData?.meta.total ?? 0
  const totalPages = Math.ceil(total / perPage)

  function handleFilterChange(newFilters: GetTransactionsParams) {
    setFilters({ ...newFilters, page: 1 })
  }

  function goToPage(page: number) {
    setFilters((prev) => ({ ...prev, page }))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Transactions</h1>
        <p className="text-muted-foreground mt-1">
          {canViewAllTransactions
            ? 'View all inventory transactions'
            : 'View your inventory transactions'}
        </p>
      </div>

      <TransactionFilters
        filters={filters}
        onFiltersChange={handleFilterChange}
        items={items?.data ?? []}
        locations={locations ?? []}
        canViewAll={canViewAllTransactions}
      />

      {transactions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No transactions found.</p>
        </div>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Item</th>
                    <th className="px-4 py-3 text-left font-semibold">Type</th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Location
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">Date</th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Performed By
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <TransactionRow
                      key={transaction.id}
                      transaction={transaction}
                      items={items?.data ?? []}
                      locations={locations ?? []}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages} ({total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="gap-2"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
