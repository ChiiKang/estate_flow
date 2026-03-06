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

    const unit = await prisma.unit.findFirst({
      where: { id, orgId: user.orgId },
      select: { id: true },
    })

    if (!unit) return apiError("Unit not found", 404)

    const activities = await prisma.activity.findMany({
      where: {
        orgId: user.orgId,
        entityType: "UNIT",
        entityId: id,
        type: "UPDATED",
      },
      include: { actor: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    })

    const priceHistory = activities
      .filter((a) => {
        const data = a.data as any
        return data?.changes?.currentPrice
      })
      .map((a) => {
        const data = a.data as any
        return {
          date: a.createdAt,
          fromPrice: data.changes.currentPrice.from,
          toPrice: data.changes.currentPrice.to,
          changedBy: a.actor?.name || "System",
        }
      })

    return apiSuccess(priceHistory)
  } catch (error: any) {
    return apiError(error.message, error.message === "Unauthorized" ? 401 : 500)
  }
}
