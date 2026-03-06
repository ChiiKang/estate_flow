"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { formatCurrency, formatPSM, formatPSF } from "@/lib/utils"

type UnitDetail = {
  id: string
  tower: string
  floor: string
  unitNo: string
  unitType: string
  sizeSqm: string | null
  facing: string | null
  basePrice: string
  currentPrice: string
  status: string
  project: { name: string }
}

const FIELDS: { key: string; label: string; format?: (v: any, unit: UnitDetail) => string }[] = [
  { key: "tower", label: "Tower" },
  { key: "floor", label: "Floor" },
  { key: "unitType", label: "Type" },
  { key: "sizeSqm", label: "Size (sqm)", format: (v) => v ? `${Number(v).toFixed(0)}` : "—" },
  { key: "facing", label: "Facing", format: (v) => v || "—" },
  { key: "basePrice", label: "Base Price", format: (v) => formatCurrency(Number(v)) },
  { key: "currentPrice", label: "Current Price", format: (v) => formatCurrency(Number(v)) },
  { key: "psm", label: "PSM", format: (_, u) => formatPSM(Number(u.currentPrice), Number(u.sizeSqm)) },
  { key: "psf", label: "PSF", format: (_, u) => formatPSF(Number(u.currentPrice), Number(u.sizeSqm)) },
  { key: "status", label: "Status" },
]

export function UnitComparisonDialog({
  unitIds,
  open,
  onOpenChange,
}: {
  unitIds: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [units, setUnits] = useState<UnitDetail[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || unitIds.length === 0) return
    setLoading(true)
    Promise.all(
      unitIds.map((id) => fetch(`/api/units/${id}`).then((r) => r.json()))
    )
      .then(setUnits)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open, unitIds])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Compare Units</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Field</th>
                  {units.map((u) => (
                    <th key={u.id} className="text-left py-2 px-2 font-medium">{u.unitNo}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FIELDS.map((field) => {
                  const values = units.map((u) => {
                    if (field.format) return field.format((u as any)[field.key], u)
                    return (u as any)[field.key] || "—"
                  })
                  const allSame = values.every((v) => v === values[0])
                  return (
                    <tr key={field.key} className="border-b last:border-0">
                      <td className="py-2 pr-4 text-muted-foreground">{field.label}</td>
                      {values.map((val, i) => (
                        <td key={i} className={`py-2 px-2 ${!allSame ? "font-medium text-primary" : ""}`}>
                          {field.key === "status" ? (
                            <Badge variant={(val as string).toLowerCase() as any}>{val}</Badge>
                          ) : val}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
