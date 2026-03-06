"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"

const CATEGORIES = [
  { value: "FOLLOW_UP", label: "Follow Up" },
  { value: "SITE_VISIT", label: "Site Visit" },
  { value: "RESERVATION", label: "Reservation" },
  { value: "PAYMENT", label: "Payment" },
  { value: "BOOKING", label: "Booking" },
  { value: "CUSTOM", label: "Custom" },
]

const VARIABLES = [
  { key: "buyer_name", label: "Buyer Name" },
  { key: "agent_name", label: "Agent Name" },
  { key: "project_name", label: "Project Name" },
  { key: "unit_no", label: "Unit No." },
  { key: "unit_type", label: "Unit Type" },
  { key: "unit_price", label: "Unit Price" },
  { key: "unit_size", label: "Unit Size" },
  { key: "company_name", label: "Company" },
]

const SAMPLE_DATA: Record<string, string> = {
  buyer_name: "Ahmad Razif",
  agent_name: "Sarah Lim",
  project_name: "Residensi Angkasa",
  unit_no: "A-12-08",
  unit_type: "3 Bedroom",
  unit_price: "RM 680,000",
  unit_size: "1,050 sqft",
  company_name: "EstateFlow Realty",
}

function substituteVariables(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => variables[key] || match)
}

function getCategoryFromName(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes("follow")) return "FOLLOW_UP"
  if (lower.includes("site") || lower.includes("visit")) return "SITE_VISIT"
  if (lower.includes("reserv")) return "RESERVATION"
  if (lower.includes("payment") || lower.includes("reminder")) return "PAYMENT"
  if (lower.includes("booking") || lower.includes("confirm")) return "BOOKING"
  return "CUSTOM"
}

type Project = { id: string; name: string }

type Template = {
  id: string
  name: string
  content: string
  projectId?: string | null
  project?: { name: string } | null
  createdAt?: string
  updatedAt?: string
}

interface TemplateEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template?: Template | null
  projects: Project[]
  onSaved: (template: Template) => void
}

export function TemplateEditorDialog({
  open,
  onOpenChange,
  template,
  projects,
  onSaved,
}: TemplateEditorDialogProps) {
  const isEditing = !!template
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [name, setName] = useState("")
  const [category, setCategory] = useState("CUSTOM")
  const [projectId, setProjectId] = useState<string>("none")
  const [content, setContent] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // Populate form when editing
  useEffect(() => {
    if (open) {
      if (template) {
        setName(template.name)
        setCategory(getCategoryFromName(template.name))
        setProjectId(template.projectId || "none")
        setContent(template.content)
      } else {
        setName("")
        setCategory("CUSTOM")
        setProjectId("none")
        setContent("")
      }
      setError("")
    }
  }, [open, template])

  function insertVariable(key: string) {
    const el = textareaRef.current
    if (!el) {
      setContent((c) => c + `{{${key}}}`)
      return
    }
    const start = el.selectionStart ?? content.length
    const end = el.selectionEnd ?? content.length
    const token = `{{${key}}}`
    const next = content.slice(0, start) + token + content.slice(end)
    setContent(next)
    // Restore cursor after insertion
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + token.length, start + token.length)
    }, 0)
  }

  function buildFinalName(): string {
    if (!name.trim()) return ""
    const catLabel = CATEGORIES.find((c) => c.value === category)?.label
    // Avoid doubling the category if it's already in the name
    if (catLabel && !name.toLowerCase().includes(catLabel.toLowerCase())) {
      return `${catLabel} - ${name.trim()}`
    }
    return name.trim()
  }

  async function handleSave() {
    const finalName = buildFinalName()
    if (!finalName) {
      setError("Name is required")
      return
    }
    if (!content.trim()) {
      setError("Content is required")
      return
    }
    setSaving(true)
    setError("")
    try {
      const url = isEditing
        ? `/api/messages/templates/${template!.id}`
        : "/api/messages/templates"
      const method = isEditing ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: finalName,
          content: content.trim(),
          projectId: projectId === "none" ? null : projectId,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to save template")
        return
      }
      const saved = await res.json()
      onSaved(saved)
      onOpenChange(false)
    } catch {
      setError("Failed to save template")
    } finally {
      setSaving(false)
    }
  }

  const preview = substituteVariables(content, SAMPLE_DATA)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#2d3a2e]">
            {isEditing ? "Edit Template" : "Create Template"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Name + Category row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[#2d3a2e] font-medium">Template Name</Label>
              <Input
                placeholder="e.g. New Lead Follow-Up"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border-[#c9b99a] focus-visible:ring-[#4a6350]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[#2d3a2e] font-medium">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="border-[#c9b99a] focus:ring-[#4a6350]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Project selector */}
          <div className="space-y-1.5">
            <Label className="text-[#2d3a2e] font-medium">Project (optional)</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="border-[#c9b99a] focus:ring-[#4a6350]">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All Projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Variable insertion buttons */}
          <div className="space-y-2">
            <Label className="text-[#2d3a2e] font-medium">Insert Variable</Label>
            <div className="flex flex-wrap gap-1.5">
              {VARIABLES.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insertVariable(v.key)}
                  className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-[#f0ebe3] text-[#4a6350] border border-[#c9b99a] hover:bg-[#c9b99a]/30 transition-colors"
                >
                  {`{{${v.key}}}`}
                </button>
              ))}
            </div>
          </div>

          {/* Content textarea */}
          <div className="space-y-1.5">
            <Label className="text-[#2d3a2e] font-medium">Message Content</Label>
            <Textarea
              ref={textareaRef}
              placeholder="Type your message here. Click variable buttons above to insert them."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={7}
              className="border-[#c9b99a] focus-visible:ring-[#4a6350] font-mono text-sm resize-none"
            />
            <p className="text-xs text-[#6b7280]">
              {content.length} characters
            </p>
          </div>

          {/* Live preview */}
          {content.trim() && (
            <div className="space-y-1.5">
              <Label className="text-[#2d3a2e] font-medium">Preview</Label>
              <div className="rounded-xl bg-[#f9f6f0] border border-[#c9b99a]/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-[#2d3a2e]">WhatsApp Preview</span>
                  <Badge className="ml-auto bg-[#4a6350]/10 text-[#4a6350] border-0 text-xs">
                    Sample data
                  </Badge>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm max-w-xs ml-auto">
                  <p className="text-sm text-[#2d3a2e] whitespace-pre-wrap leading-relaxed">
                    {preview}
                  </p>
                  <p className="text-[10px] text-[#9ca3af] text-right mt-1">
                    {new Date().toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-[#c9b99a] text-[#4a6350] hover:bg-[#f0ebe3]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#4a6350] hover:bg-[#2d3a2e] text-white"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Template"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
