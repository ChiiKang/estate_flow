import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireAuth, apiError, apiSuccess } from "@/lib/auth-utils"

export async function GET() {
  try {
    const user = await requireAuth()

    const favorites = await prisma.userFavorite.findMany({
      where: { userId: user.id },
      select: { unitId: true },
    })

    return apiSuccess(favorites.map((f) => f.unitId))
  } catch (error: any) {
    return apiError(error.message, error.message === "Unauthorized" ? 401 : 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const { unitId } = body

    if (!unitId) return apiError("unitId required", 400)

    const existing = await prisma.userFavorite.findUnique({
      where: { userId_unitId: { userId: user.id, unitId } },
    })

    if (existing) {
      await prisma.userFavorite.delete({ where: { id: existing.id } })
      return apiSuccess({ favorited: false })
    } else {
      await prisma.userFavorite.create({
        data: { userId: user.id, unitId },
      })
      return apiSuccess({ favorited: true })
    }
  } catch (error: any) {
    if (error.message === "Unauthorized") return apiError("Unauthorized", 401)
    return apiError(error.message, 500)
  }
}
