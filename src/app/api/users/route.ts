import prisma from "@/lib/db"
import { requireAuth, apiError, apiSuccess } from "@/lib/auth-utils"

export async function GET() {
  try {
    const user = await requireAuth()

    const users = await prisma.user.findMany({
      where: { orgId: user.orgId, isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    })

    return apiSuccess(users)
  } catch (error: any) {
    return apiError(error.message, error.message === "Unauthorized" ? 401 : 500)
  }
}
