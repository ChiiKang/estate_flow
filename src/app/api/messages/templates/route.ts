import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireAuth, apiError, apiSuccess } from "@/lib/auth-utils"

export async function GET() {
  try {
    const user = await requireAuth()
    const templates = await prisma.messageTemplate.findMany({
      where: { orgId: user.orgId },
      include: { project: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    })
    return apiSuccess(templates)
  } catch (error: any) {
    return apiError(error.message, error.message === "Unauthorized" ? 401 : 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    if (!body.name || !body.content) {
      return apiError("Name and content are required", 400)
    }

    const template = await prisma.messageTemplate.create({
      data: {
        orgId: user.orgId,
        projectId: body.projectId || null,
        name: body.name,
        content: body.content,
      },
    })

    return apiSuccess(template, 201)
  } catch (error: any) {
    if (error.message === "Unauthorized") return apiError("Unauthorized", 401)
    return apiError(error.message, 500)
  }
}
