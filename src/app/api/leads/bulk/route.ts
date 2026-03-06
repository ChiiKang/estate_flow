import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireAuth, apiError, apiSuccess } from "@/lib/auth-utils"
import { logActivity } from "@/lib/activity-logger"

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const { ids, stage, ownerUserId } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return apiError("ids array is required", 400)
    }

    if (!stage && !ownerUserId) {
      return apiError("At least one of stage or ownerUserId is required", 400)
    }

    const leads = await prisma.lead.findMany({
      where: { id: { in: ids }, orgId: user.orgId, deletedAt: null },
    })

    const updateData: any = {}
    if (stage) updateData.stage = stage
    if (ownerUserId) updateData.ownerUserId = ownerUserId

    await prisma.lead.updateMany({
      where: { id: { in: leads.map((l) => l.id) }, orgId: user.orgId },
      data: updateData,
    })

    // Log activity per lead
    await Promise.all(
      leads.map(async (lead) => {
        if (stage && stage !== lead.stage) {
          await logActivity({
            orgId: user.orgId,
            entityType: "LEAD",
            entityId: lead.id,
            type: "STAGE_CHANGE",
            actorUserId: user.id,
            data: { from: lead.stage, to: stage, bulk: true },
          })
        }
        if (ownerUserId && ownerUserId !== lead.ownerUserId) {
          await logActivity({
            orgId: user.orgId,
            entityType: "LEAD",
            entityId: lead.id,
            type: "ASSIGNMENT_CHANGE",
            actorUserId: user.id,
            data: { from: lead.ownerUserId, to: ownerUserId, bulk: true },
          })
        }
      })
    )

    return apiSuccess({ updated: leads.length })
  } catch (error: any) {
    if (error.message === "Unauthorized") return apiError("Unauthorized", 401)
    return apiError(error.message, 500)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return apiError("ids array is required", 400)
    }

    // Check for leads with active deals
    const leads = await prisma.lead.findMany({
      where: { id: { in: ids }, orgId: user.orgId, deletedAt: null },
      include: { deals: { where: { stage: { not: "CANCELLED" } } } },
    })

    const blocked = leads.filter((l) => l.deals.length > 0)
    if (blocked.length > 0) {
      return apiError(
        `${blocked.length} lead(s) have active deals and cannot be deleted: ${blocked.map((l) => l.name).join(", ")}`,
        400
      )
    }

    await prisma.lead.updateMany({
      where: { id: { in: leads.map((l) => l.id) }, orgId: user.orgId },
      data: { deletedAt: new Date() },
    })

    await Promise.all(
      leads.map((lead) =>
        logActivity({
          orgId: user.orgId,
          entityType: "LEAD",
          entityId: lead.id,
          type: "UPDATED",
          actorUserId: user.id,
          data: { action: "soft_deleted", bulk: true },
        })
      )
    )

    return apiSuccess({ deleted: leads.length })
  } catch (error: any) {
    if (error.message === "Unauthorized") return apiError("Unauthorized", 401)
    return apiError(error.message, 500)
  }
}
