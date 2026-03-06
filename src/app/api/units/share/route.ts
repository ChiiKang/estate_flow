import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireAuth, apiError, apiSuccess } from "@/lib/auth-utils"

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get("projectId")

    if (!projectId) return apiError("projectId required", 400)

    const project = await prisma.project.findFirst({
      where: { id: projectId, orgId: user.orgId },
      select: { name: true },
    })

    if (!project) return apiError("Project not found", 404)

    const units = await prisma.unit.findMany({
      where: { projectId, orgId: user.orgId, status: "AVAILABLE", deletedAt: null },
      orderBy: [{ tower: "asc" }, { floor: "asc" }, { unitNo: "asc" }],
    })

    // Group by tower
    const grouped: Record<string, typeof units> = {}
    for (const u of units) {
      if (!grouped[u.tower]) grouped[u.tower] = []
      grouped[u.tower].push(u)
    }

    let text = `*${project.name} — Available Units*\n`
    text += `Total: ${units.length} units\n\n`

    for (const [tower, towerUnits] of Object.entries(grouped)) {
      text += `*Tower ${tower}* (${towerUnits.length} units)\n`
      for (const u of towerUnits) {
        const size = u.sizeSqm ? `${Number(u.sizeSqm).toFixed(0)} sqm` : ""
        const price = Number(u.currentPrice).toLocaleString("en-MY", { style: "currency", currency: "MYR", minimumFractionDigits: 0 })
        text += `• ${u.unitNo} | ${u.unitType} | ${size} | ${price}\n`
      }
      text += "\n"
    }

    return apiSuccess({ text: text.trim(), unitCount: units.length })
  } catch (error: any) {
    return apiError(error.message, error.message === "Unauthorized" ? 401 : 500)
  }
}
