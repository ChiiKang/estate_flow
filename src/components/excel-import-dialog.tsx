"use client"

import { useState, useRef, useCallback } from "react"
import * as XLSX from "xlsx"
import { Button } from "@/components/ui/button"
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
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
  Download,
} from "lucide-react"

// ─── Field maps ───────────────────────────────────────────────────────────────

const UNIT_FIELD_MAP: Record<string, string> = {
  "unit no": "unitNo",
  unit_no: "unitNo",
  "unit number": "unitNo",
  unitno: "unitNo",
  unit: "unitNo",
  tower: "tower",
  block: "tower",
  floor: "floor",
  level: "floor",
  type: "unitType",
  "unit type": "unitType",
  unit_type: "unitType",
  bedroom: "unitType",
  "bedroom type": "unitType",
  size: "sizeSqm",
  size_sqm: "sizeSqm",
  built_up: "sizeSqm",
  sqm: "sizeSqm",
  area: "sizeSqm",
  "built up": "sizeSqm",
  facing: "facing",
  direction: "facing",
  price: "currentPrice",
  selling_price: "currentPrice",
  current_price: "currentPrice",
  "selling price": "currentPrice",
  "current price": "currentPrice",
  base_price: "basePrice",
  "base price": "basePrice",
  status: "status",
}

const LEAD_FIELD_MAP: Record<string, string> = {
  name: "name",
  "full name": "name",
  "buyer name": "name",
  customer: "name",
  phone: "phone",
  mobile: "phone",
  contact: "phone",
  phone_raw: "phone",
  hp: "phone",
  "phone number": "phone",
  email: "email",
  "e-mail": "email",
  source: "source",
  "lead source": "source",
  notes: "notes",
  remarks: "notes",
  comment: "notes",
  comments: "notes",
}

// ─── System field definitions ─────────────────────────────────────────────────

const UNIT_SYSTEM_FIELDS = [
  { key: "unitNo", label: "Unit No", required: true },
  { key: "tower", label: "Tower / Block", required: false },
  { key: "floor", label: "Floor / Level", required: false },
  { key: "unitType", label: "Unit Type", required: false },
  { key: "sizeSqm", label: "Size (sqm)", required: false },
  { key: "facing", label: "Facing", required: false },
  { key: "basePrice", label: "Base Price", required: false },
  { key: "currentPrice", label: "Current Price", required: false },
  { key: "status", label: "Status", required: false },
]

const LEAD_SYSTEM_FIELDS = [
  { key: "name", label: "Name", required: true },
  { key: "phone", label: "Phone", required: false },
  { key: "email", label: "Email", required: false },
  { key: "source", label: "Source", required: false },
  { key: "notes", label: "Notes", required: false },
]

// ─── Types ─────────────────────────────────────────────────────────────────────

type Step = "upload" | "map" | "validate" | "import"

interface ValidationRow {
  rowIndex: number
  data: Record<string, unknown>
  errors: string[]
}

interface ImportResult {
  imported: number
  skipped?: number
  duplicates?: number
  errors: string[]
}

interface ExcelImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityType: "units" | "leads"
  projectId?: string
  onSuccess: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function autoDetectMapping(
  fileColumns: string[],
  fieldMap: Record<string, string>
): Record<string, string> {
  const mapping: Record<string, string> = {}
  for (const col of fileColumns) {
    const normalized = col.toLowerCase().trim()
    const systemField = fieldMap[normalized]
    if (systemField && !Object.values(mapping).includes(systemField)) {
      mapping[col] = systemField
    }
  }
  return mapping
}

const VALID_UNIT_STATUSES = ["AVAILABLE", "RESERVED", "BOOKED", "SOLD", "CANCELLED"]

function validateUnitRow(
  row: Record<string, unknown>,
  rowIndex: number
): ValidationRow {
  const errors: string[] = []

  const unitNo = String(row.unitNo ?? "").trim()
  if (!unitNo) errors.push("Unit No is required")

  const price = row.currentPrice !== undefined ? Number(row.currentPrice) : null
  if (price !== null && isNaN(price)) errors.push("Current Price must be a number")

  const basePrice = row.basePrice !== undefined ? Number(row.basePrice) : null
  if (basePrice !== null && isNaN(basePrice)) errors.push("Base Price must be a number")

  const size = row.sizeSqm !== undefined ? Number(row.sizeSqm) : null
  if (size !== null && isNaN(size)) errors.push("Size must be a number")

  const status = row.status ? String(row.status).toUpperCase().trim() : null
  if (status && !VALID_UNIT_STATUSES.includes(status)) {
    errors.push(`Status "${row.status}" is invalid — must be one of: ${VALID_UNIT_STATUSES.join(", ")}`)
  }

  return { rowIndex, data: row, errors }
}

function validateLeadRow(
  row: Record<string, unknown>,
  rowIndex: number
): ValidationRow {
  const errors: string[] = []

  const name = String(row.name ?? "").trim()
  if (!name) errors.push("Name is required")

  const email = row.email ? String(row.email).trim() : null
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push(`Email "${email}" does not appear to be valid`)
  }

  return { rowIndex, data: row, errors }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ExcelImportDialog({
  open,
  onOpenChange,
  entityType,
  projectId,
  onSuccess,
}: ExcelImportDialogProps) {
  const [step, setStep] = useState<Step>("upload")
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [fileColumns, setFileColumns] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([])
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [validationResults, setValidationResults] = useState<ValidationRow[]>([])
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importing, setImporting] = useState(false)
  const [parseError, setParseError] = useState("")

  const inputRef = useRef<HTMLInputElement>(null)

  const fieldMap = entityType === "units" ? UNIT_FIELD_MAP : LEAD_FIELD_MAP
  const systemFields = entityType === "units" ? UNIT_SYSTEM_FIELDS : LEAD_SYSTEM_FIELDS

  // ── Reset ─────────────────────────────────────────────────────────────────

  function reset() {
    setStep("upload")
    setFile(null)
    setIsDragging(false)
    setFileColumns([])
    setRawRows([])
    setColumnMapping({})
    setValidationResults([])
    setImportResult(null)
    setImporting(false)
    setParseError("")
  }

  // ── File parsing ──────────────────────────────────────────────────────────

  async function parseFile(f: File) {
    setParseError("")
    try {
      const arrayBuffer = await f.arrayBuffer()
      const wb = XLSX.read(arrayBuffer, { type: "array" })
      const firstSheetName = wb.SheetNames[0]
      const ws = wb.Sheets[firstSheetName]

      // Convert to JSON with header row
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
        defval: "",
        raw: false,
      })

      if (!jsonData.length) {
        setParseError("The file appears to be empty or has no data rows.")
        return
      }

      const columns = Object.keys(jsonData[0])
      if (!columns.length) {
        setParseError("Could not detect columns from file.")
        return
      }

      setFileColumns(columns)
      setRawRows(jsonData)
      setColumnMapping(autoDetectMapping(columns, fieldMap))
      setFile(f)
      setStep("map")
    } catch (err) {
      console.error(err)
      setParseError("Failed to parse file. Please ensure it is a valid .xlsx or .csv file.")
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) parseFile(f)
    // Reset input so the same file can be re-selected
    e.target.value = ""
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) parseFile(f)
  }, [])

  // ── Mapping step ──────────────────────────────────────────────────────────

  function updateMapping(fileCol: string, systemField: string) {
    setColumnMapping((prev) => {
      const next = { ...prev }
      // Remove any other mapping pointing to the same system field
      if (systemField !== "__ignore__") {
        for (const key of Object.keys(next)) {
          if (next[key] === systemField && key !== fileCol) {
            delete next[key]
          }
        }
        next[fileCol] = systemField
      } else {
        delete next[fileCol]
      }
      return next
    })
  }

  function getMappedField(fileCol: string): string {
    return columnMapping[fileCol] ?? "__ignore__"
  }

  // ── Validation step ───────────────────────────────────────────────────────

  function runValidation() {
    // Transform raw rows using mapping
    const mappedRows: Record<string, unknown>[] = rawRows.map((raw) => {
      const out: Record<string, unknown> = {}
      for (const [fileCol, sysField] of Object.entries(columnMapping)) {
        if (sysField && sysField !== "__ignore__") {
          out[sysField] = raw[fileCol]
        }
      }
      return out
    })

    const results: ValidationRow[] = mappedRows.map((row, idx) =>
      entityType === "units"
        ? validateUnitRow(row, idx + 2) // +2 = 1-based index + header row
        : validateLeadRow(row, idx + 2)
    )

    setValidationResults(results)
    setStep("validate")
  }

  // ── Error report download ─────────────────────────────────────────────────

  function downloadErrorReport() {
    const errorRows = validationResults
      .filter((r) => r.errors.length > 0)
      .map((r) => ({
        Row: r.rowIndex,
        ...Object.fromEntries(
          Object.entries(r.data).map(([k, v]) => [
            systemFields.find((f) => f.key === k)?.label ?? k,
            v,
          ])
        ),
        Errors: r.errors.join("; "),
      }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(errorRows)
    XLSX.utils.book_append_sheet(wb, ws, "Errors")
    XLSX.writeFile(wb, "import-errors.xlsx")
  }

  // ── Import step ───────────────────────────────────────────────────────────

  async function handleImport() {
    const validRows = validationResults
      .filter((r) => r.errors.length === 0)
      .map((r) => r.data)

    if (!validRows.length) return

    setImporting(true)
    setStep("import")

    try {
      const endpoint =
        entityType === "units"
          ? "/api/units/import-excel"
          : "/api/leads/import-excel"

      const body =
        entityType === "units"
          ? { projectId, rows: validRows }
          : { projectId, rows: validRows }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setImportResult({
          imported: 0,
          errors: [data.error || "Import failed"],
        })
        return
      }

      setImportResult(data)
      onSuccess()
    } catch {
      setImportResult({ imported: 0, errors: ["Network error — please try again."] })
    } finally {
      setImporting(false)
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const validCount = validationResults.filter((r) => r.errors.length === 0).length
  const errorCount = validationResults.filter((r) => r.errors.length > 0).length
  const errorRows = validationResults.filter((r) => r.errors.length > 0)

  const requiredFieldsMapped = systemFields
    .filter((f) => f.required)
    .every((f) => Object.values(columnMapping).includes(f.key))

  // ── Step labels ───────────────────────────────────────────────────────────

  const steps: { id: Step; label: string }[] = [
    { id: "upload", label: "Upload" },
    { id: "map", label: "Map Columns" },
    { id: "validate", label: "Validate" },
    { id: "import", label: "Import" },
  ]

  const stepIndex = steps.findIndex((s) => s.id === step)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) reset()
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Import {entityType === "units" ? "Units" : "Leads"} from Excel
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1">
              <span
                className={
                  i === stepIndex
                    ? "font-semibold text-foreground"
                    : i < stepIndex
                    ? "text-green-600"
                    : ""
                }
              >
                {i + 1}. {s.label}
              </span>
              {i < steps.length - 1 && <ChevronRight className="w-3 h-3" />}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-1">
          {/* ── Step 1: Upload ─────────────────────────────────────────────── */}
          {step === "upload" && (
            <div className="space-y-4">
              {parseError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {parseError}
                </div>
              )}
              <div
                className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary"
                }`}
                onClick={() => inputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium">
                  Drag & drop your file here, or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports .xlsx, .xls, .csv files
                </p>
              </div>

              <Card className="bg-secondary/30">
                <CardContent className="p-4 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground mb-2">
                    Expected columns for {entityType === "units" ? "units" : "leads"}:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {systemFields.map((f) => (
                      <Badge
                        key={f.key}
                        variant={f.required ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {f.label}
                        {f.required ? " *" : ""}
                      </Badge>
                    ))}
                  </div>
                  <p className="pt-1 text-muted-foreground">
                    * Required fields. Column names are matched automatically.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Step 2: Map Columns ─────────────────────────────────────────── */}
          {step === "map" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                We detected <strong>{fileColumns.length}</strong> columns and{" "}
                <strong>{rawRows.length}</strong> data rows. Map each file column
                to a system field, or leave as "Ignore" to skip it.
              </p>

              <div className="space-y-2">
                {fileColumns.map((col) => (
                  <div
                    key={col}
                    className="flex items-center gap-3 p-2 rounded-lg border bg-card"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{col}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {String(rawRows[0]?.[col] ?? "—")}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="w-44 shrink-0">
                      <Select
                        value={getMappedField(col)}
                        onValueChange={(v) => updateMapping(col, v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__ignore__">— Ignore —</SelectItem>
                          {systemFields.map((f) => (
                            <SelectItem key={f.key} value={f.key}>
                              {f.label}
                              {f.required ? " *" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>

              {!requiredFieldsMapped && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  Please map all required fields (*) before continuing.
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Validate ─────────────────────────────────────────────── */}
          {step === "validate" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-4 text-center">
                    <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-green-700">{validCount}</p>
                    <p className="text-xs text-green-600">rows ready to import</p>
                  </CardContent>
                </Card>
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="p-4 text-center">
                    <X className="w-6 h-6 text-red-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-red-600">{errorCount}</p>
                    <p className="text-xs text-red-500">rows with errors</p>
                  </CardContent>
                </Card>
              </div>

              {errorCount > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-red-700">Error details</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={downloadErrorReport}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download report
                    </Button>
                  </div>
                  <div className="max-h-52 overflow-y-auto space-y-1 border rounded-lg p-2 bg-red-50/50">
                    {errorRows.map((r) => (
                      <div key={r.rowIndex} className="text-xs">
                        <span className="font-semibold text-red-700">
                          Row {r.rowIndex}:
                        </span>{" "}
                        {r.errors.join(" • ")}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Rows with errors will be skipped. Only valid rows will be imported.
                  </p>
                </div>
              )}

              {validCount === 0 && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  No valid rows to import. Please fix the errors and try again.
                </div>
              )}
            </div>
          )}

          {/* ── Step 4: Import ────────────────────────────────────────────────── */}
          {step === "import" && (
            <div className="space-y-4">
              {importing ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground">
                    Importing {validCount} rows…
                  </p>
                </div>
              ) : importResult ? (
                <div className="space-y-3">
                  {importResult.errors.length > 0 &&
                  importResult.imported === 0 ? (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Import failed</p>
                        {importResult.errors.map((e, i) => (
                          <p key={i} className="text-xs mt-1">
                            {e}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">
                          Successfully imported {importResult.imported} records
                        </p>
                        {(importResult.skipped ?? 0) > 0 && (
                          <p className="text-xs mt-0.5">
                            {importResult.skipped} rows skipped (duplicates)
                          </p>
                        )}
                        {(importResult.duplicates ?? 0) > 0 && (
                          <p className="text-xs mt-0.5">
                            {importResult.duplicates} duplicates skipped
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {importResult.errors.length > 0 && importResult.imported > 0 && (
                    <div className="max-h-36 overflow-y-auto space-y-1 border rounded-lg p-2 bg-red-50/50">
                      {importResult.errors.map((e, i) => (
                        <p key={i} className="text-xs text-red-700">
                          {e}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* ── Navigation buttons ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-3 border-t mt-2 shrink-0">
          <div>
            {step === "map" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep("upload")}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
            {step === "validate" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep("map")}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {step !== "import" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false)
                  reset()
                }}
              >
                Cancel
              </Button>
            )}

            {step === "map" && (
              <Button
                size="sm"
                onClick={runValidation}
                disabled={!requiredFieldsMapped}
              >
                Validate
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}

            {step === "validate" && (
              <Button
                size="sm"
                onClick={handleImport}
                disabled={validCount === 0}
              >
                Import {validCount} rows
                <Upload className="w-4 h-4 ml-1" />
              </Button>
            )}

            {step === "import" && !importing && (
              <Button
                size="sm"
                onClick={() => {
                  onOpenChange(false)
                  reset()
                }}
              >
                Done
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
