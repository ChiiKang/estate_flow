"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export function DeleteLeadDialog({
  leadId,
  leadName,
  hasActiveDeals,
  open,
  onOpenChange,
  onDeleted,
}: {
  leadId: string
  leadName: string
  hasActiveDeals: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete {leadName}</DialogTitle>
          <DialogDescription>
            {hasActiveDeals
              ? "This lead has active deals and cannot be deleted. Cancel all deals first."
              : "This will archive the lead. It will no longer appear in your pipeline."}
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {!hasActiveDeals && (
            <Button
              variant="destructive"
              disabled={saving}
              onClick={async () => {
                setSaving(true)
                setError("")
                try {
                  const res = await fetch(`/api/leads/${leadId}`, { method: "DELETE" })
                  if (!res.ok) {
                    const data = await res.json()
                    throw new Error(data.error || "Failed to delete")
                  }
                  onOpenChange(false)
                  if (onDeleted) {
                    onDeleted()
                  } else {
                    router.push("/leads")
                  }
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
