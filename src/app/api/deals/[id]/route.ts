import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireAuth, apiError, apiSuccess } from "@/lib/auth-utils"
import { logActivity } from "@/lib/activity-logger"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const deal = await prisma.deal.findFirst({
      where: { id, orgId: user.orgId },
      include: {
        project: true,
        unit: true,
        lead: true,
        buyer: true,
        assignee: { select: { id: true, name: true, email: true } },
        docs: { include: { docType: true } },
        payments: { orderBy: { createdAt: "desc" } },
        locks: { orderBy: { createdAt: "desc" } },
      },
    })

    if (!deal) return apiError("Deal not found", 404)

    const activities = await prisma.activity.findMany({
      where: { orgId: user.orgId, entityType: "DEAL", entityId: id },
      include: { actor: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    return apiSuccess({ ...deal, activities })
  } catch (error: any) {
    return apiError(error.message, error.message === "Unauthorized" ? 401 : 500)
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await req.json()

    const existing = await prisma.deal.findFirst({
      where: { id, orgId: user.orgId },
    })

    if (!existing) return apiError("Deal not found", 404)

    const updateData: any = {}
    if (body.stage) updateData.stage = body.stage
    if (body.pricing) updateData.pricing = body.pricing
    if (body.customFields) updateData.customFields = body.customFields
    if (body.assignedUserId) updateData.assignedUserId = body.assignedUserId
    if (body.buyerId) updateData.buyerId = body.buyerId

    const deal = await prisma.deal.update({
      where: { id },
      data: updateData,
    })

    if (body.stage && body.stage !== existing.stage) {
      await logActivity({
        orgId: user.orgId,
        entityType: "DEAL",
        entityId: id,
        type: "STAGE_CHANGE",
        actorUserId: user.id,
        data: { from: existing.stage, to: body.stage },
      })
    }

    return apiSuccess(deal)
  } catch (error: any) {
    if (error.message === "Unauthorized") return apiError("Unauthorized", 401)
    return apiError(error.message, 500)
  }
}
