"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ExternalLink, Loader2, Phone } from "lucide-react"

type Lead = {
  id: string
  name: string
  phoneE164: string | null
  phoneRaw: string | null
  project?: { id: string; name: string } | null
}

type Template = {
  id: string
  name: string
  content: string
  projectId?: string | null
}

type Deal = {
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

interface WhatsAppSendDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leads: Lead[]
  templates: Template[]
  orgName: string
  userName: string
  defaultLeadId?: string | null
  defaultTemplateId?: string | null
  onSent?: () => void
}

function substituteVariables(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => variables[key] || match)
}

function getWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, "")
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
}

function formatPrice(val: number | null | undefined): string {
  if (!val) return ""
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 0,
  }).format(val)
}

export function WhatsAppSendDialog({
  open,
  onOpenChange,
  leads,
  templates,
  orgName,
  userName,
  defaultLeadId,
  defaultTemplateId,
  onSent,
}: WhatsAppSendDialogProps) {
  const [selectedLeadId, setSelectedLeadId] = useState<string>("none")
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("none")
  const [message, setMessage] = useState("")
  const [deals, setDeals] = useState<Deal[]>([])
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  const selectedLead = leads.find((l) => l.id === selectedLeadId) ?? null
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) ?? null
  // Find the best matching deal for this lead
  const leadDeal = deals.find((d) => d.leadId === selectedLeadId) ?? null

  // Fetch deals to get unit context
  useEffect(() => {
    if (!open) return
    fetch("/api/deals?limit=200")
      .then((r) => r.json())
      .then((data) => setDeals(Array.isArray(data.deals) ? data.deals : []))
      .catch(console.error)
  }, [open])

  // Set defaults when opened
  useEffect(() => {
    if (open) {
      setSelectedLeadId(defaultLeadId || "none")
      setSelectedTemplateId(defaultTemplateId || "none")
      setMessage("")
      setSent(false)
      setError("")
    }
  }, [open, defaultLeadId, defaultTemplateId])

  // When template changes, populate message with substituted content
  useEffect(() => {
    if (selectedTemplate) {
      const vars = buildVariables()
      setMessage(substituteVariables(selectedTemplate.content, vars))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplateId, selectedLeadId, deals])

  function buildVariables(): Record<string, string> {
    const unit = leadDeal?.unit
    const project = leadDeal?.project ?? selectedLead?.project
    return {
      buyer_name: selectedLead?.name || "{{buyer_name}}",
      agent_name: userName || "{{agent_name}}",
      project_name: project?.name || "{{project_name}}",
      unit_no: unit?.unitNo || "{{unit_no}}",
      unit_type: unit?.unitType || "{{unit_type}}",
      unit_price: unit?.basePrice ? formatPrice(unit.basePrice) : "{{unit_price}}",
      unit_size: unit?.sizeSqm ? `${unit.sizeSqm} sqm` : "{{unit_size}}",
      company_name: orgName || "{{company_name}}",
    }
  }

  async function handleSend() {
    if (!selectedLead) {
      setError("Please select a lead")
      return
    }
    if (!selectedLead.phoneE164) {
      setError("Selected lead has no phone number")
      return
    }
    if (!message.trim()) {
      setError("Message cannot be empty")
      return
    }

    setSending(true)
    setError("")
    try {
      // Log the message to the database
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

      // Open WhatsApp deep link
      const link = getWhatsAppLink(selectedLead.phoneE164, message)
      window.open(link, "_blank", "noopener,noreferrer")

      setSent(true)
      onSent?.()
      setTimeout(() => {
        setSent(false)
        onOpenChange(false)
      }, 1500)
    } catch {
      setError("An error occurred. Please try again.")
    } finally {
      setSending(false)
    }
  }

  const preview = message
  const hasPhone = !!selectedLead?.phoneE164

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#2d3a2e] flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#25D366] flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="white" className="w-3.5 h-3.5">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            Quick Send via WhatsApp
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Lead selector */}
          <div className="space-y-1.5">
            <Label className="text-[#2d3a2e] font-medium">Select Lead</Label>
            <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
              <SelectTrigger className="border-[#c9b99a] focus:ring-[#4a6350]">
                <SelectValue placeholder="Choose a lead..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" disabled>Choose a lead...</SelectItem>
                {leads.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    <span className="flex items-center gap-2">
                      {lead.name}
                      {lead.phoneE164 && (
                        <span className="text-[#6b7280] text-xs">{lead.phoneE164}</span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedLead && (
              <div className="flex items-center gap-1.5 text-xs text-[#6b7280] mt-1">
                <Phone className="w-3 h-3" />
                {selectedLead.phoneE164 ? (
                  <span className="font-mono">{selectedLead.phoneE164}</span>
                ) : (
                  <span className="text-amber-600">No phone number on file</span>
                )}
              </div>
            )}
          </div>

          {/* Template selector */}
          <div className="space-y-1.5">
            <Label className="text-[#2d3a2e] font-medium">Template (optional)</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger className="border-[#c9b99a] focus:ring-[#4a6350]">
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No template (write freely)</SelectItem>
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
            <Label className="text-[#2d3a2e] font-medium">Message</Label>
            <Textarea
              placeholder="Type your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={7}
              className="border-[#c9b99a] focus-visible:ring-[#4a6350] text-sm resize-none"
            />
            <p className="text-xs text-[#6b7280]">{message.length} characters</p>
          </div>

          {/* Live preview */}
          {message.trim() && selectedLead && (
            <div className="space-y-1.5">
              <Label className="text-[#2d3a2e] font-medium">Preview</Label>
              <div className="rounded-xl bg-[#ECE5DD] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-[#4a6350] flex items-center justify-center text-white text-xs font-bold">
                    {selectedLead.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#2d3a2e]">{selectedLead.name}</p>
                    <p className="text-xs text-[#6b7280] font-mono">{selectedLead.phoneE164 || "—"}</p>
                  </div>
                </div>
                <div className="bg-[#DCF8C6] rounded-lg rounded-tl-none p-3 shadow-sm max-w-xs">
                  <p className="text-sm text-[#2d3a2e] whitespace-pre-wrap leading-relaxed">
                    {preview}
                  </p>
                  <p className="text-[10px] text-[#6b7280] text-right mt-1">
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

          {sent && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              Message logged and WhatsApp opened successfully!
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
              onClick={handleSend}
              disabled={sending || !selectedLead || !hasPhone || !message.trim()}
              className="bg-[#25D366] hover:bg-[#20BA5A] text-white gap-2"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              Send via WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
