import type { StockLevel } from '@/types/inventory'

type StockLevelTableProps = {
  stockLevels: StockLevel[]
}

export function StockLevelTable({ stockLevels }: StockLevelTableProps) {
  if (!stockLevels || stockLevels.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">No stock levels recorded.</p>
      </div>
    )
  }

  const totalQuantity = stockLevels.reduce((sum, level) => sum + level.quantity, 0)

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Location</th>
              <th className="px-4 py-3 text-right font-semibold">Quantity</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {stockLevels.map((level) => (
              <tr key={level.location_id} className="hover:bg-muted/50">
                <td className="px-4 py-3">{level.location_name}</td>
                <td className="px-4 py-3 text-right font-medium">{level.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end border-t pt-3">
        <div className="text-sm">
          <span className="text-muted-foreground">Total: </span>
          <span className="font-semibold">{totalQuantity}</span>
        </div>
      </div>
    </div>
  )
}
