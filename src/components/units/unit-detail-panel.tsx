"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Pencil, Clock, User, ArrowRight } from "lucide-react"
import { formatCurrency, formatDateTime, formatPSM, formatPSF } from "@/lib/utils"
import { UnitNotes } from "./unit-notes"
import { PriceHistoryChart } from "./price-history-chart"

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
  project: { id: string; name: string }
  locks: Array<{
    id: string
    status: string
    expiresAt: string
    createdAt: string
    lockedBy: { id: string; name: string }
  }>
  deals: Array<{
    id: string
    stage: string
    createdAt: string
    lead: { name: string } | null
    assignee: { name: string } | null
  }>
  activities: Array<{
    id: string
    type: string
    data: any
    createdAt: string
    actor: { name: string } | null
  }>
}

function getActivityIcon(type: string) {
  switch (type) {
    case "LOCK_CREATED": return "🔒"
    case "LOCK_CANCELLED": return "🔓"
    case "LOCK_EXPIRED": return "⏰"
    case "STATUS_CHANGE": return "🔄"
    case "UPDATED": return "✏️"
    case "CREATED": return "✨"
    case "NOTE": return "📝"
    default: return "📌"
  }
}

function getActivityDescription(activity: UnitDetail["activities"][0]) {
  const data = activity.data as any
  switch (activity.type) {
    case "LOCK_CREATED":
      return "Locked unit"
    case "LOCK_CANCELLED":
      return "Released lock"
    case "STATUS_CHANGE":
      if (data?.action === "ARCHIVED") return "Archived unit"
      return `Status: ${data?.from} → ${data?.to}${data?.reason ? ` (${data.reason})` : ""}`
    case "UPDATED":
      if (data?.action === "LOCK_EXTENDED") return "Extended lock"
      if (data?.changes) {
        const fields = Object.keys(data.changes)
        return `Updated ${fields.join(", ")}`
      }
      return "Updated"
    case "NOTE":
      return "Added a note"
    default:
      return activity.type.replace(/_/g, " ").toLowerCase()
  }
}

export function UnitDetailPanel({
  unitId,
  open,
  onOpenChange,
  onEdit,
}: {
  unitId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (unit: UnitDetail) => void
}) {
  const [unit, setUnit] = useState<UnitDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (unitId && open) {
      setLoading(true)
      fetch(`/api/units/${unitId}`)
        .then((r) => r.json())
        .then(setUnit)
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [unitId, open])

  const activeLock = unit?.locks?.find((l) => l.status === "ACTIVE")

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : unit ? (
          <div className="flex flex-col h-full">
            <SheetHeader>
              <div className="flex items-center gap-2">
                <SheetTitle>Unit {unit.unitNo}</SheetTitle>
                <Badge variant={unit.status.toLowerCase() as any}>{unit.status}</Badge>
              </div>
              <SheetDescription>{unit.project.name} — Tower {unit.tower}, Floor {unit.floor}</SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-6 pt-4">
              <Tabs defaultValue="details">
                <TabsList className="w-full">
                  <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
                  <TabsTrigger value="timeline" className="flex-1">Timeline</TabsTrigger>
                  <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
                  <TabsTrigger value="notes" className="flex-1">Notes</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Type</p>
                      <p className="font-medium">{unit.unitType}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Size</p>
                      <p className="font-medium">{unit.sizeSqm ? `${Number(unit.sizeSqm).toFixed(0)} sqm` : "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Facing</p>
                      <p className="font-medium">{unit.facing || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Base Price</p>
                      <p className="font-medium">{formatCurrency(Number(unit.basePrice))}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Current Price</p>
                      <p className="font-medium">{formatCurrency(Number(unit.currentPrice))}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">PSM</p>
                      <p className="font-medium">{formatPSM(Number(unit.currentPrice), Number(unit.sizeSqm))}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">PSF</p>
                      <p className="font-medium">{formatPSF(Number(unit.currentPrice), Number(unit.sizeSqm))}</p>
                    </div>
                  </div>

                  {activeLock && (
                    <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-3 text-sm">
                      <div className="flex items-center gap-2 font-medium text-yellow-800">
                        <Clock className="w-4 h-4" />
                        Active Lock
                      </div>
                      <p className="text-yellow-700 mt-1">
                        Locked by {activeLock.lockedBy.name} — Expires {formatDateTime(activeLock.expiresAt)}
                      </p>
                    </div>
                  )}

                  {onEdit && (
                    <Button variant="outline" size="sm" onClick={() => onEdit(unit)}>
                      <Pencil className="w-4 h-4 mr-2" />Edit Unit
                    </Button>
                  )}
                </TabsContent>

                <TabsContent value="timeline" className="mt-4">
                  {unit.activities.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No activity yet</p>
                  ) : (
                    <div className="space-y-3">
                      {unit.activities.map((a) => (
                        <div key={a.id} className="flex gap-3 text-sm">
                          <span className="text-lg leading-none mt-0.5">{getActivityIcon(a.type)}</span>
                          <div className="flex-1 min-w-0">
                            <p>{getActivityDescription(a)}</p>
                            <p className="text-xs text-muted-foreground">
                              {a.actor?.name || "System"} — {formatDateTime(a.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="history" className="mt-4 space-y-6">
                  <div>
                    <h4 className="text-sm font-medium mb-3">Price History</h4>
                    <PriceHistoryChart unitId={unit.id} />
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-3">Lock History</h4>
                    {unit.locks.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No locks</p>
                    ) : (
                      <div className="space-y-2">
                        {unit.locks.map((lock) => (
                          <div key={lock.id} className="flex items-center gap-2 text-sm border border-border rounded-lg p-2">
                            <User className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{lock.lockedBy.name}</span>
                            <Badge variant={lock.status === "ACTIVE" ? "reserved" : "secondary"} className="text-xs">
                              {lock.status}
                            </Badge>
                            <span className="ml-auto text-xs text-muted-foreground">{formatDateTime(lock.createdAt)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-3">Deal History</h4>
                    {unit.deals.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No deals</p>
                    ) : (
                      <div className="space-y-2">
                        {unit.deals.map((deal) => (
                          <div key={deal.id} className="flex items-center gap-2 text-sm border border-border rounded-lg p-2">
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{deal.lead?.name || "—"}</span>
                            <Badge variant="secondary" className="text-xs">{deal.stage}</Badge>
                            <span className="ml-auto text-xs text-muted-foreground">{formatDateTime(deal.createdAt)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="notes" className="mt-4">
                  <UnitNotes unitId={unit.id} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">Unit not found</div>
        )}
      </SheetContent>
    </Sheet>
  )
}
