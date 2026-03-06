import prisma from "@/lib/db"
import { requireAuth, apiError, apiSuccess } from "@/lib/auth-utils"

export async function GET() {
  try {
    const user = await requireAuth()
    const orgId = user.orgId

    const [
      unitCounts,
      leadCounts,
      dealCounts,
      recentDeals,
      expiringLocks,
    ] = await Promise.all([
      // Unit status counts
      prisma.unit.groupBy({
        by: ["status"],
        where: { orgId },
        _count: { id: true },
      }),
      // Lead stage counts
      prisma.lead.groupBy({
        by: ["stage"],
        where: { orgId, deletedAt: null },
        _count: { id: true },
      }),
      // Deal counts
      prisma.deal.groupBy({
        by: ["stage"],
        where: { orgId },
        _count: { id: true },
      }),
      // Recent deals
      prisma.deal.findMany({
        where: { orgId },
        include: {
          unit: { select: { tower: true, floor: true, unitNo: true } },
          lead: { select: { name: true } },
          buyer: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      // Expiring locks (active, expiring within 2 hours)
      prisma.unitLock.findMany({
        where: {
          orgId,
          status: "ACTIVE",
          expiresAt: { lte: new Date(Date.now() + 2 * 60 * 60 * 1000) },
        },
        include: {
          unit: { select: { tower: true, floor: true, unitNo: true } },
          lockedBy: { select: { name: true } },
        },
        orderBy: { expiresAt: "asc" },
      }),
    ])

    return apiSuccess({
      units: unitCounts,
      leads: leadCounts,
      deals: dealCounts,
      recentDeals,
      expiringLocks,
    })
  } catch (error: any) {
    return apiError(error.message, error.message === "Unauthorized" ? 401 : 500)
  }
}
