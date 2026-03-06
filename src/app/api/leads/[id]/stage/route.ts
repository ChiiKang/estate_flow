import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireAuth, apiError, apiSuccess } from "@/lib/auth-utils"
import { logActivity } from "@/lib/activity-logger"

const STAGE_ORDER = [
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

type LeadStage = (typeof STAGE_ORDER)[number]

function isValidStageTransition(
  from: LeadStage,
  to: string,
  isManager: boolean
): boolean {
  const fromIdx = STAGE_ORDER.indexOf(from)
  const toIdx = STAGE_ORDER.indexOf(to as LeadStage)

  if (fromIdx === -1 || toIdx === -1) return false

  if (isManager) {
    // Managers can move forward or backward (no skipping backward restriction)
    return true
  }

  // Agents can only move forward (next stage only)
  return toIdx === fromIdx + 1
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await req.json()

    if (!body.stage) {
      return apiError("stage is required", 400)
    }

    if (!STAGE_ORDER.includes(body.stage as LeadStage)) {
      return apiError(`Invalid stage: ${body.stage}`, 400)
    }

    const lead = await prisma.lead.findFirst({
      where: { id, orgId: user.orgId, deletedAt: null },
    })

    if (!lead) return apiError("Lead not found", 404)

    const isManager = user.role === "ADMIN" || user.role === "MANAGER"

    // Agents can only update their own leads
    if (user.role === "AGENT" && lead.ownerUserId !== user.id) {
      return apiError("Forbidden: you can only update your own leads", 403)
    }

    const currentStage = lead.stage as LeadStage
    const newStage = body.stage as LeadStage

    if (currentStage === newStage) {
      return apiError("Lead is already in that stage", 400)
    }

    if (!isValidStageTransition(currentStage, newStage, isManager)) {
      return apiError(
        `Invalid stage transition from ${currentStage} to ${newStage}. Agents can only advance one stage at a time.`,
        400
      )
    }

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: {
        stage: newStage,
        lastContactedAt: new Date(),
      },
      include: {
        owner: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    })

    await logActivity({
      orgId: user.orgId,
      entityType: "LEAD",
      entityId: id,
      type: "STAGE_CHANGE",
      actorUserId: user.id,
      data: { from: currentStage, to: newStage },
    })

    return apiSuccess(updatedLead)
  } catch (error: any) {
    if (error.message === "Unauthorized") return apiError("Unauthorized", 401)
    return apiError(error.message, 500)
  }
}
