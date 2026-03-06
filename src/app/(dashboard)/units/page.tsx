"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, Upload, Loader2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { ImportDialog } from "@/components/import-dialog"

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
  const [filters, setFilters] = useState({ projectId: "", status: "" })
  const [importOpen, setImportOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch("/api/projects").then((r) => r.json()).then(setProjects),
      fetchUnits(),
    ]).catch(console.error)
  }, [])

  useEffect(() => {
    fetchUnits()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  async function fetchUnits() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.projectId) params.set("projectId", filters.projectId)
      if (filters.status) params.set("status", filters.status)
      params.set("limit", "100")

      const res = await fetch(`/api/units?${params}`)
      const data = await res.json()
      setUnits(data.units)
      setTotal(data.total)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const statusCounts = units.reduce<Record<string, number>>((acc, u) => {
    acc[u.status] = (acc[u.status] || 0) + 1
    return acc
  }, {})

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
          <div className="flex gap-2 sm:ml-auto">
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Import</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.open("/api/units/export", "_blank")}>
              <Download className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>

        {/* Units Table */}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Card className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50">
                  <TableHead>Unit</TableHead>
                  <TableHead className="hidden sm:table-cell">Tower</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead className="hidden md:table-cell">Size (sqm)</TableHead>
                  <TableHead className="hidden lg:table-cell">Facing</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Project</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.map((unit) => (
                  <TableRow key={unit.id}>
                    <TableCell className="font-medium">{unit.unitNo}</TableCell>
                    <TableCell className="hidden sm:table-cell">{unit.tower}</TableCell>
                    <TableCell className="hidden md:table-cell">{unit.unitType}</TableCell>
                    <TableCell className="hidden md:table-cell">{unit.sizeSqm ? Number(unit.sizeSqm).toFixed(0) : "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell">{unit.facing || "—"}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(Number(unit.currentPrice))}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(unit.status) as any}>{unit.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm hidden lg:table-cell">{unit.project?.name}</TableCell>
                  </TableRow>
                ))}
                {units.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No units found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import Units from CSV"
        endpoint="/api/units/import"
        extraFormData={filters.projectId ? { projectId: filters.projectId } : undefined}
        onSuccess={fetchUnits}
      />
    </>
  )
}
