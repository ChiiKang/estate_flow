import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireRole, apiError, apiSuccess } from "@/lib/auth-utils"
import { generateApiKey } from "@/lib/webhook-auth"

export async function GET() {
  try {
    const user = await requireRole("ADMIN")

    const keys = await prisma.apiKey.findMany({
      where: { orgId: user.orgId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        source: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return apiSuccess(keys)
  } catch (error: any) {
    if (error.message === "Unauthorized") return apiError("Unauthorized", 401)
    if (error.message === "Forbidden") return apiError("Forbidden", 403)
    return apiError(error.message, 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("ADMIN")
    const body = await req.json()

    if (!body.name?.trim()) {
      return apiError("Key name is required")
    }

    const { raw, prefix, hash } = generateApiKey()

    const key = await prisma.apiKey.create({
      data: {
        orgId: user.orgId,
        name: body.name.trim(),
        keyPrefix: prefix,
        keyHash: hash,
        source: body.source?.trim() || null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
    })

    return apiSuccess(
      {
        id: key.id,
        name: key.name,
        keyPrefix: key.keyPrefix,
        source: key.source,
        rawKey: raw,
        createdAt: key.createdAt,
      },
      201
    )
  } catch (error: any) {
    if (error.message === "Unauthorized") return apiError("Unauthorized", 401)
    if (error.message === "Forbidden") return apiError("Forbidden", 403)
    return apiError(error.message, 500)
  }
}
