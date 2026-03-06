import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireAuth, apiError, apiSuccess } from "@/lib/auth-utils"
import { logActivity } from "@/lib/activity-logger"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id: dealId } = await params

    const deal = await prisma.deal.findFirst({
      where: { id: dealId, orgId: user.orgId },
    })
    if (!deal) return apiError("Deal not found", 404)

    const payments = await prisma.payment.findMany({
      where: { dealId, orgId: user.orgId },
      orderBy: { createdAt: "desc" },
    })

    return apiSuccess(payments)
  } catch (error: any) {
    return apiError(error.message, error.message === "Unauthorized" ? 401 : 500)
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id: dealId } = await params
    const body = await req.json()

    const deal = await prisma.deal.findFirst({
      where: { id: dealId, orgId: user.orgId },
    })

    if (!deal) return apiError("Deal not found", 404)

    const payment = await prisma.payment.create({
      data: {
        orgId: user.orgId,
        dealId,
        type: body.type || "BOOKING_FEE",
        amount: body.amount,
        paidAt: body.paidAt ? new Date(body.paidAt) : null,
        referenceNo: body.referenceNo || null,
        receiptFileUrl: body.receiptFileUrl || null,
        status: "SUBMITTED",
      },
    })

    await logActivity({
      orgId: user.orgId,
      entityType: "DEAL",
      entityId: dealId,
      type: "PAYMENT_SUBMITTED",
      actorUserId: user.id,
      data: { paymentId: payment.id, amount: body.amount, type: body.type },
    })

    return apiSuccess(payment, 201)
  } catch (error: any) {
    if (error.message === "Unauthorized") return apiError("Unauthorized", 401)
    return apiError(error.message, 500)
  }
}
