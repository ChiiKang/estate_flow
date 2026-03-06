"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import type { TraceStep } from "@/types/chat"
import { cn } from "@/lib/utils"

const TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  thinking: { bg: "bg-sage-100", text: "text-sage-700", label: "THINKING" },
  sql: { bg: "bg-blue-50", text: "text-blue-700", label: "SQL" },
  result: { bg: "bg-tan-100", text: "text-tan-700", label: "RESULT" },
  error: { bg: "bg-red-50", text: "text-red-700", label: "ERROR" },
}

function TraceStepItem({ step }: { step: TraceStep }) {
  const style = TYPE_STYLES[step.type] || TYPE_STYLES.thinking

  return (
    <div className="flex gap-2 items-start py-1.5">
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sage-600 text-white text-[10px] font-bold shrink-0 mt-0.5">
        {step.id}
      </span>
      <span
        className={cn(
          "px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider shrink-0",
          style.bg,
          style.text
        )}
      >
        {step.label}
      </span>
      <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all font-mono leading-relaxed min-w-0">
        {step.content}
      </pre>
    </div>
  )
}

export function ChatTrace({ steps }: { steps: TraceStep[] }) {
  const [expanded, setExpanded] = useState(false)

  if (steps.length === 0) return null

  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
        <span className="font-medium">
          Reasoning + Tool Trace ({steps.length} steps)
        </span>
      </button>
      {expanded && (
        <div className="mt-1.5 ml-1 pl-3 border-l-2 border-sage-200 space-y-0.5">
          {steps.map((step) => (
            <TraceStepItem key={step.id} step={step} />
          ))}
        </div>
      )}
    </div>
  )
}
