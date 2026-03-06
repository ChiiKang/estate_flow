import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireAuth, apiError, apiSuccess } from "@/lib/auth-utils"
import { normalizePhone } from "@/lib/phone"
import { logActivity } from "@/lib/activity-logger"

type LeadRow = {
  name?: unknown
  phone?: unknown
  email?: unknown
  source?: unknown
  notes?: unknown
}

function parseString(value: unknown): string | null {
  if (value === undefined || value === null) return null
  const str = String(value).trim()
  return str.length > 0 ? str : null
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()

    const body = await req.json()
    const { projectId, rows } = body as { projectId?: string; rows?: LeadRow[] }

    if (!Array.isArray(rows) || rows.length === 0) {
      return apiError("rows array is required and must not be empty", 400)
    }

    // If projectId provided, verify it belongs to org
    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, orgId: user.orgId, deletedAt: null },
      })
      if (!project) return apiError("Project not found", 404)
    }

    let imported = 0
    let duplicates = 0
    const errors: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowLabel = `Row ${i + 1}`

      const name = parseString(row.name)
      if (!name) {
        errors.push(`${rowLabel}: Name is required — skipped`)
        continue
      }

      const rawPhone = parseString(row.phone)
      const email = parseString(row.email)?.toLowerCase() ?? null
      const source = parseString(row.source)
      const notes = parseString(row.notes)

      const phone = rawPhone
        ? normalizePhone(rawPhone, "MY")
        : { phoneRaw: null, phoneE164: null }

      // Dedup by phone_e164 within org
      if (phone.phoneE164) {
        const existingByPhone = await prisma.lead.findFirst({
          where: { orgId: user.orgId, phoneE164: phone.phoneE164, deletedAt: null },
        })
        if (existingByPhone) {
          errors.push(
            `${rowLabel}: Duplicate phone ${phone.phoneE164} (${name}) — skipped`
          )
          duplicates++
          continue
        }
      }

      // Dedup by email within org
      if (email) {
        const existingByEmail = await prisma.lead.findFirst({
          where: { orgId: user.orgId, email, deletedAt: null },
        })
        if (existingByEmail) {
          errors.push(`${rowLabel}: Duplicate email ${email} (${name}) — skipped`)
          duplicates++
          continue
        }
      }

      try {
        const created = await prisma.lead.create({
          data: {
            orgId: user.orgId,
            projectId: projectId ?? null,
            name,
            phoneRaw: phone.phoneRaw,
            phoneE164: phone.phoneE164,
            email,
            source,
            notes,
            stage: "NEW",
            priority: 0,
          },
        })

        // Log activity
        await logActivity({
          orgId: user.orgId,
          entityType: "LEAD",
          entityId: created.id,
          type: "CREATED",
          actorUserId: user.id,
          data: { source: "excel_import", name },
        })

        imported++
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error"
        errors.push(`${rowLabel}: Failed to create lead "${name}" — ${msg}`)
      }
    }

    return apiSuccess({ imported, duplicates, errors }, 201)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal server error"
    if (msg === "Unauthorized") return apiError("Unauthorized", 401)
    return apiError(msg, 500)
  }
}
