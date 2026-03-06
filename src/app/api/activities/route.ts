import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireAuth, apiError, apiSuccess } from "@/lib/auth-utils"

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)

    const entityType = searchParams.get("entityType")
    const entityId = searchParams.get("entityId")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")

    const where: any = { orgId: user.orgId }
    if (entityType) where.entityType = entityType
    if (entityId) where.entityId = entityId

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        include: { actor: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.activity.count({ where }),
    ])

    return apiSuccess({ activities, total, page, limit })
  } catch (error: any) {
    return apiError(error.message, error.message === "Unauthorized" ? 401 : 500)
  }
}
