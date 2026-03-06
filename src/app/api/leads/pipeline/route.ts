import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireAuth, apiError, apiSuccess } from "@/lib/auth-utils"

const LEAD_STAGES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "SITE_VISIT",
  "UNIT_SELECTED",
  "RESERVED",
  "BOOKED",
  "SPA_SIGNED",
  "LOAN_SUBMITTED",
  "LOAN_APPROVED",
  "SOLD",
] as const

type LeadStageKey = (typeof LEAD_STAGES)[number]

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get("projectId")
    const agentId = searchParams.get("agentId")

    const baseWhere: any = {
      orgId: user.orgId,
      deletedAt: null,
    }

    if (projectId) baseWhere.projectId = projectId
    if (agentId) baseWhere.ownerUserId = agentId

    // Agents only see their own leads
    if (user.role === "AGENT") {
      baseWhere.ownerUserId = user.id
    }

    // Fetch leads for all stages in parallel, limit 50 per stage
    const stageQueries = LEAD_STAGES.map((stage) =>
      prisma.lead.findMany({
        where: { ...baseWhere, stage },
        include: {
          owner: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
        orderBy: [
          { priority: "desc" },
          { lastContactedAt: "asc" },
          { createdAt: "asc" },
        ],
        take: 50,
      })
    )

    const results = await Promise.all(stageQueries)

    const stages: Record<string, any[]> = {}
    const counts: Record<string, number> = {}

    LEAD_STAGES.forEach((stage, i) => {
      stages[stage] = results[i]
      counts[stage] = results[i].length
    })

    return apiSuccess({ stages, counts })
  } catch (error: any) {
    return apiError(error.message, error.message === "Unauthorized" ? 401 : 500)
  }
}
