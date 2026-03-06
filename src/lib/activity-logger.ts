import prisma from "./db"
import { ActivityEntityType, ActivityType, Prisma } from "@prisma/client"
import { notifyRelevantUsers } from "./notifications"

const NOTIFIABLE_TYPES: Set<string> = new Set([
  "TASK_CREATED",
  "ASSIGNMENT_CHANGE",
  "LOCK_CREATED",
  "STAGE_CHANGE",
  "PAYMENT_SUBMITTED",
  "CREATED",
])

type LogActivityParams = {
  orgId: string
  entityType: ActivityEntityType
  entityId: string
  type: ActivityType
  actorUserId?: string
  data?: Record<string, unknown>
}

export async function logActivity(params: LogActivityParams) {
  const activity = await prisma.activity.create({
    data: {
      orgId: params.orgId,
      entityType: params.entityType,
      entityId: params.entityId,
      type: params.type,
      actorUserId: params.actorUserId,
      data: params.data as Prisma.InputJsonValue | undefined,
    },
  })

  if (NOTIFIABLE_TYPES.has(params.type)) {
    const entityLabel = params.entityType.toLowerCase()
    const link = `/${entityLabel}s/${params.entityId}`
    const title = buildNotificationTitle(params.type, entityLabel, params.data)

    notifyRelevantUsers({
      orgId: params.orgId,
      excludeUserId: params.actorUserId,
      type: params.type,
      title,
      body: params.data?.description as string | undefined,
      link,
    }).catch(() => {})
  }

  return activity
}

function buildNotificationTitle(
  type: string,
  entityLabel: string,
  data?: Record<string, unknown>
): string {
  const name = (data?.name as string) || entityLabel
  switch (type) {
    case "TASK_CREATED":
      return `New task created: ${name}`
    case "ASSIGNMENT_CHANGE":
      return `Assignment changed on ${entityLabel}`
    case "LOCK_CREATED":
      return `Unit locked: ${name}`
    case "STAGE_CHANGE":
      return `Stage changed to ${(data?.to as string) || "new stage"}`
    case "PAYMENT_SUBMITTED":
      return `Payment submitted for ${entityLabel}`
    case "CREATED":
      return `New ${entityLabel} created: ${name}`
    default:
      return `${type} on ${entityLabel}`
  }
}
