import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireRole, apiError, apiSuccess } from "@/lib/auth-utils"

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
    const user = await requireRole("ADMIN", "MANAGER")
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const projectId = formData.get("projectId") as string | null

    if (!file) return apiError("No file provided", 400)
    if (!projectId) return apiError("Project ID is required", 400)

    // Verify project belongs to org
    const project = await prisma.project.findFirst({
      where: { id: projectId, orgId: user.orgId },
    })
    if (!project) return apiError("Project not found", 404)

    const text = await file.text()
    const rows = parseCSV(text)

    if (rows.length < 2) return apiError("CSV must have a header row and at least one data row", 400)

    const headers = rows[0].map((h) => h.toLowerCase().trim())
    const unitNoIdx = headers.findIndex((h) => h.includes("unit"))
    const towerIdx = headers.findIndex((h) => h === "tower")
    const floorIdx = headers.findIndex((h) => h === "floor")
    const typeIdx = headers.findIndex((h) => h === "type")
    const sizeIdx = headers.findIndex((h) => h.includes("size"))
    const facingIdx = headers.findIndex((h) => h === "facing")
    const priceIdx = headers.findIndex((h) => h.includes("price"))

    if (unitNoIdx === -1) return apiError("CSV must have a 'Unit No' column", 400)

    const created: string[] = []
    const skipped: { row: number; reason: string }[] = []

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      const unitNo = row[unitNoIdx]?.trim()
      if (!unitNo) {
        skipped.push({ row: i + 1, reason: "Missing unit number" })
        continue
      }

      const tower = towerIdx >= 0 ? row[towerIdx]?.trim() || "A" : "A"
      const floor = floorIdx >= 0 ? row[floorIdx]?.trim() || "1" : "1"
      const unitType = typeIdx >= 0 ? row[typeIdx]?.trim() || "Standard" : "Standard"
      const sizeSqm = sizeIdx >= 0 ? parseFloat(row[sizeIdx]) || null : null
      const facing = facingIdx >= 0 ? row[facingIdx]?.trim() || null : null
      const price = priceIdx >= 0 ? parseFloat(row[priceIdx]?.replace(/[^0-9.]/g, "")) || 0 : 0

      // Check for duplicate unit within project
      const existing = await prisma.unit.findFirst({
        where: { projectId, tower, floor, unitNo },
      })
      if (existing) {
        skipped.push({ row: i + 1, reason: `Duplicate unit: ${tower}-${floor}-${unitNo}` })
        continue
      }

      await prisma.unit.create({
        data: {
          orgId: user.orgId,
          projectId,
          tower,
          floor,
          unitNo,
          unitType,
          sizeSqm,
          facing,
          basePrice: price,
          currentPrice: price,
          status: "AVAILABLE",
        },
      })
      created.push(unitNo)
    }

    return apiSuccess({
      imported: created.length,
      skipped: skipped.length,
      errors: skipped,
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") return apiError("Unauthorized", 401)
    if (error.message === "Forbidden") return apiError("Forbidden", 403)
    return apiError(error.message, 500)
  }
}
