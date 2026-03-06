import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireAuth, apiError, apiSuccess } from "@/lib/auth-utils"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const project = await prisma.project.findFirst({
      where: { id, orgId: user.orgId, deletedAt: null },
    })
    if (!project) return apiError("Project not found", 404)

    // Unit status breakdown
    const units = await prisma.unit.groupBy({
      by: ["status"],
      where: { projectId: id, orgId: user.orgId },
      _count: true,
    })

    const unitBreakdown: Record<string, number> = {}
    let totalUnits = 0
    for (const u of units) {
      unitBreakdown[u.status] = u._count
      totalUnits += u._count
    }

    // Total leads
    const totalLeads = await prisma.lead.count({
      where: { projectId: id, orgId: user.orgId, deletedAt: null },
    })

    // Deal stage counts
    const deals = await prisma.deal.groupBy({
      by: ["stage"],
      where: { projectId: id, orgId: user.orgId },
      _count: true,
    })

    const dealBreakdown: Record<string, number> = {}
    let totalDeals = 0
    for (const d of deals) {
      dealBreakdown[d.stage] = d._count
      totalDeals += d._count
    }

    // Total revenue from deal pricing.netPrice
    const allDeals = await prisma.deal.findMany({
      where: { projectId: id, orgId: user.orgId },
      select: { pricing: true },
    })

    let totalRevenue = 0
    for (const d of allDeals) {
      const pricing = d.pricing as any
      if (pricing?.netPrice) {
        totalRevenue += Number(pricing.netPrice)
      }
    }

    // Conversion rate: deals sold / total leads
    const soldCount = dealBreakdown["SOLD"] || 0
    const conversionRate = totalLeads > 0 ? (soldCount / totalLeads) * 100 : 0

    return apiSuccess({
      totalUnits,
      unitBreakdown,
      totalLeads,
      totalDeals,
      dealBreakdown,
      totalRevenue,
      conversionRate: Math.round(conversionRate * 10) / 10,
      unitsSold: unitBreakdown["SOLD"] || 0,
    })
  } catch (error: any) {
    return apiError(error.message, error.message === "Unauthorized" ? 401 : 500)
  }
}
