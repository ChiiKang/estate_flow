"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"

const LEAD_STAGES = [
  "NEW", "CONTACTED", "QUALIFIED", "SITE_VISIT", "UNIT_SELECTED",
  "RESERVED", "BOOKED", "SPA_SIGNED", "LOAN_SUBMITTED", "LOAN_APPROVED", "SOLD",
]

export function BulkStageDialog({
  selectedIds,
  open,
  onOpenChange,
  onSuccess,
}: {
  selectedIds: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [stage, setStage] = useState("")

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) { setStage(""); setError("") }
        onOpenChange(v)
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Change Stage for {selectedIds.length} Lead(s)</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label>New Stage</Label>
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
            <SelectContent>
              {LEAD_STAGES.map((s) => (
                <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={saving || !stage}
            onClick={async () => {
              setSaving(true)
              setError("")
              try {
                const res = await fetch("/api/leads/bulk", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ids: selectedIds, stage }),
                })
                if (!res.ok) {
                  const data = await res.json()
                  throw new Error(data.error || "Failed to update stage")
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
            Update Stage
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
