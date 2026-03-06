import { auth } from "./auth"
import { Role } from "@prisma/client"
import { NextResponse } from "next/server"

export type SessionUser = {
  id: string
  email: string
  name: string
  role: Role
  orgId: string
  orgName: string
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth()
  if (!session?.user) return null
  return session.user as unknown as SessionUser
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) throw new Error("Unauthorized")
  return user
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireAuth()
  if (!roles.includes(user.role)) {
    throw new Error("Forbidden")
  }
  return user
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}
