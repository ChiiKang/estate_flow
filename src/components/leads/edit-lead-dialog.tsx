"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"

const LEAD_STAGES = [
  "NEW", "CONTACTED", "QUALIFIED", "SITE_VISIT", "UNIT_SELECTED",
  "RESERVED", "BOOKED", "SPA_SIGNED", "LOAN_SUBMITTED", "LOAN_APPROVED", "SOLD",
]

const PRIORITIES = [
  { value: "0", label: "Low" },
  { value: "1", label: "Medium" },
  { value: "2", label: "High" },
]

type Lead = {
  id: string
  name: string
  phoneRaw: string | null
  email: string | null
  stage: string
  priority: number
  source: string | null
  campaign: string | null
  notes: string | null
  nextFollowupAt: string | null
  owner: { id: string; name: string } | null
  project: { id: string; name: string } | null
}

export function EditLeadDialog({
  lead,
  open,
  onOpenChange,
  onSuccess,
}: {
  lead: Lead | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [users, setUsers] = useState<{ id: string; name: string }[]>([])
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    stage: "NEW",
    ownerUserId: "",
    projectId: "",
    priority: "0",
    source: "",
    campaign: "",
    nextFollowupAt: "",
    notes: "",
  })

  useEffect(() => {
    if (open) {
      Promise.all([
        fetch("/api/users").then((r) => r.json()).catch(() => []),
        fetch("/api/projects").then((r) => r.json()).catch(() => []),
      ]).then(([u, p]) => {
        setUsers(Array.isArray(u) ? u : [])
        setProjects(Array.isArray(p) ? p : [])
      })

      if (lead) {
        setForm({
          name: lead.name,
          phone: lead.phoneRaw || "",
          email: lead.email || "",
          stage: lead.stage,
          ownerUserId: lead.owner?.id || "",
          projectId: lead.project?.id || "",
          priority: String(lead.priority),
          source: lead.source || "",
          campaign: lead.campaign || "",
          nextFollowupAt: lead.nextFollowupAt ? lead.nextFollowupAt.slice(0, 10) : "",
          notes: lead.notes || "",
        })
        setError("")
      }
    }
  }, [open, lead])

  if (!lead) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Lead</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
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
              <Label>Stage</Label>
              <Select value={form.stage} onValueChange={(v) => setForm((f) => ({ ...f, stage: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAD_STAGES.map((s) => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Owner</Label>
              <Select value={form.ownerUserId || "none"} onValueChange={(v) => setForm((f) => ({ ...f, ownerUserId: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={form.projectId || "none"} onValueChange={(v) => setForm((f) => ({ ...f, projectId: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="No project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Source</Label>
              <Input value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} placeholder="e.g. Walk-in, Facebook" />
            </div>
            <div className="space-y-2">
              <Label>Campaign</Label>
              <Input value={form.campaign} onChange={(e) => setForm((f) => ({ ...f, campaign: e.target.value }))} placeholder="e.g. Launch Promo" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Next Follow-up</Label>
            <Input type="date" value={form.nextFollowupAt} onChange={(e) => setForm((f) => ({ ...f, nextFollowupAt: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={saving || !form.name.trim()}
            onClick={async () => {
              setSaving(true)
              setError("")
              try {
                const res = await fetch(`/api/leads/${lead.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: form.name,
                    phone: form.phone || undefined,
                    email: form.email || undefined,
                    stage: form.stage,
                    ownerUserId: form.ownerUserId || null,
                    projectId: form.projectId || null,
                    priority: parseInt(form.priority),
                    source: form.source || null,
                    campaign: form.campaign || null,
                    nextFollowupAt: form.nextFollowupAt || null,
                    notes: form.notes || null,
                  }),
                })
                if (!res.ok) {
                  const data = await res.json()
                  throw new Error(data.error || "Failed to update")
                }
                onOpenChange(false)
                onSuccess()
              } catch (err: any) {
                setError(err.message)
              } finally {
                setSaving(false)
              }
            }}
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
