import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireAuth, apiError, apiSuccess } from "@/lib/auth-utils"
import { normalizePhone } from "@/lib/phone"
import { logActivity } from "@/lib/activity-logger"

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)

    const stage = searchParams.get("stage")
    const ownerUserId = searchParams.get("ownerUserId")
    const source = searchParams.get("source")
    const projectId = searchParams.get("projectId")
    const search = searchParams.get("search")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")

    const where: any = { orgId: user.orgId, deletedAt: null }
    if (stage) where.stage = stage
    if (ownerUserId) where.ownerUserId = ownerUserId
    if (source) where.source = source
    if (projectId) where.projectId = projectId
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phoneRaw: { contains: search } },
      ]
    }

    // Agents only see their own leads
    if (user.role === "AGENT") {
      where.ownerUserId = user.id
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          owner: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.lead.count({ where }),
    ])

    return apiSuccess({ leads, total, page, limit })
  } catch (error: any) {
    return apiError(error.message, error.message === "Unauthorized" ? 401 : 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const phone = body.phone ? normalizePhone(body.phone) : { phoneRaw: null, phoneE164: null }

    // Dedupe check
    if (phone.phoneE164) {
      const existing = await prisma.lead.findFirst({
        where: { orgId: user.orgId, phoneE164: phone.phoneE164, deletedAt: null },
      })
      if (existing) return apiError("Lead with this phone number already exists", 409)
    }
    if (body.email) {
      const existing = await prisma.lead.findFirst({
        where: { orgId: user.orgId, email: body.email, deletedAt: null },
      })
      if (existing) return apiError("Lead with this email already exists", 409)
    }

    const lead = await prisma.lead.create({
      data: {
        orgId: user.orgId,
        name: body.name,
        phoneRaw: phone.phoneRaw,
        phoneE164: phone.phoneE164,
        email: body.email || null,
        source: body.source || null,
        campaign: body.campaign || null,
        projectId: body.projectId || null,
        ownerUserId: body.ownerUserId || null,
        stage: "NEW",
        priority: body.priority || 0,
        notes: body.notes || null,
        tags: body.tags || null,
      },
    })

    await logActivity({
      orgId: user.orgId,
      entityType: "LEAD",
      entityId: lead.id,
      type: "CREATED",
      actorUserId: user.id,
    })

    return apiSuccess(lead, 201)
  } catch (error: any) {
    if (error.message === "Unauthorized") return apiError("Unauthorized", 401)
    return apiError(error.message, 500)
  }
}
