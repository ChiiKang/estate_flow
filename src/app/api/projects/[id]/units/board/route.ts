import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireAuth, apiError, apiSuccess } from "@/lib/auth-utils"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id: projectId } = await params

    // Verify the project belongs to this org
    const project = await prisma.project.findFirst({
      where: { id: projectId, orgId: user.orgId, deletedAt: null },
      select: { id: true, name: true, location: true },
    })

    if (!project) {
      return apiError("Project not found", 404)
    }

    const units = await prisma.unit.findMany({
      where: {
        projectId,
        orgId: user.orgId,
        deletedAt: null,
      },
      select: {
        id: true,
        tower: true,
        floor: true,
        unitNo: true,
        unitType: true,
        sizeSqm: true,
        facing: true,
        currentPrice: true,
        basePrice: true,
        status: true,
      },
      orderBy: [
        { tower: "asc" },
        { floor: "asc" },
        { unitNo: "asc" },
      ],
    })

    // Derive distinct, sorted towers from the unit results
    const towersSet = new Set<string>()
    for (const u of units) towersSet.add(u.tower)
    const towers = [...towersSet].sort()

    // Status summary counts
    const summary = {
      AVAILABLE: 0,
      RESERVED: 0,
      BOOKED: 0,
      SOLD: 0,
      CANCELLED: 0,
    } as Record<string, number>
    for (const u of units) {
      summary[u.status] = (summary[u.status] ?? 0) + 1
    }

    return apiSuccess({
      project,
      towers,
      units,
      summary,
    })
  } catch (error: any) {
    return apiError(error.message, error.message === "Unauthorized" ? 401 : 500)
  }
}
