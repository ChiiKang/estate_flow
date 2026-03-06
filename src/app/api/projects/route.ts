import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireAuth, requireRole, apiError, apiSuccess } from "@/lib/auth-utils"

export async function GET() {
  try {
    const user = await requireAuth()

    const projects = await prisma.project.findMany({
      where: { orgId: user.orgId },
      include: {
        _count: { select: { units: true, leads: true, deals: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return apiSuccess(projects)
  } catch (error: any) {
    return apiError(error.message, error.message === "Unauthorized" ? 401 : 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("ADMIN", "MANAGER")
    const body = await req.json()

    const project = await prisma.project.create({
      data: {
        orgId: user.orgId,
        name: body.name,
        location: body.location || null,
        status: "ACTIVE",
      },
    })

    return apiSuccess(project, 201)
  } catch (error: any) {
    if (error.message === "Unauthorized") return apiError("Unauthorized", 401)
    if (error.message === "Forbidden") return apiError("Forbidden", 403)
    return apiError(error.message, 500)
  }
}
