"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"

const VALID_TRANSITIONS: Record<string, string[]> = {
  AVAILABLE: ["RESERVED", "CANCELLED"],
  RESERVED: ["BOOKED", "AVAILABLE", "CANCELLED"],
  BOOKED: ["SOLD", "CANCELLED"],
  CANCELLED: ["AVAILABLE"],
  SOLD: [],
}

export function StatusChangeDialog({
  unitId,
  unitNo,
  currentStatus,
  open,
  onOpenChange,
  onSuccess,
}: {
  unitId: string
  unitNo: string
  currentStatus: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [newStatus, setNewStatus] = useState("")
  const [reason, setReason] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const allowedStatuses = VALID_TRANSITIONS[currentStatus] || []

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setNewStatus(""); setReason(""); setError("") } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Change Status — {unitNo}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Current Status</Label>
            <div className="mt-1"><Badge variant={currentStatus.toLowerCase() as any}>{currentStatus}</Badge></div>
          </div>
          {allowedStatuses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transitions available from {currentStatus}.</p>
          ) : (
            <>
              <div>
                <Label>New Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    {allowedStatuses.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reason *</Label>
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for status change" rows={3} />
              </div>
            </>
          )}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {allowedStatuses.length > 0 && (
            <Button
              disabled={saving || !newStatus || !reason.trim()}
              onClick={async () => {
                setSaving(true)
                setError("")
                try {
                  const res = await fetch(`/api/units/${unitId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: newStatus, reason }),
                  })
                  if (!res.ok) {
                    const data = await res.json()
                    throw new Error(data.error || "Failed to update status")
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
              Update Status
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
