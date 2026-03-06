"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"

export function BulkPriceDialog({
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
  const [mode, setMode] = useState<"absolute" | "percent">("percent")
  const [value, setValue] = useState("")
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ updated: number; errors: any[] } | null>(null)

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setValue(""); setResult(null) } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Bulk Price Update ({unitIds.length} units)</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">Percentage Change (%)</SelectItem>
                <SelectItem value="absolute">Set Absolute Price</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{mode === "percent" ? "Change (%)" : "New Price"}</Label>
            <Input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={mode === "percent" ? "e.g. 5 for +5%" : "e.g. 500000"}
            />
            {mode === "percent" && <p className="text-xs text-muted-foreground mt-1">Use negative for decrease (e.g. -5)</p>}
          </div>
          {result && (
            <div className="text-sm">
              <p className="text-green-600">{result.updated} updated</p>
              {result.errors.length > 0 && <p className="text-destructive">{result.errors.length} failed</p>}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={saving || !value}
            onClick={async () => {
              setSaving(true)
              try {
                const payload: any = { unitIds, action: "price" }
                if (mode === "absolute") payload.price = Number(value)
                else payload.percentChange = Number(value)

                const res = await fetch("/api/units/bulk", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
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
