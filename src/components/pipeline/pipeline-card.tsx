"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  MessageCircle,
  Phone,
  ChevronRight,
  AlertTriangle,
  Clock,
} from "lucide-react"

export type PipelineLead = {
  id: string
  name: string
  phoneRaw: string | null
  phoneE164: string | null
  email: string | null
  stage: string
  priority: number
  lastContactedAt: string | null
  createdAt: string
  owner: { id: string; name: string } | null
  project: { id: string; name: string } | null
}

interface PipelineCardProps {
  lead: PipelineLead
  isLastStage: boolean
  nextStageLabel: string
  onMoveNext: (lead: PipelineLead) => void
  onOpenDetail: (lead: PipelineLead) => void
  isMoving?: boolean
}

function timeInStage(
  createdAt: string,
  lastContactedAt: string | null
): string {
  const from = lastContactedAt
    ? new Date(lastContactedAt)
    : new Date(createdAt)
  const diff = Date.now() - from.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return "Today"
  if (days === 1) return "1 day"
  return `${days} days`
}

function isStale(lastContactedAt: string | null, createdAt: string): boolean {
  const ref = lastContactedAt ? new Date(lastContactedAt) : new Date(createdAt)
  const diff = Date.now() - ref.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  return days >= 7
}

function priorityConfig(priority: number) {
  if (priority >= 2)
    return { label: "High", dotClass: "bg-red-500", badgeClass: "bg-red-50 text-red-700 border-red-200" }
  if (priority === 1)
    return { label: "Medium", dotClass: "bg-yellow-500", badgeClass: "bg-yellow-50 text-yellow-700 border-yellow-200" }
  return { label: "Low", dotClass: "bg-green-500", badgeClass: "bg-green-50 text-green-700 border-green-200" }
}

export function PipelineCard({
  lead,
  isLastStage,
  nextStageLabel,
  onMoveNext,
  onOpenDetail,
  isMoving = false,
}: PipelineCardProps) {
  const stale = isStale(lead.lastContactedAt, lead.createdAt)
  const timeLabel = timeInStage(lead.createdAt, lead.lastContactedAt)
  const pConfig = priorityConfig(lead.priority)

  const initials = lead.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const whatsappNumber = lead.phoneE164
    ? lead.phoneE164.replace(/\D/g, "")
    : lead.phoneRaw?.replace(/\D/g, "") ?? ""

  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-tan-200 shadow-sm p-3 cursor-pointer",
        "hover:shadow-md hover:border-tan-300 transition-all duration-150",
        stale && "border-l-4 border-l-amber-400",
        isMoving && "opacity-60 pointer-events-none"
      )}
      onClick={() => onOpenDetail(lead)}
    >
      {/* Header row: name + priority dot */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn("w-2.5 h-2.5 rounded-full shrink-0 mt-0.5", pConfig.dotClass)}
            title={`${pConfig.label} priority`}
          />
          <span className="font-semibold text-sm text-foreground truncate">
            {lead.name}
          </span>
        </div>
        {stale && (
          <AlertTriangle
            className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5"
            aria-label="No activity in 7+ days"
          />
        )}
      </div>

      {/* Project name */}
      {lead.project && (
        <p className="text-xs text-muted-foreground mb-1.5 truncate">
          {lead.project.name}
        </p>
      )}

      {/* Agent */}
      {lead.owner && (
        <div className="flex items-center gap-1.5 mb-2">
          <Avatar className="w-4 h-4">
            <AvatarFallback className="text-[8px] bg-sage-100 text-sage-700">
              {lead.owner.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground truncate">
            {lead.owner.name}
          </span>
        </div>
      )}

      {/* Time in stage */}
      <div className="flex items-center gap-1 mb-3">
        <Clock className="w-3 h-3 text-muted-foreground" />
        <span
          className={cn(
            "text-xs",
            stale ? "text-amber-600 font-medium" : "text-muted-foreground"
          )}
        >
          {timeLabel}
          {stale && " — stale"}
        </span>
      </div>

      {/* Action buttons */}
      <div
        className="flex items-center gap-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* WhatsApp */}
        {whatsappNumber && (
          <a
            href={`https://wa.me/${whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center justify-center w-7 h-7 rounded-lg",
              "bg-green-50 hover:bg-green-100 text-green-600 transition-colors"
            )}
            title="Open WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </a>
        )}

        {/* Call */}
        {lead.phoneRaw && (
          <a
            href={`tel:${lead.phoneE164 ?? lead.phoneRaw}`}
            className={cn(
              "flex items-center justify-center w-7 h-7 rounded-lg",
              "bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
            )}
            title="Call"
          >
            <Phone className="w-3.5 h-3.5" />
          </a>
        )}

        {/* Move to next stage */}
        {!isLastStage && (
          <Button
            size="sm"
            variant="outline"
            className="ml-auto h-7 text-xs px-2 border-sage-300 text-sage-700 hover:bg-sage-50 hover:text-sage-800"
            onClick={(e) => {
              e.stopPropagation()
              onMoveNext(lead)
            }}
            disabled={isMoving}
          >
            {nextStageLabel}
            <ChevronRight className="w-3 h-3 ml-0.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
