"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Send } from "lucide-react"
import { formatDateTime } from "@/lib/utils"

type Note = {
  id: string
  content: string
  createdAt: string
  user: { name: string }
}

export function UnitNotes({ unitId }: { unitId: string }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchNotes()
  }, [unitId])

  async function fetchNotes() {
    try {
      const res = await fetch(`/api/units/${unitId}/notes`)
      if (res.ok) setNotes(await res.json())
    } catch {} finally {
      setLoading(false)
    }
  }

  async function addNote() {
    if (!content.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/units/${unitId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      })
      if (res.ok) {
        const note = await res.json()
        setNotes((prev) => [note, ...prev])
        setContent("")
      }
    } catch {} finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a note..."
          rows={2}
          className="flex-1"
          onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) addNote() }}
        />
        <Button size="sm" disabled={submitting || !content.trim()} onClick={addNote} className="self-end">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : notes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No notes yet</p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="border border-border rounded-lg p-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">{note.user.name}</span>
                <span className="text-xs text-muted-foreground">{formatDateTime(note.createdAt)}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{note.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
