import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireAuth, requireRole, apiError, apiSuccess } from "@/lib/auth-utils"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const project = await prisma.project.findFirst({
      where: { id, orgId: user.orgId },
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
      where: { id, orgId: user.orgId },
    })
    if (!existing) return apiError("Project not found", 404)

    const data: any = {}
    if (body.name !== undefined) data.name = body.name
    if (body.location !== undefined) data.location = body.location
    if (body.status !== undefined) data.status = body.status

    const updated = await prisma.project.update({
      where: { id },
      data,
    })

    return apiSuccess(updated)
  } catch (error: any) {
    if (error.message === "Unauthorized") return apiError("Unauthorized", 401)
    if (error.message === "Forbidden") return apiError("Forbidden", 403)
    return apiError(error.message, 500)
  }
}
