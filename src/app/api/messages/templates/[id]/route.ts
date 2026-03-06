import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireAuth, apiError, apiSuccess } from "@/lib/auth-utils"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const template = await prisma.messageTemplate.findFirst({
      where: { id, orgId: user.orgId },
      include: { project: { select: { id: true, name: true } } },
    })

    if (!template) return apiError("Template not found", 404)
    return apiSuccess(template)
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

    const existing = await prisma.messageTemplate.findFirst({
      where: { id, orgId: user.orgId },
    })
    if (!existing) return apiError("Template not found", 404)

    if (body.name !== undefined && !body.name.trim()) {
      return apiError("Name cannot be empty", 400)
    }
    if (body.content !== undefined && !body.content.trim()) {
      return apiError("Content cannot be empty", 400)
    }

    const template = await prisma.messageTemplate.update({
      where: { id },
      data: {
        name: body.name !== undefined ? body.name : existing.name,
        content: body.content !== undefined ? body.content : existing.content,
        projectId: body.projectId !== undefined ? body.projectId || null : existing.projectId,
      },
      include: { project: { select: { id: true, name: true } } },
    })

    return apiSuccess(template)
  } catch (error: any) {
    if (error.message === "Unauthorized") return apiError("Unauthorized", 401)
    return apiError(error.message, 500)
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const existing = await prisma.messageTemplate.findFirst({
      where: { id, orgId: user.orgId },
    })
    if (!existing) return apiError("Template not found", 404)

    await prisma.messageTemplate.delete({ where: { id } })

    return apiSuccess({ success: true })
  } catch (error: any) {
    if (error.message === "Unauthorized") return apiError("Unauthorized", 401)
    return apiError(error.message, 500)
  }
}
