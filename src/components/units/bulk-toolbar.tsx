"use client"

import { Button } from "@/components/ui/button"
import { ArrowRightLeft, DollarSign, Trash2, X, GitCompare } from "lucide-react"

export function BulkToolbar({
  count,
  onClear,
  onChangeStatus,
  onUpdatePrice,
  onDelete,
  onCompare,
}: {
  count: number
  onClear: () => void
  onChangeStatus: () => void
  onUpdatePrice: () => void
  onDelete: () => void
  onCompare: () => void
}) {
  if (count === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card border border-border rounded-xl shadow-lg px-4 py-3 flex items-center gap-3">
      <span className="text-sm font-medium">{count} selected</span>
      <div className="h-4 w-px bg-border" />
      <Button variant="outline" size="sm" onClick={onChangeStatus}>
        <ArrowRightLeft className="w-4 h-4 mr-1" />Status
      </Button>
      <Button variant="outline" size="sm" onClick={onUpdatePrice}>
        <DollarSign className="w-4 h-4 mr-1" />Price
      </Button>
      {count >= 2 && count <= 3 && (
        <Button variant="outline" size="sm" onClick={onCompare}>
          <GitCompare className="w-4 h-4 mr-1" />Compare
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">
        <Trash2 className="w-4 h-4 mr-1" />Delete
      </Button>
      <Button variant="ghost" size="sm" onClick={onClear}>
        <X className="w-4 h-4" />
      </Button>
    </div>
  )
}
