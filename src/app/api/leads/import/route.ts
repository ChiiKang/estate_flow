import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireAuth, apiError, apiSuccess } from "@/lib/auth-utils"
import { normalizePhone } from "@/lib/phone"

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  for (const line of lines) {
    const row: string[] = []
    let current = ""
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (inQuotes) {
        if (char === '"' && line[i + 1] === '"') {
          current += '"'
          i++
        } else if (char === '"') {
          inQuotes = false
        } else {
          current += char
        }
      } else {
        if (char === '"') {
          inQuotes = true
        } else if (char === ",") {
          row.push(current.trim())
          current = ""
        } else {
          current += char
        }
      }
    }
    row.push(current.trim())
    rows.push(row)
  }
  return rows
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) return apiError("No file provided", 400)

    const text = await file.text()
    const rows = parseCSV(text)

    if (rows.length < 2) return apiError("CSV must have a header row and at least one data row", 400)

    const headers = rows[0].map((h) => h.toLowerCase().trim())
    const nameIdx = headers.findIndex((h) => h === "name")
    const phoneIdx = headers.findIndex((h) => h.includes("phone"))
    const emailIdx = headers.findIndex((h) => h === "email")
    const sourceIdx = headers.findIndex((h) => h === "source")

    if (nameIdx === -1) return apiError("CSV must have a 'Name' column", 400)

    const created: string[] = []
    const skipped: { row: number; reason: string }[] = []

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      const name = row[nameIdx]?.trim()
      if (!name) {
        skipped.push({ row: i + 1, reason: "Missing name" })
        continue
      }

      const rawPhone = phoneIdx >= 0 ? row[phoneIdx]?.trim() : null
      const email = emailIdx >= 0 ? row[emailIdx]?.trim() : null
      const source = sourceIdx >= 0 ? row[sourceIdx]?.trim() : null

      const phone = rawPhone ? normalizePhone(rawPhone) : { phoneRaw: null, phoneE164: null }

      // Dedup by phone
      if (phone.phoneE164) {
        const existing = await prisma.lead.findFirst({
          where: { orgId: user.orgId, phoneE164: phone.phoneE164, deletedAt: null },
        })
        if (existing) {
          skipped.push({ row: i + 1, reason: `Duplicate phone: ${phone.phoneE164}` })
          continue
        }
      }

      // Dedup by email
      if (email) {
        const existing = await prisma.lead.findFirst({
          where: { orgId: user.orgId, email, deletedAt: null },
        })
        if (existing) {
          skipped.push({ row: i + 1, reason: `Duplicate email: ${email}` })
          continue
        }
      }

      await prisma.lead.create({
        data: {
          orgId: user.orgId,
          name,
          phoneRaw: phone.phoneRaw,
          phoneE164: phone.phoneE164,
          email: email || null,
          source: source || null,
          stage: "NEW",
          priority: 0,
        },
      })
      created.push(name)
    }

    return apiSuccess({
      imported: created.length,
      skipped: skipped.length,
      errors: skipped,
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") return apiError("Unauthorized", 401)
    return apiError(error.message, 500)
  }
}
