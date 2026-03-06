"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Upload, FileText, AlertCircle, CheckCircle2 } from "lucide-react"

type ImportResult = {
  imported: number
  skipped: number
  errors: { row: number; reason: string }[]
}

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  endpoint: string
  extraFormData?: Record<string, string>
  onSuccess: () => void
}

export function ImportDialog({ open, onOpenChange, title, endpoint, extraFormData, onSuccess }: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setFile(null)
    setResult(null)
    setError("")
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setError("")
    setResult(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      if (extraFormData) {
        for (const [key, value] of Object.entries(extraFormData)) {
          formData.append(key, value)
        }
      }

      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Import failed")
        return
      }

      setResult(data)
      onSuccess()
    } catch {
      setError("Something went wrong")
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {result ? (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {result.imported} records imported, {result.skipped} skipped
              </div>
              {result.errors.length > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      Row {e.row}: {e.reason}
                    </p>
                  ))}
                </div>
              )}
              <Button onClick={() => { onOpenChange(false); reset() }} className="w-full">
                Done
              </Button>
            </div>
          ) : (
            <>
              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => inputRef.current?.click()}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">{file.name}</span>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Click to select a CSV file</p>
                  </div>
                )}
              </div>

              <Button onClick={handleUpload} disabled={uploading || !file} className="w-full">
                {uploading ? "Importing..." : "Import"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
