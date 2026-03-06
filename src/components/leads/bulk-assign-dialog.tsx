"use client"

import { useState, useEffect } from "react"
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

export function BulkAssignDialog({
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
  const [users, setUsers] = useState<{ id: string; name: string }[]>([])
  const [ownerUserId, setOwnerUserId] = useState("")

  useEffect(() => {
    if (open) {
      setOwnerUserId("")
      setError("")
      fetch("/api/users").then((r) => r.json()).then((data) => {
        setUsers(Array.isArray(data) ? data : [])
      }).catch(() => {})
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Assign {selectedIds.length} Lead(s)</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Owner</Label>
          <Select value={ownerUserId} onValueChange={setOwnerUserId}>
            <SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={saving || !ownerUserId}
            onClick={async () => {
              setSaving(true)
              setError("")
              try {
                const res = await fetch("/api/leads/bulk", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ids: selectedIds, ownerUserId }),
                })
                if (!res.ok) {
                  const data = await res.json()
                  throw new Error(data.error || "Failed to assign")
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
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
