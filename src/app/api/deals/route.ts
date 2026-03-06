import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireAuth, apiError, apiSuccess } from "@/lib/auth-utils"
import { logActivity } from "@/lib/activity-logger"

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)

    const stage = searchParams.get("stage")
    const projectId = searchParams.get("projectId")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")

    const where: any = { orgId: user.orgId }
    if (stage) where.stage = stage
    if (projectId) where.projectId = projectId

    if (user.role === "AGENT") {
      where.assignedUserId = user.id
    }

    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        include: {
          project: { select: { name: true } },
          unit: { select: { tower: true, floor: true, unitNo: true } },
          lead: { select: { name: true } },
          buyer: { select: { name: true } },
          assignee: { select: { name: true } },
          _count: { select: { docs: true, payments: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.deal.count({ where }),
    ])

    return apiSuccess({ deals, total, page, limit })
  } catch (error: any) {
    return apiError(error.message, error.message === "Unauthorized" ? 401 : 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const deal = await prisma.deal.create({
      data: {
        orgId: user.orgId,
        projectId: body.projectId,
        unitId: body.unitId || null,
        leadId: body.leadId || null,
        buyerId: body.buyerId || null,
        assignedUserId: body.assignedUserId || user.id,
        stage: body.stage || "RESERVED",
        pricing: body.pricing || null,
        customFields: body.customFields || null,
      },
    })

    await logActivity({
      orgId: user.orgId,
      entityType: "DEAL",
      entityId: deal.id,
      type: "CREATED",
      actorUserId: user.id,
      data: { unitId: body.unitId, projectId: body.projectId },
    })

    return apiSuccess(deal, 201)
  } catch (error: any) {
    if (error.message === "Unauthorized") return apiError("Unauthorized", 401)
    return apiError(error.message, 500)
  }
}
