"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
import { Search, Plus, FileText, CreditCard, CheckCircle2, Loader2 } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"

type Deal = {
  id: string
  stage: string
  pricing: any
  createdAt: string
  project: { name: string }
  unit: { tower: string; floor: string; unitNo: string } | null
  lead: { name: string } | null
  buyer: { name: string } | null
  assignee: { name: string } | null
  _count: { docs: number; payments: number }
}

type Project = { id: string; name: string }

function getStageBadge(stage: string) {
  switch (stage) {
    case "RESERVED": return "reserved"
    case "BOOKED": return "booked"
    case "SPA_SIGNED": return "accent"
    case "LOAN_SUBMITTED": return "accent"
    case "LOAN_APPROVED": return "available"
    case "SOLD": return "sold"
    case "CANCELLED": return "cancelled"
    default: return "secondary"
  }
}

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [filters, setFilters] = useState({ stage: "", projectId: "" })

  useEffect(() => {
    fetch("/api/projects").then((r) => r.json()).then(setProjects).catch(console.error)
  }, [])

  useEffect(() => {
    fetchDeals()
  }, [filters])

  async function fetchDeals() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.stage) params.set("stage", filters.stage)
      if (filters.projectId) params.set("projectId", filters.projectId)
      const res = await fetch(`/api/deals?${params}`)
      const data = await res.json()
      setDeals(data.deals)
      setTotal(data.total)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const activeDeals = deals.filter((d) => !["SOLD", "CANCELLED"].includes(d.stage)).length

  return (
    <>
      <Header title="Deals" subtitle="Booking packets and deal management" />
      <div className="p-4 sm:p-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Deals", count: total, icon: FileText, color: "text-sage-600 bg-sage-100" },
            { label: "Active Bookings", count: activeDeals, icon: CheckCircle2, color: "text-blue-600 bg-blue-100" },
            { label: "Docs Tracked", count: deals.reduce((s, d) => s + d._count.docs, 0), icon: FileText, color: "text-yellow-600 bg-yellow-100" },
            { label: "Payments Tracked", count: deals.reduce((s, d) => s + d._count.payments, 0), icon: CreditCard, color: "text-red-600 bg-red-100" },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${item.color}`}><item.icon className="w-5 h-5" /></div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{item.count}</p>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Select value={filters.stage || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, stage: v === "all" ? "" : v }))}>
            <SelectTrigger className="w-[calc(50%-4px)] sm:w-[150px]">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              <SelectItem value="RESERVED">Reserved</SelectItem>
              <SelectItem value="BOOKED">Booked</SelectItem>
              <SelectItem value="SPA_SIGNED">SPA Signed</SelectItem>
              <SelectItem value="LOAN_APPROVED">Loan Approved</SelectItem>
              <SelectItem value="SOLD">Sold</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.projectId || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, projectId: v === "all" ? "" : v }))}>
            <SelectTrigger className="w-[calc(50%-4px)] sm:w-[150px]">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Deals Table */}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Card className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50">
                  <TableHead>Buyer / Lead</TableHead>
                  <TableHead className="hidden sm:table-cell">Unit</TableHead>
                  <TableHead className="hidden lg:table-cell">Project</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="hidden md:table-cell">Docs</TableHead>
                  <TableHead className="hidden md:table-cell">Payments</TableHead>
                  <TableHead className="hidden lg:table-cell">Agent</TableHead>
                  <TableHead className="hidden lg:table-cell">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deals.map((deal) => (
                  <TableRow key={deal.id} className="cursor-pointer">
                    <TableCell className="font-medium">{deal.buyer?.name || deal.lead?.name || "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell">{deal.unit?.unitNo || "—"}</TableCell>
                    <TableCell className="text-sm hidden lg:table-cell">{deal.project?.name}</TableCell>
                    <TableCell>
                      <Badge variant={getStageBadge(deal.stage) as any}>{deal.stage.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {deal.pricing?.netPrice ? formatCurrency(deal.pricing.netPrice) : "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{deal._count.docs}</TableCell>
                    <TableCell className="hidden md:table-cell">{deal._count.payments}</TableCell>
                    <TableCell className="text-sm hidden lg:table-cell">{deal.assignee?.name || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{formatDate(deal.createdAt)}</TableCell>
                  </TableRow>
                ))}
                {deals.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No deals found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </>
  )
}
