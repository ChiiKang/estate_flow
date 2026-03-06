import { NextRequest } from "next/server"
import { signIn } from "@/lib/auth"
import { apiError, apiSuccess } from "@/lib/auth-utils"

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return apiError("Email and password are required", 400)
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    return apiSuccess({ success: true })
  } catch (error: any) {
    return apiError("Invalid credentials", 401)
  }
}
