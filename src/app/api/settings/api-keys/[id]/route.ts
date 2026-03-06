import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireRole, apiError, apiSuccess } from "@/lib/auth-utils"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("ADMIN")
    const { id } = await params

    const key = await prisma.apiKey.findFirst({
      where: { id, orgId: user.orgId },
    })

    if (!key) return apiError("API key not found", 404)
    if (key.revokedAt) return apiError("API key already revoked")

    await prisma.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    })

    return apiSuccess({ message: "API key revoked" })
  } catch (error: any) {
    if (error.message === "Unauthorized") return apiError("Unauthorized", 401)
    if (error.message === "Forbidden") return apiError("Forbidden", 403)
    return apiError(error.message, 500)
  }
}
