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

    const unit = await prisma.unit.findFirst({
      where: { id, orgId: user.orgId },
      select: { id: true },
    })

    if (!unit) return apiError("Unit not found", 404)

    const notes = await prisma.unitNote.findMany({
      where: { unitId: id, orgId: user.orgId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    })

    return apiSuccess(notes)
  } catch (error: any) {
    return apiError(error.message, error.message === "Unauthorized" ? 401 : 500)
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await req.json()

    if (!body.content?.trim()) return apiError("Content is required", 400)

    const unit = await prisma.unit.findFirst({
      where: { id, orgId: user.orgId },
      select: { id: true },
    })

    if (!unit) return apiError("Unit not found", 404)

    const note = await prisma.unitNote.create({
      data: {
        orgId: user.orgId,
        unitId: id,
        userId: user.id,
        content: body.content.trim(),
      },
      include: { user: { select: { name: true } } },
    })

    await logActivity({
      orgId: user.orgId,
      entityType: "UNIT",
      entityId: id,
      type: "NOTE",
      actorUserId: user.id,
      data: { noteId: note.id },
    })

    return apiSuccess(note, 201)
  } catch (error: any) {
    if (error.message === "Unauthorized") return apiError("Unauthorized", 401)
    return apiError(error.message, 500)
  }
}
