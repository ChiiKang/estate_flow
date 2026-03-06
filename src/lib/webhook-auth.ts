import crypto from "crypto"
import prisma from "./db"

const KEY_PREFIX = "ef_"
const KEY_LENGTH = 40 // hex chars after prefix

export function generateApiKey(): { raw: string; prefix: string; hash: string } {
  const bytes = crypto.randomBytes(KEY_LENGTH / 2)
  const raw = KEY_PREFIX + bytes.toString("hex")
  const prefix = raw.slice(0, 11) // "ef_" + first 8 hex chars
  const hash = hashApiKey(raw)
  return { raw, prefix, hash }
}

export function hashApiKey(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex")
}

export async function validateApiKey(
  raw: string
): Promise<{ orgId: string; keyId: string; source: string | null } | null> {
  const hash = hashApiKey(raw)

  const key = await prisma.apiKey.findFirst({
    where: {
      keyHash: hash,
      revokedAt: null,
    },
  })

  if (!key) return null

  // Check expiration
  if (key.expiresAt && key.expiresAt < new Date()) return null

  // Update lastUsedAt async (fire-and-forget)
  prisma.apiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {})

  return { orgId: key.orgId, keyId: key.id, source: key.source }
}
