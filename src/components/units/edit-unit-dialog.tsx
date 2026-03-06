"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

type Unit = {
  id: string
  tower: string
  floor: string
  unitNo: string
  unitType: string
  sizeSqm: string | null
  facing: string | null
  basePrice: string
  currentPrice: string
}

export function EditUnitDialog({
  unit,
  open,
  onOpenChange,
  onSuccess,
}: {
  unit: Unit | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    unitType: "",
    sizeSqm: "",
    facing: "",
    basePrice: "",
    currentPrice: "",
    tower: "",
    floor: "",
    unitNo: "",
  })

  // Reset form when unit changes
  const resetForm = (u: Unit) => {
    setForm({
      unitType: u.unitType,
      sizeSqm: u.sizeSqm || "",
      facing: u.facing || "",
      basePrice: u.basePrice,
      currentPrice: u.currentPrice,
      tower: u.tower,
      floor: u.floor,
      unitNo: u.unitNo,
    })
    setError("")
  }

  if (!unit) return null

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v && unit) resetForm(unit)
        onOpenChange(v)
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Unit {unit.unitNo}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Tower</Label>
            <Input value={form.tower} onChange={(e) => setForm((f) => ({ ...f, tower: e.target.value }))} />
          </div>
          <div>
            <Label>Floor</Label>
            <Input value={form.floor} onChange={(e) => setForm((f) => ({ ...f, floor: e.target.value }))} />
          </div>
          <div>
            <Label>Unit No</Label>
            <Input value={form.unitNo} onChange={(e) => setForm((f) => ({ ...f, unitNo: e.target.value }))} />
          </div>
          <div>
            <Label>Type</Label>
            <Input value={form.unitType} onChange={(e) => setForm((f) => ({ ...f, unitType: e.target.value }))} />
          </div>
          <div>
            <Label>Size (sqm)</Label>
            <Input type="number" value={form.sizeSqm} onChange={(e) => setForm((f) => ({ ...f, sizeSqm: e.target.value }))} />
          </div>
          <div>
            <Label>Facing</Label>
            <Input value={form.facing} onChange={(e) => setForm((f) => ({ ...f, facing: e.target.value }))} />
          </div>
          <div>
            <Label>Base Price</Label>
            <Input type="number" value={form.basePrice} onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value }))} />
          </div>
          <div>
            <Label>Current Price</Label>
            <Input type="number" value={form.currentPrice} onChange={(e) => setForm((f) => ({ ...f, currentPrice: e.target.value }))} />
          </div>
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
                const res = await fetch(`/api/units/${unit.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(form),
                })
                if (!res.ok) {
                  const data = await res.json()
                  throw new Error(data.error || "Failed to update")
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
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
