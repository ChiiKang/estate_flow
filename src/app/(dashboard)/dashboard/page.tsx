"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Building2,
  Users,
  Handshake,
  TrendingUp,
  Clock,
  AlertTriangle,
  Loader2,
} from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"

type SummaryData = {
  units: { status: string; _count: { id: number } }[]
  leads: { stage: string; _count: { id: number } }[]
  deals: { stage: string; _count: { id: number } }[]
  recentDeals: any[]
  expiringLocks: any[]
}

function getDealBadgeVariant(stage: string) {
  switch (stage) {
    case "RESERVED": return "reserved"
    case "BOOKED": return "booked"
    case "SPA_SIGNED": return "accent"
    case "LOAN_APPROVED": return "sold"
    default: return "secondary"
  }
}

function getUnitCount(units: SummaryData["units"], status: string) {
  return units.find((u) => u.status === status)?._count?.id || 0
}

function getLeadCount(leads: SummaryData["leads"], stage: string) {
  return leads.find((l) => l.stage === stage)?._count?.id || 0
}

function timeUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now()
  if (diff < 0) return "Expired"
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins} min`
  const hrs = Math.floor(mins / 60)
  const remainMins = mins % 60
  return `${hrs}h ${remainMins}m`
}

export default function DashboardPage() {
  const [data, setData] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/dashboards/summary")
      .then((res) => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <>
        <Header title="Dashboard" subtitle="Overview of your property sales" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </>
    )
  }

  if (!data) return null

  const totalUnits = data.units.reduce((sum, u) => sum + u._count.id, 0)
  const totalLeads = data.leads.reduce((sum, l) => sum + l._count.id, 0)
  const totalDeals = data.deals.reduce((sum, d) => sum + d._count.id, 0)
  const available = getUnitCount(data.units, "AVAILABLE")
  const reserved = getUnitCount(data.units, "RESERVED")
  const booked = getUnitCount(data.units, "BOOKED")
  const sold = getUnitCount(data.units, "SOLD")

  const stats = [
    { label: "Total Units", value: totalUnits.toLocaleString(), icon: Building2, color: "text-sage-600" },
    { label: "Active Leads", value: totalLeads.toLocaleString(), icon: Users, color: "text-tan-600" },
    { label: "Active Deals", value: totalDeals.toLocaleString(), icon: Handshake, color: "text-sage-500" },
    { label: "Units Sold", value: sold.toLocaleString(), icon: TrendingUp, color: "text-tan-500" },
  ]

  const unitSummary = [
    { status: "Available", count: available, percentage: totalUnits ? Math.round((available / totalUnits) * 100) : 0, variant: "available" as const },
    { status: "Reserved", count: reserved, percentage: totalUnits ? Math.round((reserved / totalUnits) * 100) : 0, variant: "reserved" as const },
    { status: "Booked", count: booked, percentage: totalUnits ? Math.round((booked / totalUnits) * 100) : 0, variant: "booked" as const },
    { status: "Sold", count: sold, percentage: totalUnits ? Math.round((sold / totalUnits) * 100) : 0, variant: "sold" as const },
  ]

  const leadStages = ["NEW", "CONTACTED", "QUALIFIED", "SITE_VISIT", "UNIT_SELECTED", "RESERVED", "BOOKED", "SOLD"]
  const leadStageLabels: Record<string, string> = {
    NEW: "New", CONTACTED: "Contacted", QUALIFIED: "Qualified", SITE_VISIT: "Site Visit",
    UNIT_SELECTED: "Unit Selected", RESERVED: "Reserved", BOOKED: "Booked", SOLD: "Sold",
  }
  const maxLeadCount = Math.max(...leadStages.map((s) => getLeadCount(data.leads, s)), 1)

  return (
    <>
      <Header title="Dashboard" subtitle="Overview of your property sales" />
      <div className="p-4 sm:p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-2 sm:p-3 rounded-xl bg-secondary ${stat.color}`}>
                    <stat.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Inventory Summary */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-sage-600" />
                Inventory Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {unitSummary.map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant={item.variant}>{item.status}</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full bg-sage-500"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{item.count}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Deals */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Handshake className="w-5 h-5 text-tan-600" />
                Recent Deals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentDeals.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No deals yet</p>
              ) : (
                <div className="space-y-3">
                  {data.recentDeals.map((deal: any) => (
                    <div key={deal.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-border last:border-0 gap-2 sm:gap-4">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-sm font-medium">{deal.buyer?.name || deal.lead?.name || "—"}</p>
                          <p className="text-xs text-muted-foreground">Unit {deal.unit?.unitNo || "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={getDealBadgeVariant(deal.stage) as any}>
                          {deal.stage.replace("_", " ")}
                        </Badge>
                        <div className="text-right">
                          <p className="text-sm font-semibold">
                            {deal.pricing?.netPrice ? formatCurrency(deal.pricing.netPrice) : "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatDate(deal.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expiring Locks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                Expiring Locks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.expiringLocks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No expiring locks</p>
              ) : (
                <div className="space-y-3">
                  {data.expiringLocks.map((lock: any) => (
                    <div key={lock.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-medium">Unit {lock.unit?.unitNo}</p>
                        <p className="text-xs text-muted-foreground">{lock.lockedBy?.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm font-medium text-yellow-600">{timeUntil(lock.expiresAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lead Funnel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-sage-600" />
                Sales Funnel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leadStages.map((stage) => {
                  const count = getLeadCount(data.leads, stage)
                  const width = maxLeadCount > 0 ? Math.max((count / maxLeadCount) * 100, count > 0 ? 8 : 0) : 0
                  return (
                    <div key={stage} className="flex items-center gap-3">
                      <span className="text-sm w-20 sm:w-24 text-muted-foreground">{leadStageLabels[stage]}</span>
                      <div className="flex-1 h-7 rounded-md bg-secondary overflow-hidden">
                        {count > 0 && (
                          <div
                            className="h-full rounded-md bg-gradient-to-r from-sage-500 to-sage-400 flex items-center px-2"
                            style={{ width: `${width}%` }}
                          >
                            <span className="text-xs font-medium text-white">{count}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
