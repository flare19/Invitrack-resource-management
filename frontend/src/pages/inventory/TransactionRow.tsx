import { Badge } from '@/components/ui/badge'
import type { Transaction, InventoryItem } from '@/types/inventory'
import type { Location } from '@/types/inventory'

type TransactionRowProps = {
  transaction: Transaction
  items: InventoryItem[]
  locations: Location[]
}

export function TransactionRow({
  transaction,
  items,
  locations,
}: TransactionRowProps) {
  const item = items.find((i) => i.id === transaction.item_id)
  const location = locations.find((l) => l.id === transaction.location_id)

  const typeColors: Record<string, string> = {
    in: 'bg-green-100 text-green-800',
    out: 'bg-red-100 text-red-800',
    adjustment: 'bg-yellow-100 text-yellow-800',
    transfer: 'bg-blue-100 text-blue-800',
  }

  const typeLabel: Record<string, string> = {
    in: 'Stock In',
    out: 'Stock Out',
    adjustment: 'Adjustment',
    transfer: 'Transfer',
  }

  return (
    <tr className="border-b hover:bg-muted/50 transition-colors">
      <td className="px-4 py-3 font-medium">{item?.name || 'Unknown'}</td>
      <td className="px-4 py-3">
        <Badge variant="outline" className={typeColors[transaction.type]}>
          {typeLabel[transaction.type]}
        </Badge>
      </td>
      <td className="px-4 py-3">
        {transaction.quantity_delta > 0 ? '+' : ''}
        {transaction.quantity_delta}
      </td>
      <td className="px-4 py-3">{location?.name || 'Unknown'}</td>
      <td className="px-4 py-3 text-sm">
        {new Date(transaction.performed_at).toLocaleDateString()}
      </td>
      <td className="px-4 py-3 text-sm">{transaction.performed_by}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs truncate">
        {transaction.notes || '-'}
      </td>
    </tr>
  )
}
