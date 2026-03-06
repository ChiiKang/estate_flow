"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Building2, Users, TrendingUp, Loader2 } from "lucide-react"

type SummaryData = {
  units: { status: string; _count: { id: number } }[]
  leads: { stage: string; _count: { id: number } }[]
  deals: { stage: string; _count: { id: number } }[]
}

type Project = {
  id: string
  name: string
  _count: { units: number; leads: number; deals: number }
}

function getCount(arr: { status?: string; stage?: string; _count: { id: number } }[], key: string) {
  return arr.find((a) => (a.status || a.stage) === key)?._count?.id || 0
}

export default function ReportsPage() {
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboards/summary").then((r) => r.json()),
      fetch("/api/projects").then((r) => r.json()),
    ])
      .then(([sum, proj]) => {
        setSummary(sum)
        setProjects(proj)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <>
        <Header title="Reports" subtitle="Analytics and performance metrics" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </>
    )
  }

  if (!summary) return null

  const totalUnits = summary.units.reduce((s, u) => s + u._count.id, 0)
  const totalLeads = summary.leads.reduce((s, l) => s + l._count.id, 0)
  const totalDeals = summary.deals.reduce((s, d) => s + d._count.id, 0)
  const unitsSold = getCount(summary.units, "SOLD")

  const leadStages = [
    "NEW", "CONTACTED", "QUALIFIED", "SITE_VISIT", "UNIT_SELECTED",
    "RESERVED", "BOOKED", "SPA_SIGNED", "LOAN_SUBMITTED", "LOAN_APPROVED", "SOLD",
  ]
  const leadStageLabels: Record<string, string> = {
    NEW: "New Leads", CONTACTED: "Contacted", QUALIFIED: "Qualified", SITE_VISIT: "Site Visit",
    UNIT_SELECTED: "Unit Selected", RESERVED: "Reserved", BOOKED: "Booked",
    SPA_SIGNED: "SPA Signed", LOAN_SUBMITTED: "Loan Submitted", LOAN_APPROVED: "Loan Approved", SOLD: "Sold",
  }
  const maxLeadCount = Math.max(...leadStages.map((s) => getCount(summary.leads, s)), 1)

  return (
    <>
      <Header title="Reports" subtitle="Analytics and performance metrics" />
      <div className="p-4 sm:p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Units", value: totalUnits.toLocaleString(), icon: Building2, color: "text-sage-600 bg-sage-100" },
            { label: "Units Sold", value: unitsSold.toLocaleString(), icon: Building2, color: "text-tan-600 bg-tan-100" },
            { label: "Active Leads", value: totalLeads.toLocaleString(), icon: Users, color: "text-blue-600 bg-blue-100" },
            { label: "Active Deals", value: totalDeals.toLocaleString(), icon: TrendingUp, color: "text-yellow-600 bg-yellow-100" },
          ].map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${kpi.color}`}><kpi.icon className="w-5 h-5" /></div>
                <div>
                  <p className="text-base sm:text-lg font-bold">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="inventory">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="w-max sm:w-auto">
              <TabsTrigger value="inventory">Inventory Report</TabsTrigger>
              <TabsTrigger value="funnel">Sales Funnel</TabsTrigger>
            </TabsList>
          </div>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-4">
            <Card className="overflow-x-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-sage-600" />
                  Inventory by Project
                </CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/50">
                    <TableHead>Project</TableHead>
                    <TableHead className="text-center">Units</TableHead>
                    <TableHead className="text-center">Leads</TableHead>
                    <TableHead className="text-center">Deals</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="text-center">{row._count.units}</TableCell>
                      <TableCell className="text-center">{row._count.leads}</TableCell>
                      <TableCell className="text-center">{row._count.deals}</TableCell>
                    </TableRow>
                  ))}
                  {projects.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No projects</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Funnel Tab */}
          <TabsContent value="funnel" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-sage-600" />
                  Sales Conversion Funnel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-w-2xl">
                  {leadStages.map((stage) => {
                    const count = getCount(summary.leads, stage)
                    const pct = maxLeadCount > 0 ? Math.round((count / maxLeadCount) * 100) : 0
                    return (
                      <div key={stage} className="flex items-center gap-2 sm:gap-4">
                        <span className="text-xs sm:text-sm w-20 sm:w-28 text-right text-muted-foreground">{leadStageLabels[stage]}</span>
                        <div className="flex-1 h-7 sm:h-8 rounded-lg bg-secondary overflow-hidden">
                          {count > 0 && (
                            <div
                              className="h-full rounded-lg bg-gradient-to-r from-sage-600 to-sage-400 flex items-center justify-end px-2 sm:px-3 transition-all"
                              style={{ width: `${Math.max(pct, 8)}%` }}
                            >
                              <span className="text-xs font-semibold text-white">{count}</span>
                            </div>
                          )}
                        </div>
                        <span className="text-xs sm:text-sm font-medium w-10 sm:w-12 text-muted-foreground">{pct}%</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
