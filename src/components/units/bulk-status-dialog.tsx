"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"

const ALL_STATUSES = ["AVAILABLE", "RESERVED", "BOOKED", "SOLD", "CANCELLED"]

export function BulkStatusDialog({
  unitIds,
  open,
  onOpenChange,
  onSuccess,
}: {
  unitIds: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [status, setStatus] = useState("")
  const [reason, setReason] = useState("")
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ updated: number; errors: any[] } | null>(null)

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setStatus(""); setReason(""); setResult(null) } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Bulk Status Change ({unitIds.length} units)</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>New Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
              <SelectContent>
                {ALL_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Reason</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for change" rows={2} />
          </div>
          {result && (
            <div className="text-sm">
              <p className="text-green-600">{result.updated} updated</p>
              {result.errors.length > 0 && (
                <p className="text-destructive">{result.errors.length} failed</p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={saving || !status}
            onClick={async () => {
              setSaving(true)
              try {
                const res = await fetch("/api/units/bulk", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ unitIds, action: "status", status, reason }),
                })
                const data = await res.json()
                setResult(data)
                if (data.updated > 0) onSuccess()
              } catch {} finally {
                setSaving(false)
              }
            }}
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
