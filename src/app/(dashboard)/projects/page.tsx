"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Search, MapPin, Grid3X3, Loader2 } from "lucide-react"

type Project = {
  id: string
  name: string
  location: string | null
  status: string
  _count: { units: number; leads: number; deals: number }
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [newLocation, setNewLocation] = useState("")

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
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, location: newLocation || null }),
      })
      if (res.ok) {
        setNewName("")
        setNewLocation("")
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
    ? projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
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
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Project Name</Label>
                  <Input
                    placeholder="e.g. The Maple Residences"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    placeholder="e.g. Bangsar South, KL"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                  />
                </div>
                <Button onClick={handleCreate} disabled={creating || !newName.trim()} className="w-full">
                  {creating ? "Creating..." : "Create Project"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    {project.location && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {project.location}
                      </p>
                    )}
                  </div>
                  <Badge variant={project.status === "ACTIVE" ? "available" : "secondary"}>
                    {project.status}
                  </Badge>
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
