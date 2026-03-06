"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"

const PROJECT_TYPES = [
  { value: "CONDO", label: "Condominium" },
  { value: "APARTMENT", label: "Apartment" },
  { value: "LANDED_HOUSE", label: "Landed House" },
  { value: "TOWNSHIP", label: "Township" },
  { value: "MIXED", label: "Mixed Development" },
]

type Project = {
  id: string
  name: string
  location: string | null
  status: string
  developer: string | null
  description: string | null
  projectType: string | null
  launchDate: string | null
  completionDate: string | null
  totalPhases: number | null
  priceMin: string | null
  priceMax: string | null
}

type Props = {
  project: Project
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function EditProjectDialog({ project, open, onOpenChange, onSaved }: Props) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    name: "",
    location: "",
    status: "ACTIVE",
    developer: "",
    description: "",
    projectType: "",
    launchDate: "",
    completionDate: "",
    totalPhases: "",
    priceMin: "",
    priceMax: "",
  })

  useEffect(() => {
    if (open && project) {
      setForm({
        name: project.name || "",
        location: project.location || "",
        status: project.status || "ACTIVE",
        developer: project.developer || "",
        description: project.description || "",
        projectType: project.projectType || "",
        launchDate: project.launchDate ? project.launchDate.split("T")[0] : "",
        completionDate: project.completionDate ? project.completionDate.split("T")[0] : "",
        totalPhases: project.totalPhases?.toString() || "",
        priceMin: project.priceMin?.toString() || "",
        priceMax: project.priceMax?.toString() || "",
      })
      setError("")
    }
  }, [open, project])

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    setError("")
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          location: form.location || null,
          status: form.status,
          developer: form.developer || null,
          description: form.description || null,
          projectType: form.projectType || null,
          launchDate: form.launchDate || null,
          completionDate: form.completionDate || null,
          totalPhases: form.totalPhases || null,
          priceMin: form.priceMin || null,
          priceMax: form.priceMax || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save")
      }
      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Project Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Developer</Label>
              <Input
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
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Total Phases</Label>
              <Input
                type="number"
                value={form.totalPhases}
                onChange={(e) => setForm({ ...form, totalPhases: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Launch Date</Label>
              <Input
                type="date"
                value={form.launchDate}
                onChange={(e) => setForm({ ...form, launchDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Completion Date</Label>
              <Input
                type="date"
                value={form.completionDate}
                onChange={(e) => setForm({ ...form, completionDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Min Price (RM)</Label>
              <Input
                type="number"
                value={form.priceMin}
                onChange={(e) => setForm({ ...form, priceMin: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Price (RM)</Label>
              <Input
                type="number"
                value={form.priceMax}
                onChange={(e) => setForm({ ...form, priceMax: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
