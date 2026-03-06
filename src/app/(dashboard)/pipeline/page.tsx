"use client"

import { useEffect, useState, useCallback } from "react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, RefreshCw, GitBranch } from "lucide-react"
import { cn } from "@/lib/utils"
import { PipelineCard, type PipelineLead } from "@/components/pipeline/pipeline-card"
import { PipelineDetailSheet } from "@/components/pipeline/pipeline-detail-sheet"

// Stages to display (all 11 from schema)
const PIPELINE_STAGES = [
  { key: "NEW", label: "New", color: "bg-gray-50 border-gray-200", headerColor: "bg-gray-100 border-gray-300" },
  { key: "CONTACTED", label: "Contacted", color: "bg-blue-50 border-blue-200", headerColor: "bg-blue-100 border-blue-300" },
  { key: "QUALIFIED", label: "Qualified", color: "bg-purple-50 border-purple-200", headerColor: "bg-purple-100 border-purple-300" },
  { key: "SITE_VISIT", label: "Site Visit", color: "bg-yellow-50 border-yellow-200", headerColor: "bg-yellow-100 border-yellow-300" },
  { key: "UNIT_SELECTED", label: "Unit Selected", color: "bg-orange-50 border-orange-200", headerColor: "bg-orange-100 border-orange-300" },
  { key: "RESERVED", label: "Reserved", color: "bg-green-50 border-green-200", headerColor: "bg-green-100 border-green-300" },
  { key: "BOOKED", label: "Booked", color: "bg-teal-50 border-teal-200", headerColor: "bg-teal-100 border-teal-300" },
  { key: "SPA_SIGNED", label: "SPA Signed", color: "bg-cyan-50 border-cyan-200", headerColor: "bg-cyan-100 border-cyan-300" },
  { key: "LOAN_SUBMITTED", label: "Loan Submitted", color: "bg-indigo-50 border-indigo-200", headerColor: "bg-indigo-100 border-indigo-300" },
  { key: "LOAN_APPROVED", label: "Loan Approved", color: "bg-violet-50 border-violet-200", headerColor: "bg-violet-100 border-violet-300" },
  { key: "SOLD", label: "Sold", color: "bg-sage-50 border-sage-200", headerColor: "bg-sage-100 border-sage-300" },
]

type Project = { id: string; name: string }
type Agent = { id: string; name: string }

type StageData = Record<string, PipelineLead[]>
type CountData = Record<string, number>

export default function PipelinePage() {
  // Filter state
  const [projects, setProjects] = useState<Project[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedProject, setSelectedProject] = useState<string>("all")
  const [selectedAgent, setSelectedAgent] = useState<string>("all")

  // Pipeline data
  const [stages, setStages] = useState<StageData>({})
  const [counts, setCounts] = useState<CountData>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Moving state: map of leadId -> boolean
  const [movingLeads, setMovingLeads] = useState<Record<string, boolean>>({})

  // Detail sheet
  const [selectedLead, setSelectedLead] = useState<PipelineLead | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [isChangingStage, setIsChangingStage] = useState(false)

  // Load projects and agents for filters
  useEffect(() => {
    async function loadFilters() {
      try {
        const [projRes, agentRes] = await Promise.all([
          fetch("/api/projects"),
          fetch("/api/users?role=AGENT"),
        ])
        if (projRes.ok) {
          const data = await projRes.json()
          setProjects(Array.isArray(data) ? data : data.projects ?? [])
        }
        if (agentRes.ok) {
          const data = await agentRes.json()
          setAgents(Array.isArray(data) ? data : data.users ?? [])
        }
      } catch {
        // non-critical
      }
    }
    loadFilters()
  }, [])

  const fetchPipeline = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams()
      if (selectedProject !== "all") params.set("projectId", selectedProject)
      if (selectedAgent !== "all") params.set("agentId", selectedAgent)

      const res = await fetch(`/api/leads/pipeline?${params}`)
      if (res.status === 401) {
        setError("Session expired. Please refresh.")
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Failed to load pipeline")
        return
      }
      const data = await res.json()
      setStages(data.stages ?? {})
      setCounts(data.counts ?? {})
    } catch {
      setError("Failed to load pipeline")
    } finally {
      setLoading(false)
    }
  }, [selectedProject, selectedAgent])

  useEffect(() => {
    fetchPipeline()
  }, [fetchPipeline])

  async function handleMoveNext(lead: PipelineLead) {
    const stageIdx = PIPELINE_STAGES.findIndex((s) => s.key === lead.stage)
    if (stageIdx === -1 || stageIdx >= PIPELINE_STAGES.length - 1) return
    const nextStage = PIPELINE_STAGES[stageIdx + 1].key
    await moveLeadToStage(lead, nextStage)
  }

  async function moveLeadToStage(lead: PipelineLead, newStage: string) {
    setMovingLeads((prev) => ({ ...prev, [lead.id]: true }))
    try {
      const res = await fetch(`/api/leads/${lead.id}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Failed to update stage")
      }

      const updated: PipelineLead = await res.json()

      // Optimistic update: remove from old stage, add to new stage
      setStages((prev) => {
        const next = { ...prev }
        const oldStage = lead.stage
        // Remove from old stage
        if (next[oldStage]) {
          next[oldStage] = next[oldStage].filter((l) => l.id !== lead.id)
        }
        // Add to new stage at top
        if (next[newStage]) {
          next[newStage] = [updated, ...next[newStage].filter((l) => l.id !== updated.id)]
        } else {
          next[newStage] = [updated]
        }
        return next
      })

      // Update counts
      setCounts((prev) => ({
        ...prev,
        [lead.stage]: Math.max(0, (prev[lead.stage] ?? 0) - 1),
        [newStage]: (prev[newStage] ?? 0) + 1,
      }))

      // Update the selected lead in the sheet if it matches
      if (selectedLead?.id === lead.id) {
        setSelectedLead({ ...updated })
      }
    } finally {
      setMovingLeads((prev) => {
        const next = { ...prev }
        delete next[lead.id]
        return next
      })
    }
  }

  async function handleSheetStageChange(lead: PipelineLead, newStage: string) {
    setIsChangingStage(true)
    try {
      await moveLeadToStage(lead, newStage)
    } finally {
      setIsChangingStage(false)
    }
  }

  function openDetail(lead: PipelineLead) {
    setSelectedLead(lead)
    setSheetOpen(true)
  }

  const totalLeads = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header
        title="Pipeline"
        subtitle="Lead-to-deal funnel"
      />

      {/* Toolbar */}
      <div className="shrink-0 border-b border-border bg-card px-4 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Left: title + count */}
          <div className="flex items-center gap-2 min-w-0">
            <GitBranch className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium text-foreground">
              {loading ? (
                <span className="text-muted-foreground">Loading...</span>
              ) : (
                <span>
                  <span className="font-bold">{totalLeads}</span>{" "}
                  <span className="text-muted-foreground">leads across all stages</span>
                </span>
              )}
            </span>
          </div>

          {/* Right: filters + refresh */}
          <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
            {/* Project filter */}
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Agent filter */}
            {agents.length > 0 && (
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue placeholder="All Agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Refresh */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={fetchPipeline}
              disabled={loading}
              title="Refresh pipeline"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="shrink-0 bg-destructive/10 border-b border-destructive/20 px-6 py-2">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Kanban board — horizontal scroll */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div
          className="flex h-full gap-3 px-4 sm:px-6 py-4"
          style={{ minWidth: `${PIPELINE_STAGES.length * 260}px` }}
        >
          {PIPELINE_STAGES.map((stage, stageIdx) => {
            const leads = stages[stage.key] ?? []
            const count = counts[stage.key] ?? 0
            const isLastStage = stageIdx === PIPELINE_STAGES.length - 1
            const nextStageLabel = isLastStage
              ? ""
              : PIPELINE_STAGES[stageIdx + 1].label

            return (
              <div
                key={stage.key}
                className="flex flex-col w-[248px] shrink-0"
              >
                {/* Column header */}
                <div
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-t-xl border border-b-0",
                    stage.headerColor
                  )}
                >
                  <span className="text-xs font-semibold text-foreground truncate">
                    {stage.label}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-xs h-5 px-1.5 bg-white/70 border-current/30 font-semibold"
                  >
                    {loading ? "—" : count}
                  </Badge>
                </div>

                {/* Column body — vertical scroll */}
                <div
                  className={cn(
                    "flex-1 overflow-y-auto rounded-b-xl border",
                    stage.color,
                    "p-2 space-y-2"
                  )}
                >
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : leads.length === 0 ? (
                    <div className="flex items-center justify-center py-8 px-2">
                      <p className="text-xs text-muted-foreground text-center">
                        No leads in this stage
                      </p>
                    </div>
                  ) : (
                    leads.map((lead) => (
                      <PipelineCard
                        key={lead.id}
                        lead={lead}
                        isLastStage={isLastStage}
                        nextStageLabel={nextStageLabel}
                        onMoveNext={handleMoveNext}
                        onOpenDetail={openDetail}
                        isMoving={movingLeads[lead.id] ?? false}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Detail sheet */}
      <PipelineDetailSheet
        lead={selectedLead}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onStageChange={handleSheetStageChange}
        isChangingStage={isChangingStage}
      />
    </div>
  )
}
