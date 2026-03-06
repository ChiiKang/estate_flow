"use client"

import { useEffect, useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  MessageCircle,
  Phone,
  Mail,
  Clock,
  AlertTriangle,
  ChevronRight,
  User,
  Building2,
  Calendar,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { PipelineLead } from "./pipeline-card"

const PIPELINE_STAGES = [
  { key: "NEW", label: "New" },
  { key: "CONTACTED", label: "Contacted" },
  { key: "QUALIFIED", label: "Qualified" },
  { key: "SITE_VISIT", label: "Site Visit" },
  { key: "UNIT_SELECTED", label: "Unit Selected" },
  { key: "RESERVED", label: "Reserved" },
  { key: "BOOKED", label: "Booked" },
  { key: "SPA_SIGNED", label: "SPA Signed" },
  { key: "LOAN_SUBMITTED", label: "Loan Submitted" },
  { key: "LOAN_APPROVED", label: "Loan Approved" },
  { key: "SOLD", label: "Sold" },
]

type Activity = {
  id: string
  type: string
  createdAt: string
  data: Record<string, unknown> | null
  actor: { id: string; name: string } | null
}

interface PipelineDetailSheetProps {
  lead: PipelineLead | null
  open: boolean
  onClose: () => void
  onStageChange: (lead: PipelineLead, newStage: string) => Promise<void>
  isChangingStage?: boolean
}

function formatActivityType(type: string): string {
  const map: Record<string, string> = {
    STAGE_CHANGE: "Stage changed",
    NOTE: "Note added",
    TASK_CREATED: "Task created",
    TASK_COMPLETED: "Task completed",
    MSG_LOGGED: "Message logged",
    CREATED: "Lead created",
    UPDATED: "Lead updated",
    ASSIGNMENT_CHANGE: "Assignment changed",
  }
  return map[type] ?? type.replace(/_/g, " ").toLowerCase()
}

function formatActivityDetail(type: string, data: Record<string, unknown> | null): string {
  if (!data) return ""
  if (type === "STAGE_CHANGE") {
    const from = PIPELINE_STAGES.find((s) => s.key === data.from)?.label ?? data.from
    const to = PIPELINE_STAGES.find((s) => s.key === data.to)?.label ?? data.to
    return `${from} → ${to}`
  }
  if (type === "NOTE" && data.text) return String(data.text)
  if (type === "ASSIGNMENT_CHANGE") return "Agent changed"
  return ""
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return "yesterday"
  if (days < 7) return `${days} days ago`
  return date.toLocaleDateString("en-MY", { day: "numeric", month: "short" })
}

function priorityLabel(priority: number): string {
  if (priority >= 2) return "High"
  if (priority === 1) return "Medium"
  return "Low"
}

function priorityBadgeClass(priority: number): string {
  if (priority >= 2) return "bg-red-50 text-red-700 border-red-200"
  if (priority === 1) return "bg-yellow-50 text-yellow-700 border-yellow-200"
  return "bg-green-50 text-green-700 border-green-200"
}

export function PipelineDetailSheet({
  lead,
  open,
  onClose,
  onStageChange,
  isChangingStage = false,
}: PipelineDetailSheetProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loadingActivities, setLoadingActivities] = useState(false)
  const [selectedStage, setSelectedStage] = useState<string>("")
  const [stageError, setStageError] = useState<string>("")

  const currentStageIdx = PIPELINE_STAGES.findIndex((s) => s.key === lead?.stage)
  const progressPercent =
    currentStageIdx >= 0
      ? Math.round(((currentStageIdx + 1) / PIPELINE_STAGES.length) * 100)
      : 0

  useEffect(() => {
    if (lead && open) {
      setSelectedStage(lead.stage)
      setStageError("")
      fetchActivities(lead.id)
    }
  }, [lead?.id, open])

  async function fetchActivities(leadId: string) {
    setLoadingActivities(true)
    try {
      const res = await fetch(
        `/api/activities?entityType=LEAD&entityId=${leadId}&limit=30`
      )
      if (res.ok) {
        const data = await res.json()
        setActivities(data.activities ?? [])
      }
    } catch {
      // non-critical, ignore
    } finally {
      setLoadingActivities(false)
    }
  }

  async function handleStageChange() {
    if (!lead || selectedStage === lead.stage) return
    setStageError("")
    try {
      await onStageChange(lead, selectedStage)
      // Refresh activities after stage change
      await fetchActivities(lead.id)
    } catch (err: any) {
      setStageError(err.message ?? "Failed to update stage")
    }
  }

  if (!lead) return null

  const whatsappNumber = lead.phoneE164
    ? lead.phoneE164.replace(/\D/g, "")
    : lead.phoneRaw?.replace(/\D/g, "") ?? ""

  const currentStage = PIPELINE_STAGES.find((s) => s.key === lead.stage)

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="text-lg font-bold text-foreground truncate">
                {lead.name}
              </SheetTitle>
              {lead.project && (
                <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {lead.project.name}
                </p>
              )}
            </div>
            <Badge
              variant="outline"
              className={cn("shrink-0 text-xs", priorityBadgeClass(lead.priority))}
            >
              {priorityLabel(lead.priority)} Priority
            </Badge>
          </div>

          {/* Stage progress bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-foreground">
                {currentStage?.label ?? lead.stage}
              </span>
              <span className="text-xs text-muted-foreground">
                {currentStageIdx + 1} / {PIPELINE_STAGES.length}
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-sage-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">New</span>
              <span className="text-[10px] text-muted-foreground">Sold</span>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-4 space-y-5">
            {/* Contact info */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Contact
              </h3>
              <div className="space-y-1.5">
                {lead.phoneRaw && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <a
                      href={`tel:${lead.phoneE164 ?? lead.phoneRaw}`}
                      className="text-primary hover:underline"
                    >
                      {lead.phoneRaw}
                    </a>
                  </div>
                )}
                {lead.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <a
                      href={`mailto:${lead.email}`}
                      className="text-primary hover:underline truncate"
                    >
                      {lead.email}
                    </a>
                  </div>
                )}
                {lead.owner && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-foreground">{lead.owner.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">
                    Added {formatRelativeTime(lead.createdAt)}
                  </span>
                </div>
                {lead.lastContactedAt && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">
                      Last contact {formatRelativeTime(lead.lastContactedAt)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick actions */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Quick Actions
              </h3>
              <div className="flex gap-2 flex-wrap">
                {whatsappNumber && (
                  <a
                    href={`https://wa.me/${whatsappNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 border-green-200 text-green-700 hover:bg-green-50"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      WhatsApp
                    </Button>
                  </a>
                )}
                {lead.phoneRaw && (
                  <a href={`tel:${lead.phoneE164 ?? lead.phoneRaw}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      Call
                    </Button>
                  </a>
                )}
                <a href={`/leads?highlight=${lead.id}`}>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    View Full Profile
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </a>
              </div>
            </div>

            {/* Change stage */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Change Stage
              </h3>
              <div className="flex gap-2 items-start">
                <Select
                  value={selectedStage}
                  onValueChange={(v) => {
                    setSelectedStage(v)
                    setStageError("")
                  }}
                >
                  <SelectTrigger className="flex-1 h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PIPELINE_STAGES.map((s) => (
                      <SelectItem key={s.key} value={s.key}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="h-9 bg-sage-600 hover:bg-sage-700 text-white shrink-0"
                  onClick={handleStageChange}
                  disabled={
                    isChangingStage ||
                    selectedStage === lead.stage ||
                    !selectedStage
                  }
                >
                  {isChangingStage ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    "Move"
                  )}
                </Button>
              </div>
              {stageError && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {stageError}
                </p>
              )}
            </div>

            {/* Activity timeline */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Activity Timeline
              </h3>

              {loadingActivities ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Loading...
                </div>
              ) : activities.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No activity yet.
                </p>
              ) : (
                <div className="space-y-0">
                  {activities.map((activity, idx) => (
                    <div key={activity.id} className="flex gap-3">
                      {/* Timeline spine */}
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-sage-400 mt-1.5 shrink-0" />
                        {idx < activities.length - 1 && (
                          <div className="w-px flex-1 bg-border min-h-[16px]" />
                        )}
                      </div>
                      <div className="pb-3 min-w-0">
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <span className="text-xs font-medium text-foreground">
                            {formatActivityType(activity.type)}
                          </span>
                          {activity.actor && (
                            <span className="text-xs text-muted-foreground">
                              by {activity.actor.name}
                            </span>
                          )}
                        </div>
                        {activity.data &&
                          formatActivityDetail(activity.type, activity.data as Record<string, unknown>) && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatActivityDetail(activity.type, activity.data as Record<string, unknown>)}
                            </p>
                          )}
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                          {formatRelativeTime(activity.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
