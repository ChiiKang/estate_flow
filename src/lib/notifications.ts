import prisma from "./db"

type CreateNotificationParams = {
  orgId: string
  userId: string
  type: string
  title: string
  body?: string
  link?: string
}

export async function createNotification(params: CreateNotificationParams) {
  return prisma.notification.create({
    data: {
      orgId: params.orgId,
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      link: params.link,
    },
  })
}

type NotifyRelevantUsersParams = {
  orgId: string
  excludeUserId?: string
  type: string
  title: string
  body?: string
  link?: string
}

export async function notifyRelevantUsers(params: NotifyRelevantUsersParams) {
  const users = await prisma.user.findMany({
    where: {
      orgId: params.orgId,
      isActive: true,
      role: { in: ["ADMIN", "MANAGER"] },
      ...(params.excludeUserId ? { id: { not: params.excludeUserId } } : {}),
    },
    select: { id: true },
  })

  if (users.length === 0) return

  await prisma.notification.createMany({
    data: users.map((u) => ({
      orgId: params.orgId,
      userId: u.id,
      type: params.type,
      title: params.title,
      body: params.body,
      link: params.link,
    })),
  })
}
