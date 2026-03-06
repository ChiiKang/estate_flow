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

    const lead = await prisma.lead.findFirst({
      where: { id, orgId: user.orgId, deletedAt: null },
      include: {
        owner: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        deals: { include: { unit: { select: { tower: true, floor: true, unitNo: true } } } },
        tasks: { where: { status: "OPEN" }, orderBy: { dueAt: "asc" } },
        messages: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    })

    if (!lead) return apiError("Lead not found", 404)

    // Get activity timeline
    const activities = await prisma.activity.findMany({
      where: { orgId: user.orgId, entityType: "LEAD", entityId: id },
      include: { actor: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    return apiSuccess({ ...lead, activities })
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

    const existing = await prisma.lead.findFirst({
      where: { id, orgId: user.orgId, deletedAt: null },
    })

    if (!existing) return apiError("Lead not found", 404)

    const updateData: any = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.stage !== undefined) updateData.stage = body.stage
    if (body.ownerUserId !== undefined) updateData.ownerUserId = body.ownerUserId
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.tags !== undefined) updateData.tags = body.tags
    if (body.projectId !== undefined) updateData.projectId = body.projectId
    if (body.nextFollowupAt !== undefined) updateData.nextFollowupAt = body.nextFollowupAt ? new Date(body.nextFollowupAt) : null

    const lead = await prisma.lead.update({
      where: { id },
      data: updateData,
    })

    // Log stage changes
    if (body.stage && body.stage !== existing.stage) {
      await logActivity({
        orgId: user.orgId,
        entityType: "LEAD",
        entityId: id,
        type: "STAGE_CHANGE",
        actorUserId: user.id,
        data: { from: existing.stage, to: body.stage },
      })
    }

    // Log assignment changes
    if (body.ownerUserId && body.ownerUserId !== existing.ownerUserId) {
      await logActivity({
        orgId: user.orgId,
        entityType: "LEAD",
        entityId: id,
        type: "ASSIGNMENT_CHANGE",
        actorUserId: user.id,
        data: { from: existing.ownerUserId, to: body.ownerUserId },
      })
    }

    return apiSuccess(lead)
  } catch (error: any) {
    if (error.message === "Unauthorized") return apiError("Unauthorized", 401)
    return apiError(error.message, 500)
  }
}
