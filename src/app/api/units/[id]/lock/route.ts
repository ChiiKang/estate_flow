import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireAuth, requireRole, apiError, apiSuccess } from "@/lib/auth-utils"
import { logActivity } from "@/lib/activity-logger"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await req.json()
    const durationMinutes = body.durationMinutes || 30

    // Use transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Check unit exists and belongs to org
      const unit = await tx.unit.findFirst({
        where: { id, orgId: user.orgId },
      })

      if (!unit) throw new Error("Unit not found")
      if (unit.status !== "AVAILABLE") throw new Error("Unit is not available")

      // Check for existing active lock
      const existingLock = await tx.unitLock.findFirst({
        where: { unitId: id, status: "ACTIVE" },
        include: { lockedBy: { select: { name: true } } },
      })

      if (existingLock) {
        throw new Error(`Unit is locked by ${existingLock.lockedBy.name} until ${existingLock.expiresAt.toISOString()}`)
      }

      // Create the lock
      const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000)
      const lock = await tx.unitLock.create({
        data: {
          orgId: user.orgId,
          unitId: id,
          lockedByUserId: user.id,
          status: "ACTIVE",
          expiresAt,
        },
      })

      // Update unit status
      await tx.unit.update({
        where: { id },
        data: { status: "RESERVED" },
      })

      return lock
    })

    // Log activity
    await logActivity({
      orgId: user.orgId,
      entityType: "UNIT",
      entityId: id,
      type: "LOCK_CREATED",
      actorUserId: user.id,
      data: { lockId: result.id, expiresAt: result.expiresAt },
    })

    return apiSuccess(result, 201)
  } catch (error: any) {
    if (error.message === "Unauthorized") return apiError("Unauthorized", 401)
    return apiError(error.message, 400)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const result = await prisma.$transaction(async (tx) => {
      const lock = await tx.unitLock.findFirst({
        where: { unitId: id, status: "ACTIVE" },
        include: { lockedBy: { select: { id: true, name: true } } },
      })

      if (!lock) throw new Error("No active lock found")

      // Only ADMIN/MANAGER or the lock creator can unlock
      const isCreator = lock.lockedByUserId === user.id
      const isManager = user.role === "ADMIN" || user.role === "MANAGER"
      if (!isCreator && !isManager) throw new Error("Forbidden")

      await tx.unitLock.update({
        where: { id: lock.id },
        data: { status: "CANCELLED" },
      })

      await tx.unit.update({
        where: { id },
        data: { status: "AVAILABLE" },
      })

      return lock
    })

    await logActivity({
      orgId: user.orgId,
      entityType: "UNIT",
      entityId: id,
      type: "LOCK_CANCELLED",
      actorUserId: user.id,
      data: { lockId: result.id },
    })

    return apiSuccess({ success: true })
  } catch (error: any) {
    if (error.message === "Unauthorized") return apiError("Unauthorized", 401)
    if (error.message === "Forbidden") return apiError("Forbidden", 403)
    return apiError(error.message, 400)
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
    const { additionalMinutes } = body

    if (!additionalMinutes || additionalMinutes <= 0) {
      return apiError("additionalMinutes must be a positive number", 400)
    }

    const lock = await prisma.unitLock.findFirst({
      where: { unitId: id, status: "ACTIVE" },
    })

    if (!lock) return apiError("No active lock found", 404)

    const isCreator = lock.lockedByUserId === user.id
    const isManager = user.role === "ADMIN" || user.role === "MANAGER"
    if (!isCreator && !isManager) return apiError("Forbidden", 403)

    const previousExpiry = lock.expiresAt
    const newExpiry = new Date(lock.expiresAt.getTime() + additionalMinutes * 60 * 1000)

    const updated = await prisma.unitLock.update({
      where: { id: lock.id },
      data: { expiresAt: newExpiry },
    })

    await logActivity({
      orgId: user.orgId,
      entityType: "UNIT",
      entityId: id,
      type: "UPDATED",
      actorUserId: user.id,
      data: { action: "LOCK_EXTENDED", previousExpiry, newExpiry },
    })

    return apiSuccess(updated)
  } catch (error: any) {
    if (error.message === "Unauthorized") return apiError("Unauthorized", 401)
    return apiError(error.message, 400)
  }
}
