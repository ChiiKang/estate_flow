"use client"

import { useState, useEffect, useMemo, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn, formatCurrency } from "@/lib/utils"
import {
  LayoutGrid,
  Building2,
  ChevronRight,
  RefreshCw,
  Info,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type UnitStatus = "AVAILABLE" | "RESERVED" | "BOOKED" | "SOLD" | "CANCELLED"

type BoardUnit = {
  id: string
  tower: string
  floor: string
  unitNo: string
  unitType: string
  sizeSqm: string | null
  facing: string | null
  currentPrice: string
  basePrice: string
  status: UnitStatus
}

type Project = {
  id: string
  name: string
  location: string | null
}

type BoardData = {
  project: Project
  towers: string[]
  units: BoardUnit[]
  summary: Record<string, number>
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  UnitStatus,
  { label: string; cell: string; badge: string; dot: string }
> = {
  AVAILABLE: {
    label: "Available",
    cell: "bg-green-100 border-green-300 text-green-800 hover:bg-green-200 cursor-pointer",
    badge: "bg-green-100 text-green-800 border-green-300",
    dot: "bg-green-500",
  },
  RESERVED: {
    label: "Reserved",
    cell: "bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200 cursor-pointer",
    badge: "bg-yellow-100 text-yellow-800 border-yellow-300",
    dot: "bg-yellow-500",
  },
  BOOKED: {
    label: "Booked",
    cell: "bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200 cursor-pointer",
    badge: "bg-blue-100 text-blue-800 border-blue-300",
    dot: "bg-blue-500",
  },
  SOLD: {
    label: "Sold",
    cell: "bg-sage-100 border-sage-300 text-sage-800 cursor-default opacity-80",
    badge: "bg-sage-100 text-sage-800 border-sage-300",
    dot: "bg-sage-600",
  },
  CANCELLED: {
    label: "Cancelled",
    cell: "bg-gray-100 border-gray-300 text-gray-400 cursor-default opacity-60",
    badge: "bg-gray-100 text-gray-500 border-gray-300",
    dot: "bg-gray-400",
  },
}

const STATUS_ORDER: UnitStatus[] = [
  "AVAILABLE",
  "RESERVED",
  "BOOKED",
  "SOLD",
  "CANCELLED",
]

// ─── Unit Detail Dialog ────────────────────────────────────────────────────────

function UnitDetailDialog({
  unit,
  projectName,
  onClose,
  onViewDetails,
}: {
  unit: BoardUnit | null
  projectName: string
  onClose: () => void
  onViewDetails: (unitId: string) => void
}) {
  if (!unit) return null

  const config = STATUS_CONFIG[unit.status] ?? STATUS_CONFIG.CANCELLED
  const price = parseFloat(unit.currentPrice)
  const basePrice = parseFloat(unit.basePrice)
  const sizeSqm = unit.sizeSqm ? parseFloat(unit.sizeSqm) : null
  const priceDiff = price - basePrice
  const hasPremium = Math.abs(priceDiff) > 0

  return (
    <Dialog open={!!unit} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-lg font-bold">Unit {unit.unitNo}</span>
            <Badge
              className={cn(
                "text-xs border font-medium",
                config.badge
              )}
            >
              {config.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Key info grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-0.5">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Project
              </p>
              <p className="font-medium text-foreground">{projectName}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Tower / Floor
              </p>
              <p className="font-medium text-foreground">
                {unit.tower} · Floor {unit.floor}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Unit Type
              </p>
              <p className="font-medium text-foreground">{unit.unitType}</p>
            </div>
            {sizeSqm && (
              <div className="space-y-0.5">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  Size
                </p>
                <p className="font-medium text-foreground">
                  {sizeSqm.toFixed(1)} m²
                </p>
              </div>
            )}
            {unit.facing && (
              <div className="space-y-0.5">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  Facing
                </p>
                <p className="font-medium text-foreground">{unit.facing}</p>
              </div>
            )}
          </div>

          {/* Pricing block */}
          <div className="rounded-lg border border-border bg-secondary/40 p-3 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Pricing
            </p>
            <p className="text-xl font-bold text-foreground">
              {formatCurrency(price)}
            </p>
            {sizeSqm && (
              <p className="text-xs text-muted-foreground">
                {formatCurrency(price / sizeSqm)} / m²&nbsp;·&nbsp;
                {formatCurrency(price / (sizeSqm * 10.764))} / sqft
              </p>
            )}
            {hasPremium && (
              <p
                className={cn(
                  "text-xs font-medium",
                  priceDiff > 0 ? "text-green-700" : "text-red-600"
                )}
              >
                {priceDiff > 0 ? "+" : ""}
                {formatCurrency(priceDiff)} vs base price
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            {unit.status === "AVAILABLE" && (
              <Button
                size="sm"
                className="flex-1 bg-primary hover:bg-primary/90"
                onClick={() => {
                  onClose()
                  onViewDetails(unit.id)
                }}
              >
                Reserve Unit
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className={cn(
                "gap-1.5",
                unit.status === "AVAILABLE" ? "" : "flex-1"
              )}
              onClick={() => {
                onClose()
                onViewDetails(unit.id)
              }}
            >
              <Info className="w-3.5 h-3.5" />
              View Details
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Summary Bar ──────────────────────────────────────────────────────────────

function SummaryBar({
  summary,
  total,
}: {
  summary: Record<string, number>
  total: number
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {STATUS_ORDER.map((status) => {
        const count = summary[status] ?? 0
        if (count === 0) return null
        const config = STATUS_CONFIG[status]
        const pct = total > 0 ? Math.round((count / total) * 100) : 0
        return (
          <div
            key={status}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-border text-xs"
          >
            <span className={cn("w-2 h-2 rounded-full shrink-0", config.dot)} />
            <span className="font-medium text-foreground">{count}</span>
            <span className="text-muted-foreground">{config.label}</span>
            <span className="text-muted-foreground opacity-60">({pct}%)</span>
          </div>
        )
      })}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary text-xs ml-1">
        <span className="font-semibold text-foreground">{total}</span>
        <span className="text-muted-foreground">Total</span>
      </div>
    </div>
  )
}

// ─── Floor Grid ───────────────────────────────────────────────────────────────

function FloorGrid({
  units,
  onUnitClick,
}: {
  units: BoardUnit[]
  onUnitClick: (unit: BoardUnit) => void
}) {
  const { floors, unitsByFloor } = useMemo(() => {
    const map = new Map<string, BoardUnit[]>()
    for (const u of units) {
      const list = map.get(u.floor) ?? []
      list.push(u)
      map.set(u.floor, list)
    }
    const sorted = [...map.keys()].sort((a, b) => {
      const na = parseInt(a)
      const nb = parseInt(b)
      if (!isNaN(na) && !isNaN(nb)) return nb - na
      return b.localeCompare(a)
    })
    return { floors: sorted, unitsByFloor: map }
  }, [units])

  if (units.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <LayoutGrid className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm">No units in this tower</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="space-y-1.5 min-w-[480px]">
        {/* Column header row — shows unit numbers across the top */}
        {(() => {
          // Collect all unique unitNo values sorted
          const allUnitNos = [
            ...new Set(units.map((u) => u.unitNo)),
          ].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
          return (
            <>
              <div className="flex gap-1.5 items-center">
                <div className="w-14 shrink-0" />
                {allUnitNos.map((no) => (
                  <div
                    key={no}
                    className="flex-1 min-w-[88px] max-w-[160px] text-center text-[11px] font-semibold text-muted-foreground py-1"
                  >
                    {no}
                  </div>
                ))}
              </div>

              {floors.map((floor) => {
                const floorUnits = unitsByFloor.get(floor) ?? []
                // Build a map for quick lookup
                const byUnitNo = new Map(
                  floorUnits.map((u) => [u.unitNo, u])
                )
                return (
                  <div key={floor} className="flex gap-1.5 items-stretch">
                    {/* Floor label */}
                    <div className="w-14 shrink-0 flex items-center justify-center text-[11px] font-semibold text-muted-foreground bg-secondary/60 rounded-md">
                      F{floor}
                    </div>

                    {allUnitNos.map((no) => {
                      const unit = byUnitNo.get(no)
                      if (!unit) {
                        // Empty placeholder to maintain grid alignment
                        return (
                          <div
                            key={no}
                            className="flex-1 min-w-[88px] max-w-[160px] rounded-md border border-dashed border-border/30 bg-transparent"
                          />
                        )
                      }
                      const config =
                        STATUS_CONFIG[unit.status] ?? STATUS_CONFIG.CANCELLED
                      const price = parseFloat(unit.currentPrice)
                      const size = unit.sizeSqm
                        ? parseFloat(unit.sizeSqm)
                        : null

                      return (
                        <button
                          key={unit.id}
                          onClick={() =>
                            unit.status !== "CANCELLED" &&
                            onUnitClick(unit)
                          }
                          disabled={unit.status === "CANCELLED"}
                          className={cn(
                            "flex-1 min-w-[88px] max-w-[160px] border rounded-md p-2 text-left transition-all duration-100 group",
                            config.cell,
                            unit.status !== "CANCELLED" &&
                              "active:scale-[0.97]"
                          )}
                          title={`Unit ${unit.unitNo} · ${unit.unitType} · ${formatCurrency(price)}`}
                        >
                          <p className="text-[11px] font-bold leading-tight truncate">
                            {unit.unitNo}
                          </p>
                          <p className="text-[10px] leading-tight opacity-80 truncate mt-0.5">
                            {unit.unitType}
                          </p>
                          <p className="text-[10px] leading-tight font-medium mt-1 truncate">
                            {formatCurrency(price)}
                          </p>
                          {size && (
                            <p className="text-[9px] leading-tight opacity-60 truncate">
                              {size.toFixed(0)} m²
                            </p>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </>
          )
        })()}
      </div>
    </div>
  )
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs items-center">
      <span className="text-muted-foreground font-medium">Legend:</span>
      {STATUS_ORDER.map((status) => {
        const config = STATUS_CONFIG[status]
        return (
          <div key={status} className="flex items-center gap-1.5">
            <div
              className={cn(
                "w-3.5 h-3.5 rounded border",
                config.cell
              )}
            />
            <span className="text-muted-foreground">{config.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BoardPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <BoardPage />
    </Suspense>
  )
}

function BoardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [projects, setProjects] = useState<
    { id: string; name: string; location: string | null }[]
  >([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    searchParams.get("project") ?? ""
  )
  const [boardData, setBoardData] = useState<BoardData | null>(null)
  const [selectedTower, setSelectedTower] = useState<string>("")
  const [selectedUnit, setSelectedUnit] = useState<BoardUnit | null>(null)
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [loadingBoard, setLoadingBoard] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch projects list
  useEffect(() => {
    async function load() {
      try {
        setLoadingProjects(true)
        const res = await fetch("/api/projects")
        if (!res.ok) {
          if (res.status === 401) {
            router.push("/login")
            return
          }
          throw new Error("Failed to load projects")
        }
        const data = await res.json()
        const list = Array.isArray(data) ? data : (data.projects ?? [])
        setProjects(list)
        // Auto-select first project if none chosen
        if (!selectedProjectId && list.length > 0) {
          setSelectedProjectId(list[0].id)
        }
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoadingProjects(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch board data whenever project changes
  const fetchBoard = useCallback(
    async (projectId: string) => {
      if (!projectId) return
      setLoadingBoard(true)
      setError(null)
      setBoardData(null)
      setSelectedTower("")
      try {
        const res = await fetch(
          `/api/projects/${projectId}/units/board`
        )
        if (!res.ok) {
          if (res.status === 401) {
            router.push("/login")
            return
          }
          const err = await res.json()
          throw new Error(err.error ?? "Failed to load board")
        }
        const data: BoardData = await res.json()
        setBoardData(data)
        if (data.towers.length > 0) {
          setSelectedTower(data.towers[0])
        }
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoadingBoard(false)
      }
    },
    [router]
  )

  useEffect(() => {
    if (selectedProjectId) {
      fetchBoard(selectedProjectId)
    }
  }, [selectedProjectId, fetchBoard])

  // Units filtered to selected tower
  const towerUnits = useMemo(() => {
    if (!boardData) return []
    if (!selectedTower) return boardData.units
    return boardData.units.filter((u) => u.tower === selectedTower)
  }, [boardData, selectedTower])

  // Summary for the currently selected tower (or all towers)
  const towerSummary = useMemo(() => {
    const summary: Record<string, number> = {}
    for (const u of towerUnits) {
      summary[u.status] = (summary[u.status] ?? 0) + 1
    }
    return summary
  }, [towerUnits])

  function handleUnitClick(unit: BoardUnit) {
    setSelectedUnit(unit)
  }

  function handleViewDetails(unitId: string) {
    router.push(`/units?highlight=${unitId}`)
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId)

  return (
    <div className="flex flex-col h-[calc(100vh-0px)] overflow-hidden">
      <Header
        title="Unit Board"
        subtitle="Real-time availability grid by project and tower"
      />

      <div className="flex-1 flex flex-col min-h-0 p-4 sm:p-6 space-y-4 overflow-y-auto">
        {/* ── Top Controls ── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Project selector */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
            <Select
              value={selectedProjectId}
              onValueChange={(v) => {
                setSelectedProjectId(v)
                // Update URL param without navigation
                const url = new URL(window.location.href)
                url.searchParams.set("project", v)
                window.history.replaceState({}, "", url.toString())
              }}
              disabled={loadingProjects}
            >
              <SelectTrigger className="w-full sm:w-72 bg-card">
                <SelectValue
                  placeholder={
                    loadingProjects ? "Loading projects…" : "Select a project"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="font-medium">{p.name}</span>
                    {p.location && (
                      <span className="text-muted-foreground ml-1.5 text-xs">
                        · {p.location}
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Refresh button */}
          <Button
            variant="outline"
            size="sm"
            className="gap-2 shrink-0"
            onClick={() => fetchBoard(selectedProjectId)}
            disabled={!selectedProjectId || loadingBoard}
          >
            <RefreshCw
              className={cn("w-4 h-4", loadingBoard && "animate-spin")}
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>

        {/* ── Error state ── */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* ── Empty / no project selected ── */}
        {!selectedProjectId && !loadingProjects && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
            <LayoutGrid className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">
              Select a project to view the board
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Use the dropdown above to choose a project
            </p>
          </div>
        )}

        {/* ── Loading skeleton ── */}
        {loadingBoard && (
          <div className="space-y-3 animate-pulse">
            <div className="h-8 bg-secondary rounded-lg w-64" />
            <div className="h-5 bg-secondary rounded w-96" />
            <div className="grid gap-1.5 mt-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex gap-1.5">
                  <div className="w-14 h-14 bg-secondary rounded-md" />
                  {[...Array(6)].map((_, j) => (
                    <div
                      key={j}
                      className="flex-1 min-w-[88px] max-w-[160px] h-14 bg-secondary rounded-md"
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Board content ── */}
        {boardData && !loadingBoard && (
          <div className="flex flex-col space-y-4 min-h-0">
            {/* Project info breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {boardData.project.name}
              </span>
              {boardData.project.location && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                  <span>{boardData.project.location}</span>
                </>
              )}
              <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              <span>
                {boardData.units.length} unit
                {boardData.units.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Summary bar */}
            <SummaryBar summary={towerSummary} total={towerUnits.length} />

            {/* Tower tabs */}
            {boardData.towers.length > 1 ? (
              <Tabs
                value={selectedTower}
                onValueChange={setSelectedTower}
                className="w-full"
              >
                <TabsList className="h-9 bg-secondary/60">
                  {boardData.towers.map((tower) => {
                    const tCount = boardData.units.filter(
                      (u) => u.tower === tower
                    ).length
                    const avail = boardData.units.filter(
                      (u) => u.tower === tower && u.status === "AVAILABLE"
                    ).length
                    return (
                      <TabsTrigger
                        key={tower}
                        value={tower}
                        className="text-sm gap-1.5 px-3"
                      >
                        <span>Tower {tower}</span>
                        <span className="text-[10px] opacity-60">
                          {avail}/{tCount}
                        </span>
                      </TabsTrigger>
                    )
                  })}
                </TabsList>
              </Tabs>
            ) : boardData.towers.length === 1 ? (
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-sm font-medium text-primary">
                  <Building2 className="w-4 h-4" />
                  Tower {boardData.towers[0]}
                </div>
              </div>
            ) : null}

            {/* Floor grid */}
            <div className="flex-1 rounded-xl border border-border bg-card shadow-sm p-4 min-h-0">
              <FloorGrid units={towerUnits} onUnitClick={handleUnitClick} />
            </div>

            {/* Legend */}
            <Legend />
          </div>
        )}

        {/* ── No units ── */}
        {boardData && boardData.units.length === 0 && !loadingBoard && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
            <LayoutGrid className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">
              No units found for this project
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Add units in the Units page to see them here
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 gap-2"
              onClick={() => router.push("/units")}
            >
              Go to Units
            </Button>
          </div>
        )}
      </div>

      {/* ── Unit detail dialog ── */}
      <UnitDetailDialog
        unit={selectedUnit}
        projectName={boardData?.project.name ?? ""}
        onClose={() => setSelectedUnit(null)}
        onViewDetails={handleViewDetails}
      />
    </div>
  )
}
