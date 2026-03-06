import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireAuth, requireRole, apiError, apiSuccess } from "@/lib/auth-utils"
import { logActivity } from "@/lib/activity-logger"

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const search = searchParams.get("search")

    const where: any = { orgId: user.orgId, deletedAt: null }
    if (status) where.status = status
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
        { developer: { contains: search, mode: "insensitive" } },
      ]
    }

    const projects = await prisma.project.findMany({
      where,
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
        developer: body.developer || null,
        description: body.description || null,
        projectType: body.projectType || null,
        launchDate: body.launchDate ? new Date(body.launchDate) : null,
        completionDate: body.completionDate ? new Date(body.completionDate) : null,
        totalPhases: body.totalPhases ? parseInt(body.totalPhases) : null,
        priceMin: body.priceMin || null,
        priceMax: body.priceMax || null,
        coverImage: body.coverImage || null,
        metadata: body.metadata || null,
      },
    })

    await logActivity({
      orgId: user.orgId,
      entityType: "PROJECT",
      entityId: project.id,
      type: "CREATED",
      actorUserId: user.id,
      data: { name: project.name },
    })

    return apiSuccess(project, 201)
  } catch (error: any) {
    if (error.message === "Unauthorized") return apiError("Unauthorized", 401)
    if (error.message === "Forbidden") return apiError("Forbidden", 403)
    return apiError(error.message, 500)
  }
}
