"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Search, Upload, Download, Phone, Loader2 } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { ImportDialog } from "@/components/import-dialog"

type Lead = {
  id: string
  name: string
  phoneRaw: string | null
  phoneE164: string | null
  email: string | null
  source: string | null
  stage: string
  priority: number
  lastContactedAt: string | null
  owner: { id: string; name: string } | null
  project: { id: string; name: string } | null
  createdAt: string
}

type Project = { id: string; name: string }

function getStageColor(stage: string) {
  switch (stage) {
    case "NEW": return "secondary"
    case "CONTACTED": return "outline"
    case "QUALIFIED": return "accent"
    case "SITE_VISIT": return "reserved"
    case "UNIT_SELECTED": return "reserved"
    case "RESERVED": return "booked"
    case "BOOKED": return "booked"
    case "SOLD": return "sold"
    default: return "secondary"
  }
}

function getPriorityLabel(priority: number) {
  if (priority >= 2) return { label: "high", className: "text-red-600 bg-red-50" }
  if (priority === 1) return { label: "medium", className: "text-yellow-600 bg-yellow-50" }
  return { label: "low", className: "text-green-600 bg-green-50" }
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [filters, setFilters] = useState({ stage: "", search: "" })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: "", phone: "", email: "", source: "", projectId: "" })
  const [importOpen, setImportOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch("/api/projects").then((r) => r.json()).then(setProjects),
      fetchLeads(),
    ]).catch(console.error)
  }, [])

  useEffect(() => {
    fetchLeads()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.stage])

  async function fetchLeads() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.stage) params.set("stage", filters.stage)
      if (filters.search) params.set("search", filters.search)
      const res = await fetch(`/api/leads?${params}`)
      const data = await res.json()
      setLeads(data.leads)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    if (!form.name.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone || undefined,
          email: form.email || undefined,
          source: form.source || undefined,
          projectId: form.projectId || undefined,
        }),
      })
      if (res.ok) {
        setForm({ name: "", phone: "", email: "", source: "", projectId: "" })
        setDialogOpen(false)
        fetchLeads()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  function handleSearch() {
    fetchLeads()
  }

  return (
    <>
      <Header title="Leads" subtitle="Manage your lead pipeline" />
      <div className="p-4 sm:p-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="relative w-full sm:w-auto sm:flex-1 sm:min-w-[200px] sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              className="pl-9"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <Select value={filters.stage || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, stage: v === "all" ? "" : v }))}>
            <SelectTrigger className="w-[calc(50%-4px)] sm:w-[150px]">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              <SelectItem value="NEW">New</SelectItem>
              <SelectItem value="CONTACTED">Contacted</SelectItem>
              <SelectItem value="QUALIFIED">Qualified</SelectItem>
              <SelectItem value="SITE_VISIT">Site Visit</SelectItem>
              <SelectItem value="UNIT_SELECTED">Unit Selected</SelectItem>
              <SelectItem value="RESERVED">Reserved</SelectItem>
              <SelectItem value="BOOKED">Booked</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Import</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.open("/api/leads/export", "_blank")}>
              <Download className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Add Lead</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Lead</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Full name" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="012-345 6789" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Source</Label>
                      <Input value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} placeholder="e.g. Walk-in, Facebook" />
                    </div>
                    <div className="space-y-2">
                      <Label>Project</Label>
                      <Select value={form.projectId || "none"} onValueChange={(v) => setForm((f) => ({ ...f, projectId: v === "none" ? "" : v }))}>
                        <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No project</SelectItem>
                          {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={handleCreate} disabled={creating || !form.name.trim()} className="w-full">
                    {creating ? "Creating..." : "Add Lead"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Leads Table */}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Card className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50">
                  <TableHead>Lead</TableHead>
                  <TableHead className="hidden md:table-cell">Contact</TableHead>
                  <TableHead className="hidden lg:table-cell">Source</TableHead>
                  <TableHead className="hidden lg:table-cell">Project</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="hidden md:table-cell">Last Contact</TableHead>
                  <TableHead className="hidden sm:table-cell">Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => {
                  const p = getPriorityLabel(lead.priority)
                  return (
                    <TableRow key={lead.id} className="cursor-pointer">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {lead.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-medium">{lead.name}</span>
                            <p className="text-xs text-muted-foreground md:hidden">{lead.phoneRaw}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.phoneRaw || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm hidden lg:table-cell">{lead.source || "—"}</TableCell>
                      <TableCell className="text-sm hidden lg:table-cell">{lead.project?.name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={getStageColor(lead.stage) as any}>
                          {lead.stage.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{lead.owner?.name || "Unassigned"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                        {lead.lastContactedAt ? formatDate(lead.lastContactedAt) : "—"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.className}`}>
                          {p.label}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {leads.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No leads found
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
        title="Import Leads from CSV"
        endpoint="/api/leads/import"
        onSuccess={fetchLeads}
      />
    </>
  )
}
