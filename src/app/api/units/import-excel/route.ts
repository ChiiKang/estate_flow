import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { requireRole, apiError, apiSuccess } from "@/lib/auth-utils"
import { logActivity } from "@/lib/activity-logger"

type UnitRow = {
  unitNo?: unknown
  tower?: unknown
  floor?: unknown
  unitType?: unknown
  sizeSqm?: unknown
  facing?: unknown
  basePrice?: unknown
  currentPrice?: unknown
  status?: unknown
}

const VALID_STATUSES = ["AVAILABLE", "RESERVED", "BOOKED", "SOLD", "CANCELLED"]

function parseDecimal(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null
  const str = String(value).replace(/[^0-9.]/g, "")
  const num = parseFloat(str)
  return isNaN(num) ? null : num
}

function parseString(value: unknown, fallback = ""): string {
  return value !== undefined && value !== null ? String(value).trim() : fallback
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("ADMIN", "MANAGER")

    const body = await req.json()
    const { projectId, rows } = body as { projectId?: string; rows?: UnitRow[] }

    if (!projectId) return apiError("projectId is required", 400)
    if (!Array.isArray(rows) || rows.length === 0) {
      return apiError("rows array is required and must not be empty", 400)
    }

    // Verify project belongs to org
    const project = await prisma.project.findFirst({
      where: { id: projectId, orgId: user.orgId, deletedAt: null },
    })
    if (!project) return apiError("Project not found", 404)

    let imported = 0
    let skipped = 0
    const errors: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowLabel = `Row ${i + 1}`

      const unitNo = parseString(row.unitNo)
      if (!unitNo) {
        errors.push(`${rowLabel}: Unit No is required`)
        skipped++
        continue
      }

      const tower = parseString(row.tower, "A")
      const floor = parseString(row.floor, "1")
      const unitType = parseString(row.unitType, "Standard")
      const facing = parseString(row.facing) || null

      const sizeSqmRaw = parseDecimal(row.sizeSqm)
      const basePriceRaw = parseDecimal(row.basePrice)
      const currentPriceRaw = parseDecimal(row.currentPrice)

      // Determine pricing: if only one price provided, use it for both
      const basePrice =
        basePriceRaw !== null
          ? basePriceRaw
          : currentPriceRaw !== null
          ? currentPriceRaw
          : 0
      const currentPrice =
        currentPriceRaw !== null
          ? currentPriceRaw
          : basePriceRaw !== null
          ? basePriceRaw
          : 0

      // Validate and normalise status
      let status: "AVAILABLE" | "RESERVED" | "BOOKED" | "SOLD" | "CANCELLED" =
        "AVAILABLE"
      if (row.status) {
        const statusUpper = String(row.status).toUpperCase().trim()
        if (!VALID_STATUSES.includes(statusUpper)) {
          errors.push(
            `${rowLabel}: Invalid status "${row.status}" — defaulting to AVAILABLE`
          )
          // Continue with default rather than skipping
        } else {
          status = statusUpper as typeof status
        }
      }

      // Check for duplicate within the project
      const existing = await prisma.unit.findFirst({
        where: { projectId, tower, floor, unitNo, deletedAt: null },
      })
      if (existing) {
        errors.push(`${rowLabel}: Duplicate unit ${tower}-${floor}-${unitNo} — skipped`)
        skipped++
        continue
      }

      try {
        const created = await prisma.unit.create({
          data: {
            orgId: user.orgId,
            projectId,
            tower,
            floor,
            unitNo,
            unitType,
            sizeSqm: sizeSqmRaw,
            facing,
            basePrice,
            currentPrice,
            status,
          },
        })

        // Log activity
        await logActivity({
          orgId: user.orgId,
          entityType: "UNIT",
          entityId: created.id,
          type: "CREATED",
          actorUserId: user.id,
          data: { source: "excel_import", unitNo, tower, floor },
        })

        imported++
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error"
        errors.push(`${rowLabel}: Failed to create unit — ${msg}`)
        skipped++
      }
    }

    return apiSuccess({ imported, skipped, errors }, 201)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal server error"
    if (msg === "Unauthorized") return apiError("Unauthorized", 401)
    if (msg === "Forbidden") return apiError("Forbidden", 403)
    return apiError(msg, 500)
  }
}
