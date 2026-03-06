import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireAuth, apiError, apiSuccess } from "@/lib/auth-utils"

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)

    const projectId = searchParams.get("projectId")
    const status = searchParams.get("status")
    const tower = searchParams.get("tower")
    const unitType = searchParams.get("unitType")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")

    const where: any = { orgId: user.orgId }
    if (projectId) where.projectId = projectId
    if (status) where.status = status
    if (tower) where.tower = tower
    if (unitType) where.unitType = unitType

    const [units, total] = await Promise.all([
      prisma.unit.findMany({
        where,
        include: { project: { select: { name: true } } },
        orderBy: [{ tower: "asc" }, { floor: "asc" }, { unitNo: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.unit.count({ where }),
    ])

    return apiSuccess({ units, total, page, limit })
  } catch (error: any) {
    return apiError(error.message, error.message === "Unauthorized" ? 401 : 500)
  }
}
