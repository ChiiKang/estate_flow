"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"

const DURATION_OPTIONS = [
  { label: "15 minutes", value: "15" },
  { label: "30 minutes", value: "30" },
  { label: "1 hour", value: "60" },
  { label: "2 hours", value: "120" },
]

export function ExtendLockDialog({
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
  const [minutes, setMinutes] = useState("30")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setMinutes("30"); setError("") } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Extend Lock — {unitNo}</DialogTitle>
        </DialogHeader>
        <div>
          <Label>Extend by</Label>
          <Select value={minutes} onValueChange={setMinutes}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DURATION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={saving}
            onClick={async () => {
              setSaving(true)
              setError("")
              try {
                const res = await fetch(`/api/units/${unitId}/lock`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ additionalMinutes: parseInt(minutes) }),
                })
                if (!res.ok) {
                  const data = await res.json()
                  throw new Error(data.error || "Failed to extend lock")
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
            Extend
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
