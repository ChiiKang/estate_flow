import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireAuth, requireRole, apiError, apiSuccess } from "@/lib/auth-utils"
import { logActivity } from "@/lib/activity-logger"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const unit = await prisma.unit.findFirst({
      where: { id, orgId: user.orgId, deletedAt: null },
      include: {
        project: { select: { id: true, name: true } },
        locks: {
          include: { lockedBy: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
        },
        deals: {
          include: {
            lead: { select: { name: true } },
            assignee: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!unit) return apiError("Unit not found", 404)

    const activities = await prisma.activity.findMany({
      where: { orgId: user.orgId, entityType: "UNIT", entityId: id },
      include: { actor: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    return apiSuccess({ ...unit, activities })
  } catch (error: any) {
    return apiError(error.message, error.message === "Unauthorized" ? 401 : 500)
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("ADMIN", "MANAGER")
    const { id } = await params
    const body = await req.json()

    const existing = await prisma.unit.findFirst({
      where: { id, orgId: user.orgId, deletedAt: null },
    })

    if (!existing) return apiError("Unit not found", 404)

    // Status change validation
    if (body.status && body.status !== existing.status) {
      const validTransitions: Record<string, string[]> = {
        AVAILABLE: ["RESERVED", "CANCELLED"],
        RESERVED: ["BOOKED", "AVAILABLE", "CANCELLED"],
        BOOKED: ["SOLD", "CANCELLED"],
        CANCELLED: ["AVAILABLE"],
        SOLD: [],
      }

      const allowed = validTransitions[existing.status] || []
      if (!allowed.includes(body.status)) {
        return apiError(
          `Cannot change status from ${existing.status} to ${body.status}`,
          400
        )
      }

      if (!body.reason) {
        return apiError("Reason is required for status changes", 400)
      }
    }

    const updateData: Record<string, unknown> = {}
    const editableFields = [
      "unitType", "sizeSqm", "facing", "basePrice",
      "currentPrice", "tower", "floor", "unitNo", "status",
    ] as const

    const changes: Record<string, { from: unknown; to: unknown }> = {}

    for (const field of editableFields) {
      if (body[field] !== undefined && body[field] !== (existing as any)[field]?.toString() && body[field] !== (existing as any)[field]) {
        const oldVal = (existing as any)[field]
        changes[field] = { from: oldVal, to: body[field] }
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return apiError("No changes to apply", 400)
    }

    const unit = await prisma.unit.update({
      where: { id },
      data: updateData,
    })

    // Log status change separately
    if (changes.status) {
      await logActivity({
        orgId: user.orgId,
        entityType: "UNIT",
        entityId: id,
        type: "STATUS_CHANGE",
        actorUserId: user.id,
        data: { from: changes.status.from, to: changes.status.to, reason: body.reason },
      })
    }

    // Log field updates (excluding status which is logged separately)
    const fieldChanges = { ...changes }
    delete fieldChanges.status
    if (Object.keys(fieldChanges).length > 0) {
      await logActivity({
        orgId: user.orgId,
        entityType: "UNIT",
        entityId: id,
        type: "UPDATED",
        actorUserId: user.id,
        data: { changes: fieldChanges },
      })
    }

    return apiSuccess(unit)
  } catch (error: any) {
    if (error.message === "Unauthorized") return apiError("Unauthorized", 401)
    if (error.message === "Forbidden") return apiError("Forbidden", 403)
    return apiError(error.message, 500)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("ADMIN", "MANAGER")
    const { id } = await params

    const unit = await prisma.unit.findFirst({
      where: { id, orgId: user.orgId, deletedAt: null },
    })

    if (!unit) return apiError("Unit not found", 404)
    if (unit.status !== "AVAILABLE") {
      return apiError("Only AVAILABLE units can be deleted", 400)
    }

    await prisma.unit.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    await logActivity({
      orgId: user.orgId,
      entityType: "UNIT",
      entityId: id,
      type: "STATUS_CHANGE",
      actorUserId: user.id,
      data: { action: "ARCHIVED" },
    })

    return apiSuccess({ success: true })
  } catch (error: any) {
    if (error.message === "Unauthorized") return apiError("Unauthorized", 401)
    if (error.message === "Forbidden") return apiError("Forbidden", 403)
    return apiError(error.message, 500)
  }
}
