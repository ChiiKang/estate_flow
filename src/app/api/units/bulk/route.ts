import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireRole, apiError, apiSuccess } from "@/lib/auth-utils"
import { logActivity } from "@/lib/activity-logger"

const VALID_TRANSITIONS: Record<string, string[]> = {
  AVAILABLE: ["RESERVED", "CANCELLED"],
  RESERVED: ["BOOKED", "AVAILABLE", "CANCELLED"],
  BOOKED: ["SOLD", "CANCELLED"],
  CANCELLED: ["AVAILABLE"],
  SOLD: [],
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireRole("ADMIN", "MANAGER")
    const body = await req.json()
    const { unitIds, action, status, price, percentChange, reason } = body

    if (!unitIds?.length) return apiError("unitIds required", 400)

    const units = await prisma.unit.findMany({
      where: { id: { in: unitIds }, orgId: user.orgId, deletedAt: null },
    })

    if (units.length === 0) return apiError("No valid units found", 404)

    const updated: string[] = []
    const errors: { id: string; error: string }[] = []

    for (const unit of units) {
      try {
        if (action === "status" && status) {
          const allowed = VALID_TRANSITIONS[unit.status] || []
          if (!allowed.includes(status)) {
            errors.push({ id: unit.id, error: `Cannot change ${unit.status} to ${status}` })
            continue
          }

          await prisma.unit.update({ where: { id: unit.id }, data: { status } })
          await logActivity({
            orgId: user.orgId,
            entityType: "UNIT",
            entityId: unit.id,
            type: "STATUS_CHANGE",
            actorUserId: user.id,
            data: { from: unit.status, to: status, reason: reason || "Bulk update" },
          })
        } else if (action === "price") {
          let newPrice = Number(unit.currentPrice)
          if (price !== undefined) {
            newPrice = Number(price)
          } else if (percentChange !== undefined) {
            newPrice = newPrice * (1 + Number(percentChange) / 100)
          }

          await prisma.unit.update({ where: { id: unit.id }, data: { currentPrice: newPrice } })
          await logActivity({
            orgId: user.orgId,
            entityType: "UNIT",
            entityId: unit.id,
            type: "UPDATED",
            actorUserId: user.id,
            data: { changes: { currentPrice: { from: unit.currentPrice, to: newPrice } } },
          })
        }

        updated.push(unit.id)
      } catch (err: any) {
        errors.push({ id: unit.id, error: err.message })
      }
    }

    return apiSuccess({ updated: updated.length, errors })
  } catch (error: any) {
    if (error.message === "Unauthorized") return apiError("Unauthorized", 401)
    if (error.message === "Forbidden") return apiError("Forbidden", 403)
    return apiError(error.message, 500)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireRole("ADMIN", "MANAGER")
    const body = await req.json()
    const { unitIds } = body

    if (!unitIds?.length) return apiError("unitIds required", 400)

    const units = await prisma.unit.findMany({
      where: { id: { in: unitIds }, orgId: user.orgId, deletedAt: null, status: "AVAILABLE" },
    })

    if (units.length === 0) return apiError("No deletable units found (must be AVAILABLE)", 400)

    const deleted: string[] = []
    for (const unit of units) {
      await prisma.unit.update({ where: { id: unit.id }, data: { deletedAt: new Date() } })
      await logActivity({
        orgId: user.orgId,
        entityType: "UNIT",
        entityId: unit.id,
        type: "STATUS_CHANGE",
        actorUserId: user.id,
        data: { action: "ARCHIVED" },
      })
      deleted.push(unit.id)
    }

    return apiSuccess({ deleted: deleted.length })
  } catch (error: any) {
    if (error.message === "Unauthorized") return apiError("Unauthorized", 401)
    if (error.message === "Forbidden") return apiError("Forbidden", 403)
    return apiError(error.message, 500)
  }
}
