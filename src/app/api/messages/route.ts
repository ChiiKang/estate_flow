import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireAuth, apiError, apiSuccess } from "@/lib/auth-utils"
import { logActivity } from "@/lib/activity-logger"

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get("limit") || "50")
    const page = parseInt(searchParams.get("page") || "1")

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { orgId: user.orgId },
        include: {
          lead: { select: { id: true, name: true, phoneE164: true } },
          template: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.message.count({ where: { orgId: user.orgId } }),
    ])

    return apiSuccess({ messages, total, page, limit })
  } catch (error: any) {
    return apiError(error.message, error.message === "Unauthorized" ? 401 : 500)
  }
}

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
        toPhoneE164: body.toPhoneE164 || body.toPhone || null,
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
        data: {
          channel: body.channel || "WHATSAPP",
          direction: body.direction || "OUTBOUND",
          messageId: message.id,
          preview: body.content?.slice(0, 100),
        },
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
