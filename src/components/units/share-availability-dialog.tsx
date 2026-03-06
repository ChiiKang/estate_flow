"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Copy, MessageCircle, Loader2, Check } from "lucide-react"

type Project = { id: string; name: string }

export function ShareAvailabilityDialog({
  projects,
  open,
  onOpenChange,
}: {
  projects: Project[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [projectId, setProjectId] = useState("")
  const [text, setText] = useState("")
  const [unitCount, setUnitCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!projectId) { setText(""); return }
    setLoading(true)
    fetch(`/api/units/share?projectId=${projectId}`)
      .then((r) => r.json())
      .then((data) => {
        setText(data.text || "")
        setUnitCount(data.unitCount || 0)
      })
      .catch(() => setText("Error loading availability"))
      .finally(() => setLoading(false))
  }, [projectId])

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setProjectId(""); setText("") } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Availability</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : text ? (
            <>
              <div>
                <Label>Preview ({unitCount} units)</Label>
                <Textarea value={text} readOnly rows={10} className="font-mono text-xs" />
              </div>
            </>
          ) : projectId ? (
            <p className="text-sm text-muted-foreground text-center py-4">No available units</p>
          ) : null}
        </div>
        {text && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(text)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
            >
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button
              onClick={() => {
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank")
              }}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
