import { Role } from "@prisma/client"
import "next-auth"

declare module "next-auth" {
  interface User {
    role?: Role
    orgId?: string
    orgName?: string
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: Role
      orgId: string
      orgName: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: Role
    orgId: string
    orgName: string
  }
}
