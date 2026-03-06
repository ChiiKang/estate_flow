import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireAuth, apiError, apiSuccess } from "@/lib/auth-utils"

function getPeriodRange(period: string): { gte: Date; lte: Date } | null {
  const now = new Date()
  switch (period) {
    case "MTD": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      return { gte: start, lte: now }
    }
    case "QTD": {
      const quarter = Math.floor(now.getMonth() / 3)
      const start = new Date(now.getFullYear(), quarter * 3, 1)
      return { gte: start, lte: now }
    }
    case "YTD": {
      const start = new Date(now.getFullYear(), 0, 1)
      return { gte: start, lte: now }
    }
    default:
      return null
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get("projectId")
    const period = searchParams.get("period") || "ALL"
    const isAgent = user.role === "AGENT"

    const orgId = user.orgId
    const periodRange = getPeriodRange(period)

    // Base where clauses (using Record for dynamic property assignment)
    const dealWhere: Record<string, unknown> = { orgId }
    const leadWhere: Record<string, unknown> = { orgId, deletedAt: null }
    const unitWhere: Record<string, unknown> = { orgId, deletedAt: null }
    const paymentWhere: Record<string, unknown> = { orgId }

    if (projectId && projectId !== "ALL") {
      dealWhere.projectId = projectId
      leadWhere.projectId = projectId
      unitWhere.projectId = projectId
    }

    if (isAgent) {
      dealWhere.assignedUserId = user.id
      leadWhere.ownerUserId = user.id
    }

    if (periodRange) {
      dealWhere.createdAt = periodRange
      leadWhere.createdAt = periodRange
    }

    // Now + prior month for MoM comparison
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    const [
      units,
      deals,
      leads,
      payments,
      agentDeals,
      projects,
    ] = await Promise.all([
      prisma.unit.findMany({
        where: unitWhere,
        select: { status: true },
      }),
      prisma.deal.findMany({
        where: dealWhere,
        select: {
          id: true,
          stage: true,
          pricing: true,
          createdAt: true,
          assignedUserId: true,
          assignee: { select: { id: true, name: true } },
        },
      }),
      prisma.lead.findMany({
        where: leadWhere,
        select: { id: true, stage: true, createdAt: true },
      }),
      prisma.payment.findMany({
        where: { ...paymentWhere, deal: projectId && projectId !== "ALL" ? { projectId } : undefined },
        select: { amount: true, status: true, paidAt: true },
      }),
      // Agent leaderboard: fetch deals without period filter but with org/project filter
      prisma.deal.findMany({
        where: {
          orgId,
          ...(projectId && projectId !== "ALL" ? { projectId } : {}),
          stage: { in: ["BOOKED", "SPA_SIGNED", "LOAN_SUBMITTED", "LOAN_APPROVED", "SOLD"] },
        },
        select: {
          id: true,
          pricing: true,
          assignedUserId: true,
          assignee: { select: { id: true, name: true } },
        },
      }),
      prisma.project.findMany({
        where: { orgId, deletedAt: null },
        select: { id: true, name: true },
        orderBy: { createdAt: "desc" },
      }),
    ])

    // ── KPIs ────────────────────────────────────────────────────────────────

    const totalUnits = units.length
    const availableUnits = units.filter((u) => u.status === "AVAILABLE").length
    const soldUnits = units.filter((u) => u.status === "SOLD").length

    const activeDeals = deals.filter(
      (d) => !["CANCELLED"].includes(d.stage)
    )
    const revenueDeals = activeDeals.filter((d) =>
      ["BOOKED", "SPA_SIGNED", "LOAN_SUBMITTED", "LOAN_APPROVED", "SOLD"].includes(d.stage)
    )
    const totalRevenue = revenueDeals.reduce((sum, d) => {
      const p = d.pricing as { netPrice?: number } | null
      return sum + (p?.netPrice || 0)
    }, 0)

    const soldThisMonth = deals.filter(
      (d) =>
        ["BOOKED", "SOLD"].includes(d.stage) &&
        new Date(d.createdAt) >= thisMonthStart
    ).length

    const soldLastMonth = deals.filter(
      (d) =>
        ["BOOKED", "SOLD"].includes(d.stage) &&
        new Date(d.createdAt) >= lastMonthStart &&
        new Date(d.createdAt) <= lastMonthEnd
    ).length

    const activeLeads = leads.length
    const newLeadsThisMonth = leads.filter(
      (l) => new Date(l.createdAt) >= thisMonthStart
    ).length

    // ── Units by Status ──────────────────────────────────────────────────────

    const statusCounts: Record<string, number> = {}
    for (const u of units) {
      statusCounts[u.status] = (statusCounts[u.status] || 0) + 1
    }
    const unitsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    }))

    // ── Sales Trend (last 12 months) ─────────────────────────────────────────

    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11)
    twelveMonthsAgo.setDate(1)
    twelveMonthsAgo.setHours(0, 0, 0, 0)

    // Fetch all deals within last 12 months for trend (ignore period filter for trend)
    const trendDeals = await prisma.deal.findMany({
      where: {
        orgId,
        ...(projectId && projectId !== "ALL" ? { projectId } : {}),
        ...(isAgent ? { assignedUserId: user.id } : {}),
        createdAt: { gte: twelveMonthsAgo },
        stage: { notIn: ["CANCELLED"] },
      },
      select: { createdAt: true, pricing: true, stage: true },
    })

    const monthMap: Record<string, { count: number; revenue: number }> = {}
    // Initialize last 12 months
    for (let i = 11; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      monthMap[key] = { count: 0, revenue: 0 }
    }

    for (const deal of trendDeals) {
      const d = new Date(deal.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      if (monthMap[key]) {
        monthMap[key].count += 1
        const p = deal.pricing as { netPrice?: number } | null
        if (["BOOKED", "SPA_SIGNED", "LOAN_SUBMITTED", "LOAN_APPROVED", "SOLD"].includes(deal.stage)) {
          monthMap[key].revenue += p?.netPrice || 0
        }
      }
    }

    const salesTrend = Object.entries(monthMap).map(([month, data]) => {
      const [year, mon] = month.split("-")
      const date = new Date(parseInt(year), parseInt(mon) - 1, 1)
      const label = date.toLocaleDateString("en-MY", { month: "short", year: "2-digit" })
      return { month: label, count: data.count, revenue: data.revenue }
    })

    // ── Lead Funnel ──────────────────────────────────────────────────────────

    const allLeadStages = [
      "NEW", "CONTACTED", "QUALIFIED", "SITE_VISIT", "UNIT_SELECTED",
      "RESERVED", "BOOKED", "SPA_SIGNED", "LOAN_SUBMITTED", "LOAN_APPROVED", "SOLD",
    ]

    // Fetch all leads (no period filter) for funnel
    const funnelLeads = await prisma.lead.findMany({
      where: {
        orgId,
        ...(projectId && projectId !== "ALL" ? { projectId } : {}),
        ...(isAgent ? { ownerUserId: user.id } : {}),
        deletedAt: null,
      },
      select: { stage: true },
    })

    const stageCounts: Record<string, number> = {}
    for (const l of funnelLeads) {
      stageCounts[l.stage] = (stageCounts[l.stage] || 0) + 1
    }
    const leadFunnel = allLeadStages.map((stage) => ({
      stage,
      count: stageCounts[stage] || 0,
    }))

    // ── Agent Leaderboard ────────────────────────────────────────────────────

    const agentMap: Record<string, { id: string; name: string; deals: number; revenue: number }> = {}
    for (const deal of agentDeals) {
      if (!deal.assignedUserId) continue
      const agentId = deal.assignedUserId
      if (!agentMap[agentId]) {
        agentMap[agentId] = {
          id: agentId,
          name: deal.assignee?.name || "Unknown",
          deals: 0,
          revenue: 0,
        }
      }
      agentMap[agentId].deals += 1
      const p = deal.pricing as { netPrice?: number } | null
      agentMap[agentId].revenue += p?.netPrice || 0
    }

    const agentLeaderboard = Object.values(agentMap)
      .sort((a, b) => b.deals - a.deals || b.revenue - a.revenue)
      .slice(0, 10)

    // ── Collections ──────────────────────────────────────────────────────────

    const now2 = new Date()
    let totalExpected = 0
    let collected = 0
    let outstanding = 0
    let overdue = 0

    for (const p of payments) {
      const amount = Number(p.amount)
      totalExpected += amount
      if (p.status === "VERIFIED") {
        collected += amount
      } else if (p.status === "SUBMITTED") {
        outstanding += amount
      } else {
        // REJECTED or unverified
        outstanding += amount
      }
    }

    // Overdue: submitted payments that were submitted but have paidAt older than 30 days
    for (const p of payments) {
      if (p.status === "SUBMITTED" && p.paidAt) {
        const paidDate = new Date(p.paidAt)
        const daysDiff = (now2.getTime() - paidDate.getTime()) / (1000 * 60 * 60 * 24)
        if (daysDiff > 30) {
          overdue += Number(p.amount)
        }
      }
    }

    return apiSuccess({
      kpis: {
        totalUnits,
        availableUnits,
        soldUnits,
        soldThisMonth,
        soldLastMonth,
        totalRevenue,
        activeLeads,
        newLeadsThisMonth,
      },
      unitsByStatus,
      salesTrend,
      leadFunnel,
      agentLeaderboard,
      collections: {
        totalExpected,
        collected,
        outstanding,
        overdue,
      },
      projects,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return apiError(message, message === "Unauthorized" ? 401 : 500)
  }
}
