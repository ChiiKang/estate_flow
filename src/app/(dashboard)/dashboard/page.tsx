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
  TrendingDown,
  DollarSign,
  Users,
  Loader2,
  Trophy,
  Minus,
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
  NEW: "New",
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

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

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
      <p className="text-muted-foreground">
        {payload[0].value} units
      </p>
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  trend,
}: {
  label: string
  value: string
  subtitle: string
  icon: React.ElementType
  iconColor: string
  trend?: "up" | "down" | "neutral"
}) {
  return (
    <Card className="border-tan-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
              {label}
            </p>
            <p className="text-2xl font-bold text-foreground truncate">{value}</p>
            <div className="flex items-center gap-1 mt-1">
              {trend === "up" && <TrendingUp className="w-3 h-3 text-green-500 shrink-0" />}
              {trend === "down" && <TrendingDown className="w-3 h-3 text-red-500 shrink-0" />}
              {trend === "neutral" && <Minus className="w-3 h-3 text-muted-foreground shrink-0" />}
              <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
            </div>
          </div>
          <div className={`p-2.5 rounded-xl bg-secondary ${iconColor} shrink-0 ml-3`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
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

      const res = await fetch(`/api/dashboards/analytics?${params}`)
      if (res.status === 401) {
        window.location.href = "/login"
        return
      }
      if (!res.ok) throw new Error(`API error: ${res.status}`)
      const d = await res.json()
      setData(d)
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

  // ── Render: Loading ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <Header title="Dashboard" subtitle="Sales analytics and performance overview" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Header title="Dashboard" subtitle="Sales analytics and performance overview" />
        <div className="p-6 text-center text-red-500">{error}</div>
      </>
    )
  }

  if (!data) return null

  const { kpis, unitsByStatus, salesTrend, leadFunnel, agentLeaderboard, collections } = data

  // ── Derived values ───────────────────────────────────────────────────────

  const availablePct = kpis.totalUnits > 0
    ? Math.round((kpis.availableUnits / kpis.totalUnits) * 100)
    : 0

  const momChange = kpis.soldLastMonth > 0
    ? Math.round(((kpis.soldThisMonth - kpis.soldLastMonth) / kpis.soldLastMonth) * 100)
    : kpis.soldThisMonth > 0 ? 100 : 0

  const momTrend: "up" | "down" | "neutral" =
    momChange > 0 ? "up" : momChange < 0 ? "down" : "neutral"

  const collectedPct = collections.totalExpected > 0
    ? Math.round((collections.collected / collections.totalExpected) * 100)
    : 0

  // Funnel: max count for relative bar widths
  const maxFunnelCount = Math.max(...leadFunnel.map((f) => f.count), 1)

  // Donut chart data
  const donutData = unitsByStatus
    .filter((s) => s.count > 0)
    .map((s) => ({ name: s.status, value: s.count }))

  return (
    <>
      <Header title="Dashboard" subtitle="Sales analytics and performance overview" />
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

        {/* ── Row 1: KPI Cards ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            label="Total Units"
            value={kpis.totalUnits.toLocaleString()}
            subtitle={`${availablePct}% available (${kpis.availableUnits.toLocaleString()})`}
            icon={Building2}
            iconColor="text-sage-600"
            trend="neutral"
          />
          <KpiCard
            label="Units Sold"
            value={kpis.soldUnits.toLocaleString()}
            subtitle={
              momChange === 0
                ? "No change vs last month"
                : `${momChange > 0 ? "+" : ""}${momChange}% vs last month`
            }
            icon={TrendingUp}
            iconColor="text-tan-600"
            trend={momTrend}
          />
          <KpiCard
            label="Revenue"
            value={formatCurrency(kpis.totalRevenue)}
            subtitle="Sum of booked/sold deals"
            icon={DollarSign}
            iconColor="text-sage-500"
            trend="neutral"
          />
          <KpiCard
            label="Active Leads"
            value={kpis.activeLeads.toLocaleString()}
            subtitle={`${kpis.newLeadsThisMonth} new this month`}
            icon={Users}
            iconColor="text-tan-500"
            trend={kpis.newLeadsThisMonth > 0 ? "up" : "neutral"}
          />
        </div>

        {/* ── Row 2: Sales Trend + Unit Status Donut ────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Sales Trend Bar Chart */}
          <Card className="border-tan-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
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

          {/* Unit Status Donut Chart */}
          <Card className="border-tan-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
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

        {/* ── Row 3: Agent Leaderboard + Conversion Funnel ─────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Agent Leaderboard */}
          <Card className="border-tan-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Trophy className="w-4 h-4 text-tan-500" />
                Agent Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {agentLeaderboard.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                  No agent data yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                      <TableHead className="text-xs py-2 w-8">#</TableHead>
                      <TableHead className="text-xs py-2">Agent</TableHead>
                      <TableHead className="text-xs py-2 text-center">Deals</TableHead>
                      <TableHead className="text-xs py-2 text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agentLeaderboard.map((agent, idx) => (
                      <TableRow key={agent.id} className="hover:bg-secondary/20">
                        <TableCell className="py-2 text-sm font-medium text-muted-foreground">
                          {idx === 0 ? (
                            <span className="text-yellow-500">1</span>
                          ) : idx === 1 ? (
                            <span className="text-slate-400">2</span>
                          ) : idx === 2 ? (
                            <span className="text-amber-600">3</span>
                          ) : (
                            idx + 1
                          )}
                        </TableCell>
                        <TableCell className="py-2 text-sm font-medium">{agent.name}</TableCell>
                        <TableCell className="py-2 text-center">
                          <Badge variant="secondary" className="text-xs">
                            {agent.deals}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 text-right text-sm font-semibold text-sage-700">
                          {agent.revenue > 0 ? formatCurrency(agent.revenue) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Conversion Funnel */}
          <Card className="border-tan-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-sage-600" />
                Conversion Funnel
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2 mt-1">
                {leadFunnel.map((item, idx) => {
                  const prev = idx > 0 ? leadFunnel[idx - 1].count : null
                  const dropOff =
                    prev !== null && prev > 0
                      ? Math.round(((prev - item.count) / prev) * 100)
                      : null
                  const barWidth =
                    maxFunnelCount > 0 && item.count > 0
                      ? Math.max((item.count / maxFunnelCount) * 100, 6)
                      : 0
                  return (
                    <div key={item.stage} className="flex items-center gap-2">
                      <span className="text-xs w-24 text-right text-muted-foreground shrink-0">
                        {LEAD_STAGE_LABELS[item.stage]}
                      </span>
                      <div className="flex-1 h-6 rounded-md bg-secondary overflow-hidden">
                        {item.count > 0 ? (
                          <div
                            className="h-full rounded-md flex items-center px-2 transition-all"
                            style={{
                              width: `${barWidth}%`,
                              backgroundColor: CHART_COLORS.sage600,
                              opacity: 0.7 + (0.3 * item.count) / maxFunnelCount,
                            }}
                          >
                            <span className="text-xs font-medium text-white">{item.count}</span>
                          </div>
                        ) : null}
                      </div>
                      {dropOff !== null && dropOff > 0 && (
                        <span className="text-xs text-red-400 w-12 shrink-0">
                          -{dropOff}%
                        </span>
                      )}
                      {(dropOff === null || dropOff === 0) && (
                        <span className="w-12 shrink-0" />
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Row 4: Collection Tracker ───────────────────────────────────── */}
        <Card className="border-tan-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-sage-600" />
              Collection Tracker
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary numbers */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Total Expected</p>
                <p className="text-sm font-bold mt-0.5">
                  {collections.totalExpected > 0 ? formatCurrency(collections.totalExpected) : "—"}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Collected</p>
                <p className="text-sm font-bold mt-0.5 text-green-600">
                  {collections.collected > 0 ? formatCurrency(collections.collected) : "—"}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Outstanding</p>
                <p className="text-sm font-bold mt-0.5 text-yellow-600">
                  {collections.outstanding > 0 ? formatCurrency(collections.outstanding) : "—"}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Overdue (&gt;30 days)</p>
                <p className="text-sm font-bold mt-0.5 text-red-500">
                  {collections.overdue > 0 ? formatCurrency(collections.overdue) : "None"}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            {collections.totalExpected > 0 ? (
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>Collection progress</span>
                  <span>{collectedPct}% collected</span>
                </div>
                <div className="h-3 rounded-full bg-secondary overflow-hidden flex">
                  {/* Collected segment */}
                  {collections.collected > 0 && (
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${(collections.collected / collections.totalExpected) * 100}%` }}
                    />
                  )}
                  {/* Outstanding (minus overdue) */}
                  {collections.outstanding - collections.overdue > 0 && (
                    <div
                      className="h-full bg-yellow-400 transition-all"
                      style={{
                        width: `${((collections.outstanding - collections.overdue) / collections.totalExpected) * 100}%`,
                      }}
                    />
                  )}
                  {/* Overdue segment */}
                  {collections.overdue > 0 && (
                    <div
                      className="h-full bg-red-400 transition-all"
                      style={{ width: `${(collections.overdue / collections.totalExpected) * 100}%` }}
                    />
                  )}
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    <span className="text-xs text-muted-foreground">Collected</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    <span className="text-xs text-muted-foreground">Outstanding</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <span className="text-xs text-muted-foreground">Overdue</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">No payment data yet</p>
            )}
          </CardContent>
        </Card>

      </div>
    </>
  )
}
