import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireAuth, apiError, apiSuccess } from "@/lib/auth-utils"
import { logActivity } from "@/lib/activity-logger"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await req.json()

    const existing = await prisma.task.findFirst({
      where: { id, orgId: user.orgId },
    })

    if (!existing) return apiError("Task not found", 404)

    const updateData: any = {}
    if (body.status) {
      updateData.status = body.status
      if (body.status === "DONE") updateData.completedAt = new Date()
    }
    if (body.title) updateData.title = body.title
    if (body.dueAt) updateData.dueAt = new Date(body.dueAt)
    if (body.description !== undefined) updateData.description = body.description

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
    })

    if (body.status === "DONE" && existing.leadId) {
      await logActivity({
        orgId: user.orgId,
        entityType: "LEAD",
        entityId: existing.leadId,
        type: "TASK_COMPLETED",
        actorUserId: user.id,
        data: { taskId: id, title: existing.title },
      })
    }

    return apiSuccess(task)
  } catch (error: any) {
    if (error.message === "Unauthorized") return apiError("Unauthorized", 401)
    return apiError(error.message, 500)
  }
}
