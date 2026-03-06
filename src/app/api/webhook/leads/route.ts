import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { validateApiKey } from "@/lib/webhook-auth"
import { normalizePhone } from "@/lib/phone"
import { logActivity } from "@/lib/activity-logger"

function extractField(body: Record<string, any>, ...keys: string[]): string | null {
  for (const key of keys) {
    if (body[key] && typeof body[key] === "string" && body[key].trim()) {
      return body[key].trim()
    }
  }
  return null
}

function extractName(body: Record<string, any>): string | null {
  const name = extractField(body, "name", "full_name")
  if (name) return name

  const first = extractField(body, "first_name")
  const last = extractField(body, "last_name")
  if (first && last) return `${first} ${last}`
  if (first) return first
  return null
}

export async function POST(req: NextRequest) {
  try {
    // Auth: read API key from header
    const authHeader = req.headers.get("authorization")
    const apiKeyHeader = req.headers.get("x-api-key")

    let rawKey: string | null = null
    if (authHeader?.startsWith("Bearer ")) {
      rawKey = authHeader.slice(7)
    } else if (apiKeyHeader) {
      rawKey = apiKeyHeader
    }

    if (!rawKey) {
      return NextResponse.json(
        { error: "Missing API key. Use Authorization: Bearer <key> or x-api-key header." },
        { status: 401 }
      )
    }

    const keyData = await validateApiKey(rawKey)
    if (!keyData) {
      return NextResponse.json(
        { error: "Invalid or revoked API key" },
        { status: 401 }
      )
    }

    const body = await req.json()

    // Smart field mapping
    const name = extractName(body)
    const phone = extractField(body, "phone", "phone_number", "mobile", "tel")
    const email = extractField(body, "email", "email_address")
    const source = extractField(body, "source", "utm_source", "lead_source") || keyData.source || "Webhook"
    const campaign = extractField(body, "campaign", "utm_campaign", "campaign_name")
    const notes = extractField(body, "notes", "message", "comments")
    const projectName = extractField(body, "project", "project_name")

    // Validation
    if (!name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 422 }
      )
    }
    if (!phone && !email) {
      return NextResponse.json(
        { error: "At least one of phone or email is required" },
        { status: 422 }
      )
    }

    // Normalize phone
    const phoneData = phone
      ? normalizePhone(phone)
      : { phoneRaw: null, phoneE164: null }

    // Resolve project by name (case-insensitive)
    let projectId: string | null = null
    if (projectName) {
      const project = await prisma.project.findFirst({
        where: {
          orgId: keyData.orgId,
          name: { equals: projectName, mode: "insensitive" },
          deletedAt: null,
        },
        select: { id: true },
      })
      if (project) projectId = project.id
    }

    // Dedupe check — return 200 for duplicates (webhook sources retry on non-2xx)
    if (phoneData.phoneE164) {
      const existing = await prisma.lead.findFirst({
        where: { orgId: keyData.orgId, phoneE164: phoneData.phoneE164, deletedAt: null },
      })
      if (existing) {
        return NextResponse.json({
          status: "duplicate",
          leadId: existing.id,
          message: "Lead with this phone number already exists",
        })
      }
    }
    if (email) {
      const existing = await prisma.lead.findFirst({
        where: { orgId: keyData.orgId, email, deletedAt: null },
      })
      if (existing) {
        return NextResponse.json({
          status: "duplicate",
          leadId: existing.id,
          message: "Lead with this email already exists",
        })
      }
    }

    // Create lead
    const lead = await prisma.lead.create({
      data: {
        orgId: keyData.orgId,
        name,
        phoneRaw: phoneData.phoneRaw,
        phoneE164: phoneData.phoneE164,
        email,
        source,
        campaign,
        notes,
        projectId,
        stage: "NEW",
        priority: 0,
      },
    })

    // Log activity (no actorUserId — webhook ingestion)
    await logActivity({
      orgId: keyData.orgId,
      entityType: "LEAD",
      entityId: lead.id,
      type: "CREATED",
      data: { via: "webhook", apiKeyId: keyData.keyId, source },
    })

    return NextResponse.json(
      { status: "created", leadId: lead.id },
      { status: 201 }
    )
  } catch (error: any) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }
    console.error("Webhook lead ingestion error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
