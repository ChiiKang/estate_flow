"use client"

import * as XLSX from "xlsx"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

interface ExcelExportButtonProps {
  data: Record<string, unknown>[]
  columns: { key: string; header: string }[]
  filename: string
  disabled?: boolean
}

export function ExcelExportButton({
  data,
  columns,
  filename,
  disabled,
}: ExcelExportButtonProps) {
  function handleExport() {
    // Build row objects using the column definitions
    const rows = data.map((item) => {
      const row: Record<string, unknown> = {}
      for (const col of columns) {
        row[col.header] = item[col.key] ?? ""
      }
      return row
    })

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows, {
      header: columns.map((c) => c.header),
    })

    // Auto-size columns
    const colWidths = columns.map((col) => {
      const maxLen = Math.max(
        col.header.length,
        ...rows.map((r) => String(r[col.header] ?? "").length)
      )
      return { wch: Math.min(maxLen + 2, 50) }
    })
    ws["!cols"] = colWidths

    XLSX.utils.book_append_sheet(wb, ws, "Data")
    XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={disabled}>
      <Download className="w-4 h-4 sm:mr-2" />
      <span className="hidden sm:inline">Export</span>
    </Button>
  )
}
