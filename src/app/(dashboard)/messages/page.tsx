"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
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
import { Plus, Search, Copy, Send, Loader2 } from "lucide-react"
import { formatDateTime } from "@/lib/utils"

type Template = {
  id: string
  name: string
  content: string
  project?: { name: string } | null
  createdAt: string
}

type Lead = { id: string; name: string; phoneE164: string | null }

function getChannelColor(channel: string) {
  switch (channel) {
    case "WHATSAPP": return "available"
    case "EMAIL": return "booked"
    case "SMS": return "accent"
    case "CALL_LOG": return "reserved"
    default: return "secondary"
  }
}

export default function MessagesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [leads, setLeads] = useState<Lead[]>([])
  const [composeForm, setComposeForm] = useState({ leadId: "", channel: "WHATSAPP", content: "" })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    // Fetch templates
    fetch("/api/messages/templates")
      .then((r) => r.json())
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoadingTemplates(false))

    // Fetch leads for compose dropdown
    fetch("/api/leads?limit=100")
      .then((r) => r.json())
      .then((data) => setLeads(data.leads || []))
      .catch(console.error)
  }, [])

  async function handleSend() {
    if (!composeForm.leadId || !composeForm.content.trim()) return
    setSending(true)
    try {
      const lead = leads.find((l) => l.id === composeForm.leadId)
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: composeForm.leadId,
          channel: composeForm.channel,
          direction: "OUTBOUND",
          toPhoneE164: lead?.phoneE164 || null,
          content: composeForm.content,
        }),
      })
      if (res.ok) {
        setComposeForm((f) => ({ ...f, content: "" }))
        setSent(true)
        setTimeout(() => setSent(false), 3000)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSending(false)
    }
  }

  function useTemplate(content: string) {
    setComposeForm((f) => ({ ...f, content }))
  }

  return (
    <>
      <Header title="Messages" subtitle="Communication templates and logs" />
      <div className="p-4 sm:p-6 space-y-6">
        <Tabs defaultValue="templates">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="w-max sm:w-auto">
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="compose">Compose</TabsTrigger>
            </TabsList>
          </div>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            {loadingTemplates ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No templates yet. Create one in Phase 3.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => (
                  <Card key={template.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">
                            {template.project?.name || "All projects"}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => useTemplate(template.content)}>
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground bg-secondary p-3 rounded-lg">
                        {template.content}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Compose Tab */}
          <TabsContent value="compose" className="space-y-4">
            <Card>
              <CardContent className="p-4 sm:p-6 space-y-4">
                {sent && (
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                    Message logged successfully!
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Lead</Label>
                    <Select value={composeForm.leadId || "none"} onValueChange={(v) => setComposeForm((f) => ({ ...f, leadId: v === "none" ? "" : v }))}>
                      <SelectTrigger><SelectValue placeholder="Select lead..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select a lead</SelectItem>
                        {leads.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Channel</Label>
                    <Select value={composeForm.channel} onValueChange={(v) => setComposeForm((f) => ({ ...f, channel: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                        <SelectItem value="EMAIL">Email</SelectItem>
                        <SelectItem value="SMS">SMS</SelectItem>
                        <SelectItem value="CALL_LOG">Call Log</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    placeholder="Type your message or copy a template..."
                    rows={6}
                    value={composeForm.content}
                    onChange={(e) => setComposeForm((f) => ({ ...f, content: e.target.value }))}
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSend} disabled={sending || !composeForm.leadId || !composeForm.content.trim()}>
                    <Send className="w-4 h-4 mr-2" />
                    {sending ? "Sending..." : "Log Message"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
