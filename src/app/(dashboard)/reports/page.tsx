"use client"

import { useEffect, useState, useCallback } from "react"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import {
  Building2,
  TrendingUp,
  Users,
  DollarSign,
  Trophy,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"

// ─── Color Palettes ──────────────────────────────────────────────────────────

const CHART_COLORS = {
  sage600: "#4a6350",
  tan400: "#c9b99a",
  sage400: "#728f77",
  tan500: "#b5a47e",
  sage300: "#96af9a",
}

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "#22c55e",
  RESERVED: "#eab308",
  BOOKED: "#3b82f6",
  SOLD: "#4a6350",
  CANCELLED: "#dc2626",
}

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  BOOKED: "Booked",
  SOLD: "Sold",
  CANCELLED: "Cancelled",
}

const LEAD_STAGE_LABELS: Record<string, string> = {
  NEW: "New Leads",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  SITE_VISIT: "Site Visit",
  UNIT_SELECTED: "Unit Selected",
  RESERVED: "Reserved",
  BOOKED: "Booked",
  SPA_SIGNED: "SPA Signed",
  LOAN_SUBMITTED: "Loan Submitted",
  LOAN_APPROVED: "Loan Approved",
  SOLD: "Sold",
}

// ─── Types ────────────────────────────────────────────────────────────────────

type AnalyticsData = {
  kpis: {
    totalUnits: number
    availableUnits: number
    soldUnits: number
    soldThisMonth: number
    soldLastMonth: number
    totalRevenue: number
    activeLeads: number
    newLeadsThisMonth: number
  }
  unitsByStatus: { status: string; count: number }[]
  salesTrend: { month: string; count: number; revenue: number }[]
  leadFunnel: { stage: string; count: number }[]
  agentLeaderboard: { id: string; name: string; deals: number; revenue: number }[]
  collections: {
    totalExpected: number
    collected: number
    outstanding: number
    overdue: number
  }
  projects: { id: string; name: string }[]
}

type ProjectRow = {
  id: string
  name: string
  _count: { units: number; leads: number; deals: number }
}

// ─── Custom Tooltips ──────────────────────────────────────────────────────────

type TooltipPayloadItem = { value: number; name: string }
type TooltipProps = { active?: boolean; payload?: TooltipPayloadItem[]; label?: string }

function SalesTrendTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-tan-200 rounded-lg shadow-md p-3 text-sm">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <p className="text-sage-600">
        Deals: <span className="font-medium">{payload[0]?.value ?? 0}</span>
      </p>
      {(payload[1]?.value ?? 0) > 0 && (
        <p className="text-tan-600">
          Revenue: <span className="font-medium">{formatCurrency(payload[1]?.value ?? 0)}</span>
        </p>
      )}
    </div>
  )
}

function DonutTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-tan-200 rounded-lg shadow-md p-3 text-sm">
      <p className="font-medium">{STATUS_LABELS[payload[0].name] ?? payload[0].name}</p>
      <p className="text-muted-foreground">{payload[0].value} units</p>
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  subtitle,
  icon: Icon,
  iconClass,
}: {
  label: string
  value: string
  subtitle?: string
  icon: React.ElementType
  iconClass: string
}) {
  return (
    <Card className="border-tan-200">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${iconClass} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold leading-tight truncate">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground/70">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [projectId, setProjectId] = useState("ALL")
  const [period, setPeriod] = useState("ALL")

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (projectId !== "ALL") params.set("projectId", projectId)
      if (period !== "ALL") params.set("period", period)

      const [analyticsRes, projectsRes] = await Promise.all([
        fetch(`/api/dashboards/analytics?${params}`),
        fetch("/api/projects"),
      ])

      if (analyticsRes.status === 401 || projectsRes.status === 401) {
        window.location.href = "/login"
        return
      }
      if (!analyticsRes.ok) throw new Error(`Analytics API error: ${analyticsRes.status}`)
      if (!projectsRes.ok) throw new Error(`Projects API error: ${projectsRes.status}`)

      const [analyticsData, projectsData] = await Promise.all([
        analyticsRes.json(),
        projectsRes.json(),
      ])

      setData(analyticsData)
      setProjects(Array.isArray(projectsData) ? projectsData : [])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load data"
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [projectId, period])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Loading ──────────────────────────────────────────────────────────────

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

  if (error) {
    return (
      <>
        <Header title="Reports" subtitle="Analytics and performance metrics" />
        <div className="p-6 flex items-center gap-2 text-red-500 justify-center">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </>
    )
  }

  if (!data) return null

  const { kpis, unitsByStatus, salesTrend, leadFunnel, agentLeaderboard, collections } = data

  // Derived
  const availablePct = kpis.totalUnits > 0
    ? Math.round((kpis.availableUnits / kpis.totalUnits) * 100)
    : 0

  const collectedPct = collections.totalExpected > 0
    ? Math.round((collections.collected / collections.totalExpected) * 100)
    : 0

  const maxFunnelCount = Math.max(...leadFunnel.map((f) => f.count), 1)

  const donutData = unitsByStatus
    .filter((s) => s.count > 0)
    .map((s) => ({ name: s.status, value: s.count }))

  // Agent conversion rate: deals / (totalLeads per agent not available, use deals/totalDeals)
  const totalAgentDeals = agentLeaderboard.reduce((s, a) => s + a.deals, 0)

  return (
    <>
      <Header title="Reports" subtitle="Analytics and performance metrics" />
      <div className="p-4 sm:p-6 space-y-6">

        {/* ── Filters ────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger className="w-44 bg-white border-tan-200">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Projects</SelectItem>
              {data.projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40 bg-white border-tan-200">
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Time</SelectItem>
              <SelectItem value="MTD">This Month</SelectItem>
              <SelectItem value="QTD">This Quarter</SelectItem>
              <SelectItem value="YTD">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ── KPI Cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            label="Total Units"
            value={kpis.totalUnits.toLocaleString()}
            subtitle={`${availablePct}% available`}
            icon={Building2}
            iconClass="bg-sage-100 text-sage-600"
          />
          <KpiCard
            label="Units Sold"
            value={kpis.soldUnits.toLocaleString()}
            subtitle={`${kpis.soldThisMonth} this month`}
            icon={TrendingUp}
            iconClass="bg-tan-100 text-tan-600"
          />
          <KpiCard
            label="Active Leads"
            value={kpis.activeLeads.toLocaleString()}
            subtitle={`${kpis.newLeadsThisMonth} new this month`}
            icon={Users}
            iconClass="bg-blue-100 text-blue-600"
          />
          <KpiCard
            label="Total Revenue"
            value={kpis.totalRevenue > 0 ? formatCurrency(kpis.totalRevenue) : "—"}
            subtitle="Booked + sold deals"
            icon={DollarSign}
            iconClass="bg-green-100 text-green-600"
          />
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <Tabs defaultValue="overview">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="w-max sm:w-auto bg-secondary border border-tan-200">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="funnel">Sales Funnel</TabsTrigger>
              <TabsTrigger value="agents">Agent Performance</TabsTrigger>
              <TabsTrigger value="collections">Collections</TabsTrigger>
            </TabsList>
          </div>

          {/* ── Tab: Overview ──────────────────────────────────────────────── */}
          <TabsContent value="overview" className="space-y-6 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Sales Trend */}
              <Card className="border-tan-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-sage-600" />
                    Sales Trend — Last 12 Months
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {salesTrend.every((d) => d.count === 0) ? (
                    <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                      No deals data yet
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart
                        data={salesTrend}
                        margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                        barCategoryGap="30%"
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e8e0d4" vertical={false} />
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 10, fill: "#9ca3af" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "#9ca3af" }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip content={<SalesTrendTooltip />} />
                        <Bar
                          dataKey="count"
                          name="Deals"
                          fill={CHART_COLORS.sage600}
                          radius={[3, 3, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Unit Status Donut */}
              <Card className="border-tan-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-sage-600" />
                    Unit Status Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {donutData.length === 0 ? (
                    <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                      No unit data yet
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={donutData}
                          cx="50%"
                          cy="45%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {donutData.map((entry) => (
                            <Cell
                              key={entry.name}
                              fill={STATUS_COLORS[entry.name] ?? "#94a3b8"}
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<DonutTooltip />} />
                        <Legend
                          iconType="circle"
                          iconSize={8}
                          formatter={(value) => (
                            <span className="text-xs text-muted-foreground">
                              {STATUS_LABELS[value] ?? value}
                            </span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Inventory by Project Table */}
            <Card className="border-tan-200 overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-sage-600" />
                  Inventory by Project
                </CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                      <TableHead className="text-xs">Project</TableHead>
                      <TableHead className="text-xs text-center">Total Units</TableHead>
                      <TableHead className="text-xs text-center">Leads</TableHead>
                      <TableHead className="text-xs text-center">Deals</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((row) => (
                      <TableRow key={row.id} className="hover:bg-secondary/20">
                        <TableCell className="font-medium text-sm">{row.name}</TableCell>
                        <TableCell className="text-center text-sm">{row._count.units}</TableCell>
                        <TableCell className="text-center text-sm">{row._count.leads}</TableCell>
                        <TableCell className="text-center text-sm">{row._count.deals}</TableCell>
                      </TableRow>
                    ))}
                    {projects.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                          No projects found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* ── Tab: Sales Funnel ──────────────────────────────────────────── */}
          <TabsContent value="funnel" className="space-y-4 mt-4">
            <Card className="border-tan-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-sage-600" />
                  Lead Conversion Funnel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-w-2xl">
                  {leadFunnel.map((item, idx) => {
                    const totalAtTop = leadFunnel[0].count
                    const convPct =
                      totalAtTop > 0 ? Math.round((item.count / totalAtTop) * 100) : 0
                    const prev = idx > 0 ? leadFunnel[idx - 1].count : null
                    const dropOff =
                      prev !== null && prev > 0
                        ? Math.round(((prev - item.count) / prev) * 100)
                        : null
                    const barWidth =
                      maxFunnelCount > 0 && item.count > 0
                        ? Math.max((item.count / maxFunnelCount) * 100, 5)
                        : 0
                    return (
                      <div key={item.stage} className="flex items-center gap-3">
                        <span className="text-xs w-28 text-right text-muted-foreground shrink-0">
                          {LEAD_STAGE_LABELS[item.stage]}
                        </span>
                        <div className="flex-1 h-8 rounded-lg bg-secondary overflow-hidden relative">
                          {item.count > 0 ? (
                            <div
                              className="h-full rounded-lg flex items-center justify-between px-3 transition-all"
                              style={{
                                width: `${barWidth}%`,
                                background: `linear-gradient(to right, ${CHART_COLORS.sage600}, ${CHART_COLORS.sage400})`,
                              }}
                            >
                              <span className="text-xs font-semibold text-white">{item.count}</span>
                            </div>
                          ) : null}
                        </div>
                        <div className="flex flex-col items-end w-24 shrink-0">
                          <span className="text-xs font-medium text-muted-foreground">
                            {convPct}% overall
                          </span>
                          {dropOff !== null && dropOff > 0 && (
                            <span className="text-xs text-red-400">-{dropOff}% drop</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Funnel summary */}
                {leadFunnel[0]?.count > 0 && (
                  <div className="mt-6 pt-4 border-t border-border">
                    <div className="flex flex-wrap gap-6">
                      <div>
                        <p className="text-xs text-muted-foreground">Total Leads Entered</p>
                        <p className="text-lg font-bold">{leadFunnel[0].count}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Reached Site Visit</p>
                        <p className="text-lg font-bold">
                          {leadFunnel.find((f) => f.stage === "SITE_VISIT")?.count ?? 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Converted to Booked</p>
                        <p className="text-lg font-bold">
                          {leadFunnel.find((f) => f.stage === "BOOKED")?.count ?? 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Final Conversion Rate</p>
                        <p className="text-lg font-bold text-sage-600">
                          {leadFunnel[0].count > 0
                            ? `${Math.round(((leadFunnel.find((f) => f.stage === "SOLD")?.count ?? 0) / leadFunnel[0].count) * 100)}%`
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab: Agent Performance ─────────────────────────────────────── */}
          <TabsContent value="agents" className="space-y-4 mt-4">
            <Card className="border-tan-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-tan-500" />
                  Agent Performance Leaderboard
                </CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                      <TableHead className="text-xs w-10">#</TableHead>
                      <TableHead className="text-xs">Agent</TableHead>
                      <TableHead className="text-xs text-center">Deals Closed</TableHead>
                      <TableHead className="text-xs text-right">Total Value</TableHead>
                      <TableHead className="text-xs text-center">Share</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agentLeaderboard.map((agent, idx) => {
                      const share =
                        totalAgentDeals > 0
                          ? Math.round((agent.deals / totalAgentDeals) * 100)
                          : 0
                      return (
                        <TableRow key={agent.id} className="hover:bg-secondary/20">
                          <TableCell className="text-sm font-medium">
                            {idx === 0 ? (
                              <span className="text-yellow-500 font-bold">1</span>
                            ) : idx === 1 ? (
                              <span className="text-slate-400 font-bold">2</span>
                            ) : idx === 2 ? (
                              <span className="text-amber-600 font-bold">3</span>
                            ) : (
                              <span className="text-muted-foreground">{idx + 1}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm font-medium">{agent.name}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="text-xs">{agent.deals}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold text-sage-700">
                            {agent.revenue > 0 ? formatCurrency(agent.revenue) : "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-sage-500"
                                  style={{ width: `${share}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-8 text-right">
                                {share}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {agentLeaderboard.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                          No agent data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {/* Agent chart */}
            {agentLeaderboard.length > 0 && (
              <Card className="border-tan-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4 text-sage-600" />
                    Deals by Agent
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={agentLeaderboard.slice(0, 8)}
                      layout="vertical"
                      margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8e0d4" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10, fill: "#9ca3af" }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={80}
                        tick={{ fontSize: 10, fill: "#6b7280" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(value: number | undefined) => [value ?? 0, "Deals"]}
                        contentStyle={{
                          fontSize: 12,
                          borderColor: "#c9b99a",
                          borderRadius: 8,
                        }}
                      />
                      <Bar dataKey="deals" fill={CHART_COLORS.sage600} radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Tab: Collections ───────────────────────────────────────────── */}
          <TabsContent value="collections" className="space-y-4 mt-4">

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                {
                  label: "Total Expected",
                  value: collections.totalExpected > 0 ? formatCurrency(collections.totalExpected) : "—",
                  cls: "bg-secondary text-foreground",
                },
                {
                  label: "Collected",
                  value: collections.collected > 0 ? formatCurrency(collections.collected) : "—",
                  cls: "bg-green-50 text-green-700",
                },
                {
                  label: "Outstanding",
                  value: collections.outstanding > 0 ? formatCurrency(collections.outstanding) : "—",
                  cls: "bg-yellow-50 text-yellow-700",
                },
                {
                  label: "Overdue (>30 days)",
                  value: collections.overdue > 0 ? formatCurrency(collections.overdue) : "None",
                  cls: collections.overdue > 0 ? "bg-red-50 text-red-700" : "bg-secondary text-muted-foreground",
                },
              ].map((c) => (
                <Card key={c.label} className={`border-tan-200 ${c.cls}`}>
                  <CardContent className="p-4 text-center">
                    <p className="text-lg font-bold">{c.value}</p>
                    <p className="text-xs opacity-80 mt-0.5">{c.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Collection progress */}
            <Card className="border-tan-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-sage-600" />
                  Collection Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                {collections.totalExpected > 0 ? (
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Payment collection rate</span>
                      <span className="font-semibold">{collectedPct}%</span>
                    </div>
                    <div className="h-4 rounded-full bg-secondary overflow-hidden flex">
                      {collections.collected > 0 && (
                        <div
                          className="h-full bg-green-500 transition-all"
                          style={{ width: `${(collections.collected / collections.totalExpected) * 100}%` }}
                          title={`Collected: ${formatCurrency(collections.collected)}`}
                        />
                      )}
                      {collections.outstanding - collections.overdue > 0 && (
                        <div
                          className="h-full bg-yellow-400 transition-all"
                          style={{
                            width: `${((collections.outstanding - collections.overdue) / collections.totalExpected) * 100}%`,
                          }}
                          title={`Outstanding: ${formatCurrency(collections.outstanding - collections.overdue)}`}
                        />
                      )}
                      {collections.overdue > 0 && (
                        <div
                          className="h-full bg-red-400 transition-all"
                          style={{ width: `${(collections.overdue / collections.totalExpected) * 100}%` }}
                          title={`Overdue: ${formatCurrency(collections.overdue)}`}
                        />
                      )}
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap items-center gap-4 pt-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-xs text-muted-foreground">
                          Collected ({collectedPct}%)
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-yellow-400" />
                        <span className="text-xs text-muted-foreground">
                          Outstanding (
                          {collections.totalExpected > 0
                            ? Math.round(((collections.outstanding - collections.overdue) / collections.totalExpected) * 100)
                            : 0}
                          %)
                        </span>
                      </div>
                      {collections.overdue > 0 && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-red-400" />
                          <span className="text-xs text-muted-foreground">
                            Overdue ({collections.totalExpected > 0
                              ? Math.round((collections.overdue / collections.totalExpected) * 100)
                              : 0}%)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Collection chart */}
                    <div className="pt-2">
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart
                          data={[
                            { name: "Collected", amount: collections.collected, fill: "#22c55e" },
                            {
                              name: "Outstanding",
                              amount: collections.outstanding - collections.overdue,
                              fill: "#eab308",
                            },
                            { name: "Overdue", amount: collections.overdue, fill: "#ef4444" },
                          ]}
                          margin={{ top: 4, right: 4, left: -10, bottom: 0 }}
                          barCategoryGap="40%"
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e8e0d4" vertical={false} />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 11, fill: "#6b7280" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 10, fill: "#9ca3af" }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) =>
                              v >= 1_000_000
                                ? `${(v / 1_000_000).toFixed(1)}M`
                                : v >= 1_000
                                ? `${(v / 1_000).toFixed(0)}K`
                                : v.toString()
                            }
                          />
                          <Tooltip
                            formatter={(value: number | undefined) => [formatCurrency(value ?? 0), "Amount"]}
                            contentStyle={{
                              fontSize: 12,
                              borderColor: "#c9b99a",
                              borderRadius: 8,
                            }}
                          />
                          <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                            {[
                              { name: "Collected", fill: "#22c55e" },
                              { name: "Outstanding", fill: "#eab308" },
                              { name: "Overdue", fill: "#ef4444" },
                            ].map((entry) => (
                              <Cell key={entry.name} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                    No payment data yet
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </>
  )
}
