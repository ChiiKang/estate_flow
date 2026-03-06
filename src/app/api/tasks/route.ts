import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireAuth, apiError, apiSuccess } from "@/lib/auth-utils"
import { logActivity } from "@/lib/activity-logger"

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)

    const status = searchParams.get("status")
    const assignedUserId = searchParams.get("assignedUserId")

    const where: any = { orgId: user.orgId }
    if (status) where.status = status
    if (assignedUserId) where.assignedUserId = assignedUserId

    // Agents see only their tasks
    if (user.role === "AGENT") {
      where.assignedUserId = user.id
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        lead: { select: { id: true, name: true } },
        deal: { select: { id: true } },
        assignee: { select: { id: true, name: true } },
      },
      orderBy: { dueAt: "asc" },
    })

    return apiSuccess(tasks)
  } catch (error: any) {
    return apiError(error.message, error.message === "Unauthorized" ? 401 : 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const task = await prisma.task.create({
      data: {
        orgId: user.orgId,
        leadId: body.leadId || null,
        dealId: body.dealId || null,
        assignedUserId: body.assignedUserId || user.id,
        type: body.type,
        title: body.title,
        description: body.description || null,
        dueAt: new Date(body.dueAt),
        status: "OPEN",
      },
    })

    if (body.leadId) {
      await logActivity({
        orgId: user.orgId,
        entityType: "LEAD",
        entityId: body.leadId,
        type: "TASK_CREATED",
        actorUserId: user.id,
        data: { taskId: task.id, type: body.type, title: body.title },
      })
    }

    return apiSuccess(task, 201)
  } catch (error: any) {
    if (error.message === "Unauthorized") return apiError("Unauthorized", 401)
    return apiError(error.message, 500)
  }
}
