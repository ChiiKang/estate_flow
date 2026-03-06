import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getSessionUser, apiError } from "@/lib/auth-utils"

export async function GET() {
  const user = await getSessionUser()
  if (!user) return apiError("Unauthorized", 401)

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id, orgId: user.orgId },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.notification.count({
      where: { userId: user.id, orgId: user.orgId, readAt: null },
    }),
  ])

  return NextResponse.json({ notifications, unreadCount })
}
