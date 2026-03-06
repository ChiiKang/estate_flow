import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireAuth, apiError, apiSuccess } from "@/lib/auth-utils"

export async function GET() {
  try {
    const user = await requireAuth()
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, name: true, email: true, role: true },
    })
    return apiSuccess(profile)
  } catch (error: any) {
    return apiError(error.message, error.message === "Unauthorized" ? 401 : 500)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const data: any = {}
    if (body.name !== undefined) data.name = body.name

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
      select: { id: true, name: true, email: true, role: true },
    })

    return apiSuccess(updated)
  } catch (error: any) {
    if (error.message === "Unauthorized") return apiError("Unauthorized", 401)
    return apiError(error.message, 500)
  }
}
