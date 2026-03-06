import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireAuth, apiError, apiSuccess } from "@/lib/auth-utils"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const project = await prisma.project.findFirst({
      where: { id, orgId: user.orgId, deletedAt: null },
    })
    if (!project) return apiError("Project not found", 404)

    const activities = await prisma.activity.findMany({
      where: {
        orgId: user.orgId,
        entityType: "PROJECT",
        entityId: id,
      },
      include: {
        actor: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    return apiSuccess(activities)
  } catch (error: any) {
    return apiError(error.message, error.message === "Unauthorized" ? 401 : 500)
  }
}
