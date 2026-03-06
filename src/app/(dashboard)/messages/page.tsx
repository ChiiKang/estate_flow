"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  MessageSquare,
  Send,
  Plus,
  Pencil,
  Trash2,
  Copy,
  ExternalLink,
  Phone,
  Search,
  Loader2,
  MoreHorizontal,
  Sparkles,
} from "lucide-react"
import { formatDateTime } from "@/lib/utils"
import { TemplateEditorDialog } from "@/components/messages/template-editor-dialog"
import { WhatsAppSendDialog } from "@/components/messages/whatsapp-send-dialog"

// ─── Types ────────────────────────────────────────────────────────────────────

type Template = {
  id: string
  name: string
  content: string
  projectId?: string | null
  project?: { name: string } | null
  createdAt?: string
  updatedAt?: string
}

type Lead = {
  id: string
  name: string
  phoneE164: string | null
  phoneRaw: string | null
  project?: { id: string; name: string } | null
}

type Project = { id: string; name: string }

type Message = {
  id: string
  channel: string
  direction: string
  content: string
  toPhoneE164: string | null
  deliveryStatus: string | null
  createdAt: string
  lead: { id: string; name: string; phoneE164: string | null } | null
  template: { id: string; name: string } | null
}

type DealSummary = {
  id: string
  leadId: string | null
  unit?: {
    unitNo: string
    unitType: string
    sizeSqm: number | null
    basePrice: number | null
  } | null
  project?: { id: string; name: string } | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  "Follow Up": "bg-blue-100 text-blue-700 border-blue-200",
  "Site Visit": "bg-purple-100 text-purple-700 border-purple-200",
  Reservation: "bg-amber-100 text-amber-700 border-amber-200",
  Payment: "bg-red-100 text-red-700 border-red-200",
  Booking: "bg-green-100 text-green-700 border-green-200",
  Custom: "bg-[#f0ebe3] text-[#4a6350] border-[#c9b99a]",
}

function extractCategory(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes("follow")) return "Follow Up"
  if (lower.includes("site") || lower.includes("visit")) return "Site Visit"
  if (lower.includes("reserv")) return "Reservation"
  if (lower.includes("payment") || lower.includes("reminder")) return "Payment"
  if (lower.includes("booking") || lower.includes("confirm")) return "Booking"
  return "Custom"
}

function highlightVariables(text: string): string {
  return text.replace(
    /\{\{(\w+)\}\}/g,
    '<span class="inline-flex items-center px-1 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#4a6350]/10 text-[#4a6350] border border-[#4a6350]/20">{{$1}}</span>'
  )
}

const DEFAULT_TEMPLATES = [
  {
    name: "Follow Up - New Lead",
    content:
      "Hi {{buyer_name}}, this is {{agent_name}} from {{company_name}}.\n\nThank you for your interest in {{project_name}}! I'd love to help you find the perfect unit.\n\nWould you be available for a site visit this week?\n\nLooking forward to hearing from you!",
  },
  {
    name: "Site Visit - Invitation",
    content:
      "Hi {{buyer_name}}, following up on our conversation about {{project_name}}.\n\nI'd like to invite you for a site visit to see the show unit and facilities. We have slots available this weekend.\n\nWould Saturday or Sunday work better for you?",
  },
  {
    name: "Reservation - Unit Confirmation",
    content:
      "Hi {{buyer_name}}, great news!\n\nUnit {{unit_no}} at {{project_name}} has been reserved for you.\n\nDetails:\n- Unit: {{unit_no}} ({{unit_type}}, {{unit_size}})\n- Price: {{unit_price}}\n\nPlease complete the booking within 14 days. Let me know if you have any questions!",
  },
  {
    name: "Payment - Reminder",
    content:
      "Hi {{buyer_name}}, this is a friendly reminder regarding your payment for {{project_name}}.\n\nPlease arrange the payment at your earliest convenience. Feel free to reach out if you need any assistance.",
  },
  {
    name: "Booking - Confirmation",
    content:
      "Hi {{buyer_name}}, congratulations!\n\nYour booking for {{unit_no}} at {{project_name}} is now confirmed.\n\nNext steps:\n1. SPA signing appointment will be arranged\n2. Loan application (if applicable)\n\nThank you for choosing {{company_name}}!",
  },
]

const ALL_CATEGORIES = [
  "ALL",
  "Follow Up",
  "Site Visit",
  "Reservation",
  "Payment",
  "Booking",
  "Custom",
]

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [orgName, setOrgName] = useState("EstateFlow Realty")
  const [userName, setUserName] = useState("")

  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(true)
  const [seedingDefaults, setSeedingDefaults] = useState(false)

  const [templateSearch, setTemplateSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("ALL")
  const [historySearch, setHistorySearch] = useState("")

  // Dialogs
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [sendOpen, setSendOpen] = useState(false)
  const [sendLeadId, setSendLeadId] = useState<string | null>(null)
  const [sendTemplateId, setSendTemplateId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    loadTemplates()
    loadMessages()

    fetch("/api/leads?limit=200")
      .then((r) => r.json())
      .then((data) => setLeads(data.leads || []))
      .catch(console.error)

    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => setProjects(Array.isArray(data) ? data : []))
      .catch(console.error)

    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (data?.user?.name) setUserName(data.user.name)
        if (data?.user?.orgName) setOrgName(data.user.orgName)
      })
      .catch(console.error)
  }, [])

  function loadTemplates() {
    setLoadingTemplates(true)
    fetch("/api/messages/templates")
      .then((r) => r.json())
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoadingTemplates(false))
  }

  function loadMessages() {
    setLoadingMessages(true)
    fetch("/api/messages?limit=100")
      .then((r) => r.json())
      .then((data) => setMessages(Array.isArray(data.messages) ? data.messages : []))
      .catch(console.error)
      .finally(() => setLoadingMessages(false))
  }

  async function seedDefaultTemplates() {
    setSeedingDefaults(true)
    try {
      await Promise.all(
        DEFAULT_TEMPLATES.map((t) =>
          fetch("/api/messages/templates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(t),
          })
        )
      )
      loadTemplates()
    } catch (err) {
      console.error("Failed to seed templates", err)
    } finally {
      setSeedingDefaults(false)
    }
  }

  function handleEditTemplate(template: Template) {
    setEditingTemplate(template)
    setEditorOpen(true)
  }

  function handleNewTemplate() {
    setEditingTemplate(null)
    setEditorOpen(true)
  }

  async function handleDeleteTemplate(id: string) {
    setDeletingId(id)
    try {
      await fetch(`/api/messages/templates/${id}`, { method: "DELETE" })
      setTemplates((prev) => prev.filter((t) => t.id !== id))
    } catch (err) {
      console.error(err)
    } finally {
      setDeletingId(null)
    }
  }

  function handleTemplateSaved(saved: Template) {
    setTemplates((prev) => {
      const idx = prev.findIndex((t) => t.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [saved, ...prev]
    })
  }

  function handleUseTemplate(template: Template) {
    setSendTemplateId(template.id)
    setSendLeadId(null)
    setSendOpen(true)
  }

  function handleQuickSend() {
    setSendLeadId(null)
    setSendTemplateId(null)
    setSendOpen(true)
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // silent fail
    }
  }

  const filteredTemplates = templates.filter((t) => {
    const cat = extractCategory(t.name)
    const matchCat = categoryFilter === "ALL" || cat === categoryFilter
    const matchSearch =
      !templateSearch ||
      t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
      t.content.toLowerCase().includes(templateSearch.toLowerCase())
    return matchCat && matchSearch
  })

  const filteredMessages = messages.filter((m) => {
    if (!historySearch) return true
    const s = historySearch.toLowerCase()
    return (
      m.lead?.name?.toLowerCase().includes(s) ||
      m.content?.toLowerCase().includes(s) ||
      m.template?.name?.toLowerCase().includes(s) ||
      false
    )
  })

  return (
    <>
      <Header
        title="Messages"
        subtitle="WhatsApp templates and communication history"
      />

      <div className="p-4 sm:p-6 space-y-6">
        <Tabs defaultValue="templates">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <TabsList className="bg-[#f0ebe3] border border-[#c9b99a]/50">
              <TabsTrigger
                value="templates"
                className="data-[state=active]:bg-[#4a6350] data-[state=active]:text-white"
              >
                <MessageSquare className="w-4 h-4 mr-1.5" />
                Templates
                {templates.length > 0 && (
                  <Badge className="ml-1.5 bg-[#4a6350]/20 text-[#4a6350] border-0 text-[10px] px-1.5 py-0">
                    {templates.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="send"
                className="data-[state=active]:bg-[#25D366] data-[state=active]:text-white"
              >
                <Send className="w-4 h-4 mr-1.5" />
                Quick Send
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="data-[state=active]:bg-[#4a6350] data-[state=active]:text-white"
              >
                <Phone className="w-4 h-4 mr-1.5" />
                History
                {messages.length > 0 && (
                  <Badge className="ml-1.5 bg-[#4a6350]/20 text-[#4a6350] border-0 text-[10px] px-1.5 py-0">
                    {messages.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <Button
              onClick={handleQuickSend}
              className="bg-[#25D366] hover:bg-[#20BA5A] text-white gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Send WhatsApp
            </Button>
          </div>

          {/* ── TEMPLATES TAB ──────────────────────────────────────────── */}
          <TabsContent value="templates" className="mt-6 space-y-5">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
                <Input
                  placeholder="Search templates..."
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  className="pl-9 border-[#c9b99a] focus-visible:ring-[#4a6350]"
                />
              </div>
              <Button
                onClick={handleNewTemplate}
                className="bg-[#4a6350] hover:bg-[#2d3a2e] text-white gap-2 shrink-0"
              >
                <Plus className="w-4 h-4" />
                New Template
              </Button>
            </div>

            {/* Category filter pills */}
            <div className="flex gap-2 flex-wrap">
              {ALL_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    categoryFilter === cat
                      ? "bg-[#4a6350] text-white border-[#4a6350]"
                      : "bg-white text-[#4a6350] border-[#c9b99a] hover:bg-[#f0ebe3]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Loading */}
            {loadingTemplates && (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-[#4a6350]" />
              </div>
            )}

            {/* Empty state */}
            {!loadingTemplates && templates.length === 0 && (
              <div className="text-center py-16 space-y-4">
                <div className="w-14 h-14 rounded-full bg-[#f0ebe3] flex items-center justify-center mx-auto">
                  <MessageSquare className="w-7 h-7 text-[#4a6350]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#2d3a2e] text-lg">No templates yet</h3>
                  <p className="text-[#6b7280] text-sm mt-1">
                    Create your first template or load the defaults to get started.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <Button
                    onClick={seedDefaultTemplates}
                    disabled={seedingDefaults}
                    variant="outline"
                    className="border-[#4a6350] text-[#4a6350] hover:bg-[#f0ebe3] gap-2"
                  >
                    {seedingDefaults ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    Load Default Templates
                  </Button>
                  <Button
                    onClick={handleNewTemplate}
                    className="bg-[#4a6350] hover:bg-[#2d3a2e] text-white gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create Template
                  </Button>
                </div>
              </div>
            )}

            {/* Template grid */}
            {!loadingTemplates && filteredTemplates.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredTemplates.map((template) => {
                  const category = extractCategory(template.name)
                  const catColor = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.Custom
                  const isDeletingThis = deletingId === template.id

                  return (
                    <Card
                      key={template.id}
                      className="border-[#c9b99a]/50 hover:border-[#4a6350]/40 hover:shadow-md transition-all duration-200 group"
                    >
                      <CardContent className="p-4 space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-[#2d3a2e] text-sm leading-tight truncate">
                              {template.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <Badge
                                className={`text-[10px] px-2 py-0.5 border font-medium ${catColor}`}
                              >
                                {category}
                              </Badge>
                              {template.project && (
                                <span className="text-[10px] text-[#6b7280] bg-[#f9f6f0] px-1.5 py-0.5 rounded border border-[#c9b99a]/50">
                                  {template.project.name}
                                </span>
                              )}
                            </div>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1 rounded hover:bg-[#f0ebe3] text-[#9ca3af] hover:text-[#4a6350] transition-colors">
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem
                                onClick={() => handleUseTemplate(template)}
                                className="gap-2 cursor-pointer"
                              >
                                <Send className="w-3.5 h-3.5 text-[#25D366]" />
                                <span className="text-[#25D366]">Use Template</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => copyToClipboard(template.content)}
                                className="gap-2 cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                Copy Content
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEditTemplate(template)}
                                className="gap-2 cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteTemplate(template.id)}
                                className="gap-2 cursor-pointer text-red-600 focus:text-red-600"
                                disabled={isDeletingThis}
                              >
                                {isDeletingThis ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Content preview */}
                        <div className="bg-[#f9f6f0] rounded-lg p-3 min-h-[80px]">
                          <p
                            className="text-xs text-[#4a6350] leading-relaxed line-clamp-4"
                            dangerouslySetInnerHTML={{
                              __html: highlightVariables(
                                template.content.slice(0, 220) +
                                  (template.content.length > 220 ? "..." : "")
                              ),
                            }}
                          />
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            onClick={() => handleUseTemplate(template)}
                            className="flex-1 bg-[#25D366] hover:bg-[#20BA5A] text-white text-xs h-8 gap-1.5"
                          >
                            <Send className="w-3 h-3" />
                            Use Template
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditTemplate(template)}
                            className="border-[#c9b99a] text-[#4a6350] hover:bg-[#f0ebe3] h-8 w-8 p-0"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(template.content)}
                            className="border-[#c9b99a] text-[#4a6350] hover:bg-[#f0ebe3] h-8 w-8 p-0"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            {/* No filter results */}
            {!loadingTemplates &&
              templates.length > 0 &&
              filteredTemplates.length === 0 && (
                <div className="text-center py-12 text-[#6b7280]">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No templates match your search</p>
                </div>
              )}

            {/* Seed defaults when fewer than 5 templates */}
            {!loadingTemplates && templates.length > 0 && templates.length < 5 && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="ghost"
                  onClick={seedDefaultTemplates}
                  disabled={seedingDefaults}
                  className="text-[#4a6350] hover:bg-[#f0ebe3] gap-2 text-sm"
                >
                  {seedingDefaults ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Load Default Templates
                </Button>
              </div>
            )}
          </TabsContent>

          {/* ── QUICK SEND TAB ────────────────────────────────────────── */}
          <TabsContent value="send" className="mt-6">
            <QuickSendPanel
              leads={leads}
              templates={templates}
              orgName={orgName}
              userName={userName}
              onMessageSent={loadMessages}
            />
          </TabsContent>

          {/* ── HISTORY TAB ───────────────────────────────────────────── */}
          <TabsContent value="history" className="mt-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
                <Input
                  placeholder="Search by lead, template, or message content..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="pl-9 border-[#c9b99a] focus-visible:ring-[#4a6350]"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadMessages}
                className="border-[#c9b99a] text-[#4a6350] hover:bg-[#f0ebe3]"
              >
                Refresh
              </Button>
            </div>

            {loadingMessages ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-[#4a6350]" />
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-14 h-14 rounded-full bg-[#f0ebe3] flex items-center justify-center mx-auto">
                  <Phone className="w-7 h-7 text-[#4a6350]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#2d3a2e]">No messages yet</h3>
                  <p className="text-[#6b7280] text-sm mt-1">
                    Messages sent via Quick Send will appear here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-[#c9b99a]/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#f9f6f0] hover:bg-[#f9f6f0]">
                      <TableHead className="text-[#4a6350] font-semibold">Lead</TableHead>
                      <TableHead className="text-[#4a6350] font-semibold">Channel</TableHead>
                      <TableHead className="text-[#4a6350] font-semibold">Template</TableHead>
                      <TableHead className="text-[#4a6350] font-semibold">Preview</TableHead>
                      <TableHead className="text-[#4a6350] font-semibold">Status</TableHead>
                      <TableHead className="text-[#4a6350] font-semibold">Sent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMessages.map((msg) => (
                      <TableRow
                        key={msg.id}
                        className="hover:bg-[#f9f6f0]/50 border-[#c9b99a]/30"
                      >
                        <TableCell>
                          {msg.lead ? (
                            <div>
                              <p className="font-medium text-[#2d3a2e] text-sm">
                                {msg.lead.name}
                              </p>
                              {msg.toPhoneE164 && (
                                <p className="text-xs text-[#6b7280] font-mono mt-0.5">
                                  {msg.toPhoneE164}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-[#9ca3af] text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              msg.channel === "WHATSAPP"
                                ? "bg-green-100 text-green-700 border-green-200 text-xs"
                                : "bg-blue-100 text-blue-700 border-blue-200 text-xs"
                            }
                          >
                            {msg.channel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {msg.template ? (
                            <span className="text-xs text-[#4a6350] bg-[#f0ebe3] px-2 py-0.5 rounded border border-[#c9b99a]/50">
                              {msg.template.name}
                            </span>
                          ) : (
                            <span className="text-[#9ca3af] text-xs">Manual</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[220px]">
                          <p className="text-xs text-[#6b7280] truncate">{msg.content}</p>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              msg.deliveryStatus === "SENT"
                                ? "bg-green-50 text-green-600 border-green-200 text-xs"
                                : msg.deliveryStatus === "FAILED"
                                ? "bg-red-50 text-red-600 border-red-200 text-xs"
                                : "bg-gray-50 text-gray-500 border-gray-200 text-xs"
                            }
                          >
                            {msg.deliveryStatus ?? "SENT"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-[#6b7280] whitespace-nowrap">
                          {formatDateTime(msg.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Template editor dialog */}
      <TemplateEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        template={editingTemplate}
        projects={projects}
        onSaved={handleTemplateSaved}
      />

      {/* WhatsApp send dialog */}
      <WhatsAppSendDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        leads={leads}
        templates={templates}
        orgName={orgName}
        userName={userName}
        defaultLeadId={sendLeadId}
        defaultTemplateId={sendTemplateId}
        onSent={loadMessages}
      />
    </>
  )
}

// ─── Quick Send Panel ─────────────────────────────────────────────────────────

function QuickSendPanel({
  leads,
  templates,
  orgName,
  userName,
  onMessageSent,
}: {
  leads: Lead[]
  templates: Template[]
  orgName: string
  userName: string
  onMessageSent: () => void
}) {
  const [selectedLeadId, setSelectedLeadId] = useState<string>("none")
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("none")
  const [message, setMessage] = useState("")
  const [deals, setDeals] = useState<DealSummary[]>([])
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  const selectedLead = leads.find((l) => l.id === selectedLeadId) ?? null
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) ?? null
  const leadDeal = deals.find((d) => d.leadId === selectedLeadId) ?? null

  useEffect(() => {
    fetch("/api/deals?limit=200")
      .then((r) => r.json())
      .then((data) => setDeals(data.deals || []))
      .catch(console.error)
  }, [])

  function buildVariables(): Record<string, string> {
    const unit = leadDeal?.unit
    const project = leadDeal?.project ?? selectedLead?.project
    return {
      buyer_name: selectedLead?.name || "{{buyer_name}}",
      agent_name: userName || "{{agent_name}}",
      project_name: project?.name || "{{project_name}}",
      unit_no: unit?.unitNo || "{{unit_no}}",
      unit_type: unit?.unitType || "{{unit_type}}",
      unit_price: unit?.basePrice
        ? new Intl.NumberFormat("en-MY", {
            style: "currency",
            currency: "MYR",
            minimumFractionDigits: 0,
          }).format(unit.basePrice)
        : "{{unit_price}}",
      unit_size: unit?.sizeSqm ? `${unit.sizeSqm} sqm` : "{{unit_size}}",
      company_name: orgName || "{{company_name}}",
    }
  }

  useEffect(() => {
    if (selectedTemplate) {
      const vars = buildVariables()
      const substituted = selectedTemplate.content.replace(
        /\{\{(\w+)\}\}/g,
        (_match: string, key: string) => vars[key] || `{{${key}}}`
      )
      setMessage(substituted)
    } else {
      setMessage("")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplateId, selectedLeadId, deals])

  async function handleSend() {
    if (!selectedLead || !selectedLead.phoneE164 || !message.trim()) return
    setSending(true)
    setError("")
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: selectedLead.id,
          channel: "WHATSAPP",
          direction: "OUTBOUND",
          toPhoneE164: selectedLead.phoneE164,
          content: message,
          templateId: selectedTemplate?.id || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to log message")
        return
      }
      const cleanPhone = selectedLead.phoneE164.replace(/[^0-9]/g, "")
      window.open(
        `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`,
        "_blank",
        "noopener,noreferrer"
      )
      setSent(true)
      onMessageSent()
      setTimeout(() => setSent(false), 3000)
    } catch {
      setError("An error occurred. Please try again.")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border-[#c9b99a]/50">
        <CardContent className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3 pb-2 border-b border-[#c9b99a]/30">
            <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-[#2d3a2e]">Quick Send via WhatsApp</h2>
              <p className="text-xs text-[#6b7280]">
                Select a lead and optional template — opens directly in WhatsApp
              </p>
            </div>
          </div>

          {/* Lead selector */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#2d3a2e]">Select Lead</label>
            <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
              <SelectTrigger className="border-[#c9b99a] focus:ring-[#4a6350]">
                <SelectValue placeholder="Choose a lead..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" disabled>
                  Choose a lead...
                </SelectItem>
                {leads.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {lead.name}
                    {lead.phoneE164 ? ` — ${lead.phoneE164}` : " — No phone"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedLead && (
              <div className="flex items-center gap-1.5 text-xs mt-1">
                <Phone className="w-3 h-3 text-[#6b7280]" />
                {selectedLead.phoneE164 ? (
                  <span className="font-mono text-[#6b7280]">{selectedLead.phoneE164}</span>
                ) : (
                  <span className="text-amber-600">No phone number — WhatsApp unavailable</span>
                )}
              </div>
            )}
          </div>

          {/* Template selector */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#2d3a2e]">Template (optional)</label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger className="border-[#c9b99a] focus:ring-[#4a6350]">
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No template — write freely</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Message editor */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#2d3a2e]">Message</label>
            <textarea
              placeholder="Type your message or select a template above..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={7}
              className="w-full rounded-md border border-[#c9b99a] bg-white px-3 py-2 text-sm text-[#2d3a2e] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#4a6350] resize-none"
            />
            <p className="text-xs text-[#9ca3af]">{message.length} characters</p>
          </div>

          {/* Live preview */}
          {message.trim() && selectedLead && selectedLead.phoneE164 && (
            <div className="rounded-xl bg-[#ECE5DD] p-4 space-y-2">
              <p className="text-xs font-medium text-[#6b7280] uppercase tracking-wide mb-2">
                Preview
              </p>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-[#4a6350] flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {selectedLead.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-[#2d3a2e]">
                  {selectedLead.name}
                </span>
                <span className="text-xs text-[#6b7280] font-mono ml-auto">
                  {selectedLead.phoneE164}
                </span>
              </div>
              <div className="bg-[#DCF8C6] rounded-lg rounded-tl-none p-3 shadow-sm max-w-sm">
                <p className="text-sm text-[#2d3a2e] whitespace-pre-wrap leading-relaxed">
                  {message}
                </p>
                <p className="text-[10px] text-[#6b7280] text-right mt-1">
                  {new Date().toLocaleTimeString("en-MY", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {sent && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              Message logged and WhatsApp opened successfully!
            </p>
          )}

          <Button
            onClick={handleSend}
            disabled={
              sending ||
              !selectedLead ||
              !selectedLead.phoneE164 ||
              !message.trim()
            }
            className="w-full bg-[#25D366] hover:bg-[#20BA5A] text-white gap-2 h-11 text-base font-medium"
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ExternalLink className="h-5 w-5" />
            )}
            Send via WhatsApp
          </Button>

          {selectedLead && !selectedLead.phoneE164 && (
            <p className="text-xs text-center text-amber-600">
              This lead has no phone number. Add one to enable WhatsApp sending.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
