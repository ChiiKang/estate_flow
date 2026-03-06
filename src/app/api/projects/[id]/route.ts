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

    const project = await prisma.project.findFirst({
      where: { id, orgId: user.orgId, deletedAt: null },
      include: { _count: { select: { units: true, leads: true, deals: true } } },
    })

    if (!project) return apiError("Project not found", 404)
    return apiSuccess(project)
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

    const existing = await prisma.project.findFirst({
      where: { id, orgId: user.orgId, deletedAt: null },
    })
    if (!existing) return apiError("Project not found", 404)

    const allowedFields = [
      "name", "location", "status", "developer", "description",
      "projectType", "coverImage", "metadata", "totalPhases",
    ] as const
    const data: any = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) data[field] = body[field]
    }
    if (body.launchDate !== undefined) data.launchDate = body.launchDate ? new Date(body.launchDate) : null
    if (body.completionDate !== undefined) data.completionDate = body.completionDate ? new Date(body.completionDate) : null
    if (body.priceMin !== undefined) data.priceMin = body.priceMin
    if (body.priceMax !== undefined) data.priceMax = body.priceMax
    if (body.totalPhases !== undefined) data.totalPhases = body.totalPhases ? parseInt(body.totalPhases) : null

    const updated = await prisma.project.update({
      where: { id },
      data,
    })

    // Build change diff for activity log
    const changes: Record<string, { from: any; to: any }> = {}
    for (const key of Object.keys(data)) {
      const oldVal = (existing as any)[key]
      const newVal = (updated as any)[key]
      if (String(oldVal) !== String(newVal)) {
        changes[key] = { from: oldVal, to: newVal }
      }
    }

    if (Object.keys(changes).length > 0) {
      await logActivity({
        orgId: user.orgId,
        entityType: "PROJECT",
        entityId: id,
        type: "UPDATED",
        actorUserId: user.id,
        data: { changes },
      })
    }

    return apiSuccess(updated)
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

    const existing = await prisma.project.findFirst({
      where: { id, orgId: user.orgId, deletedAt: null },
      include: { _count: { select: { deals: true } } },
    })
    if (!existing) return apiError("Project not found", 404)

    if (existing._count.deals > 0) {
      return apiError(
        `Cannot delete project with ${existing._count.deals} active deal(s). Remove deals first.`,
        409
      )
    }

    await prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    await logActivity({
      orgId: user.orgId,
      entityType: "PROJECT",
      entityId: id,
      type: "STATUS_CHANGE",
      actorUserId: user.id,
      data: { action: "soft_deleted", name: existing.name },
    })

    return apiSuccess({ message: "Project deleted" })
  } catch (error: any) {
    if (error.message === "Unauthorized") return apiError("Unauthorized", 401)
    if (error.message === "Forbidden") return apiError("Forbidden", 403)
    return apiError(error.message, 500)
  }
}
