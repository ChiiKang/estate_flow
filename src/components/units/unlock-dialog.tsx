"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export function UnlockDialog({
  unitId,
  unitNo,
  open,
  onOpenChange,
  onSuccess,
}: {
  unitId: string
  unitNo: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Unlock Unit {unitNo}</DialogTitle>
          <DialogDescription>
            This will release the lock and set the unit back to Available. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={saving}
            onClick={async () => {
              setSaving(true)
              setError("")
              try {
                const res = await fetch(`/api/units/${unitId}/lock`, { method: "DELETE" })
                if (!res.ok) {
                  const data = await res.json()
                  throw new Error(data.error || "Failed to unlock")
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
            Unlock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
