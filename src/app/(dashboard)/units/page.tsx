"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Upload, Loader2, Search, MoreHorizontal, Pencil,
  ArrowRightLeft, Unlock, Trash2, LayoutGrid, TableIcon,
  Star, Share2, Clock,
} from "lucide-react"
import { formatCurrency, formatPSM } from "@/lib/utils"
import { ExcelImportDialog } from "@/components/excel-import-dialog"
import { ExcelExportButton } from "@/components/excel-export-button"
import { EditUnitDialog } from "@/components/units/edit-unit-dialog"
import { DeleteUnitDialog } from "@/components/units/delete-unit-dialog"
import { UnlockDialog } from "@/components/units/unlock-dialog"
import { StatusChangeDialog } from "@/components/units/status-change-dialog"
import { ExtendLockDialog } from "@/components/units/extend-lock-dialog"
import { UnitDetailPanel } from "@/components/units/unit-detail-panel"
import { FloorPlanView } from "@/components/units/floor-plan-view"
import { BulkToolbar } from "@/components/units/bulk-toolbar"
import { BulkStatusDialog } from "@/components/units/bulk-status-dialog"
import { BulkPriceDialog } from "@/components/units/bulk-price-dialog"
import { UnitComparisonDialog } from "@/components/units/unit-comparison-dialog"
import { ShareAvailabilityDialog } from "@/components/units/share-availability-dialog"

type Unit = {
  id: string
  tower: string
  floor: string
  unitNo: string
  unitType: string
  sizeSqm: string | null
  facing: string | null
  basePrice: string
  currentPrice: string
  status: string
  project: { name: string }
}

type Project = { id: string; name: string }

function getStatusVariant(status: string) {
  switch (status) {
    case "AVAILABLE": return "available"
    case "RESERVED": return "reserved"
    case "BOOKED": return "booked"
    case "SOLD": return "sold"
    case "CANCELLED": return "cancelled"
    default: return "secondary"
  }
}

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [filters, setFilters] = useState({ projectId: "", status: "", search: "" })
  const [importOpen, setImportOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"table" | "floor">("table")

  // Dialog states
  const [editUnit, setEditUnit] = useState<Unit | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteUnit, setDeleteUnit] = useState<{ id: string; unitNo: string; status: string } | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [unlockUnit, setUnlockUnit] = useState<{ id: string; unitNo: string } | null>(null)
  const [unlockOpen, setUnlockOpen] = useState(false)
  const [statusUnit, setStatusUnit] = useState<{ id: string; unitNo: string; status: string } | null>(null)
  const [statusOpen, setStatusOpen] = useState(false)
  const [extendUnit, setExtendUnit] = useState<{ id: string; unitNo: string } | null>(null)
  const [extendOpen, setExtendOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false)
  const [bulkPriceOpen, setBulkPriceOpen] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)

  // Favorites
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [favoritesOnly, setFavoritesOnly] = useState(false)

  // Search debounce
  const [searchInput, setSearchInput] = useState("")

  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => ({ ...f, search: searchInput })), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    Promise.all([
      fetch("/api/projects").then((r) => r.json()).then(setProjects),
      fetch("/api/units/favorites").then((r) => r.json()).then((ids: string[]) => setFavoriteIds(new Set(ids))).catch(() => {}),
      fetchUnits(),
    ]).catch(console.error)
  }, [])

  useEffect(() => {
    fetchUnits()
  }, [filters])

  const fetchUnits = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.projectId) params.set("projectId", filters.projectId)
      if (filters.status) params.set("status", filters.status)
      if (filters.search) params.set("search", filters.search)
      params.set("limit", "200")

      const res = await fetch(`/api/units?${params}`)
      const data = await res.json()
      setUnits(data.units)
      setTotal(data.total)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [filters])

  const statusCounts = units.reduce<Record<string, number>>((acc, u) => {
    acc[u.status] = (acc[u.status] || 0) + 1
    return acc
  }, {})

  const displayUnits = useMemo(
    () => (favoritesOnly ? units.filter((u) => favoriteIds.has(u.id)) : units),
    [units, favoritesOnly, favoriteIds]
  )

  const towers = useMemo(
    () => [...new Set(units.map((u) => u.tower))].sort(),
    [units]
  )

  const allSelected = displayUnits.length > 0 && displayUnits.every((u) => selectedIds.has(u.id))

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(displayUnits.map((u) => u.id)))
    }
  }

  async function toggleFavorite(unitId: string) {
    try {
      const res = await fetch("/api/units/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId }),
      })
      if (res.ok) {
        const { favorited } = await res.json()
        setFavoriteIds((prev) => {
          const next = new Set(prev)
          favorited ? next.add(unitId) : next.delete(unitId)
          return next
        })
      }
    } catch {}
  }

  function handleRefresh() {
    fetchUnits()
    setSelectedIds(new Set())
  }

  return (
    <>
      <Header title="Units" subtitle="Inventory management" />
      <div className="p-4 sm:p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {[
            { label: "Total", count: total, color: "text-foreground" },
            { label: "Available", count: statusCounts["AVAILABLE"] || 0, color: "text-green-600" },
            { label: "Reserved", count: statusCounts["RESERVED"] || 0, color: "text-yellow-600" },
            { label: "Booked", count: statusCounts["BOOKED"] || 0, color: "text-blue-600" },
            { label: "Sold", count: statusCounts["SOLD"] || 0, color: "text-sage-600" },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className={`text-xl sm:text-2xl font-bold ${item.color}`}>{item.count}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="relative w-[calc(100%-8px)] sm:w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search units..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filters.projectId || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, projectId: v === "all" ? "" : v }))}>
            <SelectTrigger className="w-[calc(50%-4px)] sm:w-[180px]">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.status || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, status: v === "all" ? "" : v }))}>
            <SelectTrigger className="w-[calc(50%-4px)] sm:w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="AVAILABLE">Available</SelectItem>
              <SelectItem value="RESERVED">Reserved</SelectItem>
              <SelectItem value="BOOKED">Booked</SelectItem>
              <SelectItem value="SOLD">Sold</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={favoritesOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setFavoritesOnly((v) => !v)}
          >
            <Star className={`w-4 h-4 ${favoritesOnly ? "fill-current" : ""}`} />
          </Button>
          <div className="flex gap-2 sm:ml-auto">
            <Button variant="outline" size="sm" onClick={() => setViewMode((v) => v === "table" ? "floor" : "table")}>
              {viewMode === "table" ? <LayoutGrid className="w-4 h-4" /> : <TableIcon className="w-4 h-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
              <Share2 className="w-4 h-4" />
            </Button>
            <ExcelExportButton
              data={units.map((u) => ({
                unitNo: u.unitNo,
                tower: u.tower,
                floor: u.floor,
                unitType: u.unitType,
                sizeSqm: u.sizeSqm ? Number(u.sizeSqm) : "",
                facing: u.facing ?? "",
                basePrice: Number(u.basePrice),
                currentPrice: Number(u.currentPrice),
                status: u.status,
                project: u.project?.name ?? "",
              }))}
              columns={[
                { key: "unitNo", header: "Unit No" },
                { key: "tower", header: "Tower" },
                { key: "floor", header: "Floor" },
                { key: "unitType", header: "Unit Type" },
                { key: "sizeSqm", header: "Size (sqm)" },
                { key: "facing", header: "Facing" },
                { key: "basePrice", header: "Base Price" },
                { key: "currentPrice", header: "Current Price" },
                { key: "status", header: "Status" },
                { key: "project", header: "Project" },
              ]}
              filename="units-export"
            />
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Import</span>
            </Button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : viewMode === "floor" ? (
          <Card className="p-4">
            <div className="mb-3">
              <Select
                value={filters.projectId ? (towers.length > 0 ? towers[0] : "") : ""}
                onValueChange={() => {}}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Towers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Towers</SelectItem>
                  {towers.map((t) => (
                    <SelectItem key={t} value={t}>Tower {t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <FloorPlanView
              units={displayUnits}
              selectedTower=""
              onUnitClick={(id) => { setDetailId(id); setDetailOpen(true) }}
            />
          </Card>
        ) : (
          <Card className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50">
                  <TableHead className="w-10">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="hidden sm:table-cell">Tower</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead className="hidden md:table-cell">Size (sqm)</TableHead>
                  <TableHead className="hidden lg:table-cell">Facing</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="hidden md:table-cell">PSM</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Project</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayUnits.map((unit) => (
                  <TableRow
                    key={unit.id}
                    className="cursor-pointer hover:bg-secondary/30"
                    onClick={() => { setDetailId(unit.id); setDetailOpen(true) }}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(unit.id)}
                        onCheckedChange={() => toggleSelect(unit.id)}
                      />
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => toggleFavorite(unit.id)} className="hover:scale-110 transition-transform">
                        <Star className={`w-4 h-4 ${favoriteIds.has(unit.id) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                      </button>
                    </TableCell>
                    <TableCell className="font-medium">{unit.unitNo}</TableCell>
                    <TableCell className="hidden sm:table-cell">{unit.tower}</TableCell>
                    <TableCell className="hidden md:table-cell">{unit.unitType}</TableCell>
                    <TableCell className="hidden md:table-cell">{unit.sizeSqm ? Number(unit.sizeSqm).toFixed(0) : "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell">{unit.facing || "—"}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(Number(unit.currentPrice))}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                      {formatPSM(Number(unit.currentPrice), Number(unit.sizeSqm))}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(unit.status) as any}>{unit.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm hidden lg:table-cell">{unit.project?.name}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditUnit(unit); setEditOpen(true) }}>
                            <Pencil className="w-4 h-4 mr-2" />Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setStatusUnit({ id: unit.id, unitNo: unit.unitNo, status: unit.status }); setStatusOpen(true) }}>
                            <ArrowRightLeft className="w-4 h-4 mr-2" />Change Status
                          </DropdownMenuItem>
                          {unit.status === "RESERVED" && (
                            <>
                              <DropdownMenuItem onClick={() => { setUnlockUnit({ id: unit.id, unitNo: unit.unitNo }); setUnlockOpen(true) }}>
                                <Unlock className="w-4 h-4 mr-2" />Unlock
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setExtendUnit({ id: unit.id, unitNo: unit.unitNo }); setExtendOpen(true) }}>
                                <Clock className="w-4 h-4 mr-2" />Extend Lock
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => { setDeleteUnit({ id: unit.id, unitNo: unit.unitNo, status: unit.status }); setDeleteOpen(true) }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {displayUnits.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                      No units found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Bulk Toolbar */}
      <BulkToolbar
        count={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
        onChangeStatus={() => setBulkStatusOpen(true)}
        onUpdatePrice={() => setBulkPriceOpen(true)}
        onDelete={async () => {
          if (!confirm(`Delete ${selectedIds.size} selected units? Only AVAILABLE units will be deleted.`)) return
          await fetch("/api/units/bulk", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ unitIds: [...selectedIds] }),
          })
          handleRefresh()
        }}
        onCompare={() => setCompareOpen(true)}
      />

      {/* All Dialogs */}
      <EditUnitDialog
        unit={editUnit}
        open={editOpen}
        onOpenChange={(v) => { setEditOpen(v); if (!v) setEditUnit(null) }}
        onSuccess={handleRefresh}
      />
      {deleteUnit && (
        <DeleteUnitDialog
          unitId={deleteUnit.id}
          unitNo={deleteUnit.unitNo}
          status={deleteUnit.status}
          open={deleteOpen}
          onOpenChange={(v) => { setDeleteOpen(v); if (!v) setDeleteUnit(null) }}
          onSuccess={handleRefresh}
        />
      )}
      {unlockUnit && (
        <UnlockDialog
          unitId={unlockUnit.id}
          unitNo={unlockUnit.unitNo}
          open={unlockOpen}
          onOpenChange={(v) => { setUnlockOpen(v); if (!v) setUnlockUnit(null) }}
          onSuccess={handleRefresh}
        />
      )}
      {statusUnit && (
        <StatusChangeDialog
          unitId={statusUnit.id}
          unitNo={statusUnit.unitNo}
          currentStatus={statusUnit.status}
          open={statusOpen}
          onOpenChange={(v) => { setStatusOpen(v); if (!v) setStatusUnit(null) }}
          onSuccess={handleRefresh}
        />
      )}
      {extendUnit && (
        <ExtendLockDialog
          unitId={extendUnit.id}
          unitNo={extendUnit.unitNo}
          open={extendOpen}
          onOpenChange={(v) => { setExtendOpen(v); if (!v) setExtendUnit(null) }}
          onSuccess={handleRefresh}
        />
      )}
      <UnitDetailPanel
        unitId={detailId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={(u) => { setEditUnit(u as any); setEditOpen(true) }}
      />
      <BulkStatusDialog
        unitIds={[...selectedIds]}
        open={bulkStatusOpen}
        onOpenChange={setBulkStatusOpen}
        onSuccess={handleRefresh}
      />
      <BulkPriceDialog
        unitIds={[...selectedIds]}
        open={bulkPriceOpen}
        onOpenChange={setBulkPriceOpen}
        onSuccess={handleRefresh}
      />
      <UnitComparisonDialog
        unitIds={[...selectedIds]}
        open={compareOpen}
        onOpenChange={setCompareOpen}
      />
      <ShareAvailabilityDialog
        projects={projects}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />
      <ExcelImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        entityType="units"
        projectId={filters.projectId || undefined}
        onSuccess={fetchUnits}
      />
    </>
  )
}
