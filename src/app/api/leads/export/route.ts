import prisma from "@/lib/db"
import { requireAuth, apiError } from "@/lib/auth-utils"

export async function GET() {
  try {
    const user = await requireAuth()

    const leads = await prisma.lead.findMany({
      where: { orgId: user.orgId, deletedAt: null },
      include: {
        owner: { select: { name: true } },
        project: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    const headers = ["Name", "Phone", "Email", "Source", "Stage", "Priority", "Project", "Owner", "Created At"]
    const rows = leads.map((l) => [
      l.name,
      l.phoneRaw || "",
      l.email || "",
      l.source || "",
      l.stage,
      l.priority.toString(),
      l.project?.name || "",
      l.owner?.name || "",
      l.createdAt.toISOString().split("T")[0],
    ])

    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(","))].join("\n")

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="leads-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error: any) {
    return apiError(error.message, error.message === "Unauthorized" ? 401 : 500)
  }
}
