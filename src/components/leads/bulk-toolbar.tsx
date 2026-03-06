"use client"

import { Button } from "@/components/ui/button"
import { UserPlus, ArrowRightLeft, Trash2, X } from "lucide-react"

export function LeadBulkToolbar({
  count,
  onClear,
  onAssign,
  onStageChange,
  onDelete,
}: {
  count: number
  onClear: () => void
  onAssign: () => void
  onStageChange: () => void
  onDelete: () => void
}) {
  if (count === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card border border-border rounded-xl shadow-lg px-4 py-3 flex items-center gap-3">
      <span className="text-sm font-medium">{count} selected</span>
      <div className="h-4 w-px bg-border" />
      <Button variant="outline" size="sm" onClick={onAssign}>
        <UserPlus className="w-4 h-4 mr-1" />Assign
      </Button>
      <Button variant="outline" size="sm" onClick={onStageChange}>
        <ArrowRightLeft className="w-4 h-4 mr-1" />Stage
      </Button>
      <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">
        <Trash2 className="w-4 h-4 mr-1" />Delete
      </Button>
      <Button variant="ghost" size="sm" onClick={onClear}>
        <X className="w-4 h-4" />
      </Button>
    </div>
  )
}
