import prisma from "@/lib/db"
import { requireAuth, apiError } from "@/lib/auth-utils"

export async function GET() {
  try {
    const user = await requireAuth()

    const units = await prisma.unit.findMany({
      where: { orgId: user.orgId },
      include: { project: { select: { name: true } } },
      orderBy: [{ tower: "asc" }, { floor: "asc" }, { unitNo: "asc" }],
    })

    const headers = ["Unit No", "Tower", "Floor", "Type", "Size (sqm)", "Facing", "Base Price", "Current Price", "Status", "Project"]
    const rows = units.map((u) => [
      u.unitNo,
      u.tower,
      u.floor,
      u.unitType,
      u.sizeSqm?.toString() || "",
      u.facing || "",
      u.basePrice.toString(),
      u.currentPrice.toString(),
      u.status,
      u.project?.name || "",
    ])

    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(","))].join("\n")

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="units-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error: any) {
    return apiError(error.message, error.message === "Unauthorized" ? 401 : 500)
  }
}
