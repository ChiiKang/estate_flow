"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Search, MapPin, Grid3X3, Loader2, Building2, DollarSign } from "lucide-react"

const PROJECT_TYPES = [
  { value: "CONDO", label: "Condominium" },
  { value: "APARTMENT", label: "Apartment" },
  { value: "LANDED_HOUSE", label: "Landed House" },
  { value: "TOWNSHIP", label: "Township" },
  { value: "MIXED", label: "Mixed Development" },
]

const PROJECT_TYPE_LABELS: Record<string, string> = {
  CONDO: "Condominium",
  APARTMENT: "Apartment",
  LANDED_HOUSE: "Landed House",
  TOWNSHIP: "Township",
  MIXED: "Mixed Development",
}

type Project = {
  id: string
  name: string
  location: string | null
  status: string
  developer: string | null
  projectType: string | null
  priceMin: string | null
  priceMax: string | null
  _count: { units: number; leads: number; deals: number }
}

function formatCurrency(amount: string | null) {
  if (!amount) return null
  return `RM ${Number(amount).toLocaleString()}`
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    name: "",
    location: "",
    developer: "",
    projectType: "",
    description: "",
  })

  useEffect(() => {
    fetchProjects()
  }, [])

  async function fetchProjects() {
    try {
      const res = await fetch("/api/projects")
      const data = await res.json()
      setProjects(data)
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
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          location: form.location || null,
          developer: form.developer || null,
          projectType: form.projectType || null,
          description: form.description || null,
        }),
      })
      if (res.ok) {
        setForm({ name: "", location: "", developer: "", projectType: "", description: "" })
        setDialogOpen(false)
        fetchProjects()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  const filtered = search
    ? projects.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.location?.toLowerCase().includes(search.toLowerCase()) ||
          p.developer?.toLowerCase().includes(search.toLowerCase())
      )
    : projects

  if (loading) {
    return (
      <>
        <Header title="Projects" subtitle="Manage your property projects" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Projects" subtitle="Manage your property projects" />
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              className="pl-9 w-full sm:w-80"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Project Name *</Label>
                    <Input
                      placeholder="e.g. The Maple Residences"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      placeholder="e.g. Bangsar South, KL"
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Developer</Label>
                    <Input
                      placeholder="e.g. Sime Darby"
                      value={form.developer}
                      onChange={(e) => setForm({ ...form, developer: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Project Type</Label>
                    <Select
                      value={form.projectType}
                      onValueChange={(v) => setForm({ ...form, projectType: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROJECT_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    rows={2}
                    placeholder="Brief project description..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <Button onClick={handleCreate} disabled={creating || !form.name.trim()} className="w-full">
                  {creating ? "Creating..." : "Create Project"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg truncate">{project.name}</CardTitle>
                      {project.location && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          {project.location}
                        </p>
                      )}
                    </div>
                    <Badge variant={project.status === "ACTIVE" ? "available" : "secondary"} className="shrink-0 ml-2">
                      {project.status}
                    </Badge>
                  </div>
                  {/* Extra info row */}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                    {project.developer && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {project.developer}
                      </span>
                    )}
                    {project.projectType && (
                      <span>{PROJECT_TYPE_LABELS[project.projectType] || project.projectType}</span>
                    )}
                    {(project.priceMin || project.priceMax) && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {formatCurrency(project.priceMin)} - {formatCurrency(project.priceMax)}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Units</p>
                      <p className="text-lg font-semibold">{project._count.units}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Leads</p>
                      <p className="text-lg font-semibold">{project._count.leads}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Deals</p>
                      <p className="text-lg font-semibold">{project._count.deals}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Grid3X3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No projects found</p>
          </div>
        )}
      </div>
    </>
  )
}
