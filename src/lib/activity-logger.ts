import prisma from "./db"
import { ActivityEntityType, ActivityType, Prisma } from "@prisma/client"

type LogActivityParams = {
  orgId: string
  entityType: ActivityEntityType
  entityId: string
  type: ActivityType
  actorUserId?: string
  data?: Record<string, unknown>
}

export async function logActivity(params: LogActivityParams) {
  return prisma.activity.create({
    data: {
      orgId: params.orgId,
      entityType: params.entityType,
      entityId: params.entityId,
      type: params.type,
      actorUserId: params.actorUserId,
      data: params.data as Prisma.InputJsonValue | undefined,
    },
  })
}
