"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export function DeleteUnitDialog({
  unitId,
  unitNo,
  status,
  open,
  onOpenChange,
  onSuccess,
}: {
  unitId: string
  unitNo: string
  status: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const canDelete = status === "AVAILABLE"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Unit {unitNo}</DialogTitle>
          <DialogDescription>
            {canDelete
              ? "This will archive the unit. It will no longer appear in listings."
              : `Cannot delete a unit with status "${status}". Only AVAILABLE units can be deleted.`}
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {canDelete && (
            <Button
              variant="destructive"
              disabled={saving}
              onClick={async () => {
                setSaving(true)
                setError("")
                try {
                  const res = await fetch(`/api/units/${unitId}`, { method: "DELETE" })
                  if (!res.ok) {
                    const data = await res.json()
                    throw new Error(data.error || "Failed to delete")
                  }
                  onOpenChange(false)
                  onSuccess()
                } catch (err: any) {
                  setError(err.message)
                } finally {
                  setSaving(false)
                }
              }}
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
