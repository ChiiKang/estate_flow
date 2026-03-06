import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireAuth, apiError, apiSuccess } from "@/lib/auth-utils"
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
