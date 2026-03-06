import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getSessionUser, apiError } from "@/lib/auth-utils"

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return apiError("Unauthorized", 401)

  const body = await req.json()

  if (body.all) {
    await prisma.notification.updateMany({
      where: { userId: user.id, orgId: user.orgId, readAt: null },
      data: { readAt: new Date() },
    })
    return NextResponse.json({ success: true })
  }

  if (body.id) {
    await prisma.notification.updateMany({
      where: { id: body.id, userId: user.id, orgId: user.orgId },
      data: { readAt: new Date() },
    })
    return NextResponse.json({ success: true })
  }

  return apiError("Provide 'id' or 'all: true'")
}
