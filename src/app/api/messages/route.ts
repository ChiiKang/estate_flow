import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireAuth, apiError, apiSuccess } from "@/lib/auth-utils"
import { logActivity } from "@/lib/activity-logger"

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const message = await prisma.message.create({
      data: {
        orgId: user.orgId,
        leadId: body.leadId || null,
        dealId: body.dealId || null,
        channel: body.channel || "WHATSAPP",
        direction: body.direction || "OUTBOUND",
        fromPhoneE164: body.fromPhone || null,
        toPhoneE164: body.toPhone || null,
        content: body.content,
        templateId: body.templateId || null,
        deliveryStatus: "SENT",
      },
    })

    // Log to lead timeline
    if (body.leadId) {
      await logActivity({
        orgId: user.orgId,
        entityType: "LEAD",
        entityId: body.leadId,
        type: "MSG_LOGGED",
        actorUserId: user.id,
        data: { channel: body.channel, direction: body.direction, messageId: message.id },
      })

      // Update last contacted
      await prisma.lead.update({
        where: { id: body.leadId },
        data: { lastContactedAt: new Date() },
      })
    }

    return apiSuccess(message, 201)
  } catch (error: any) {
    if (error.message === "Unauthorized") return apiError("Unauthorized", 401)
    return apiError(error.message, 500)
  }
}
