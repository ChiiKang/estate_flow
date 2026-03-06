"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EditProjectDialog } from "@/components/projects/edit-project-dialog"
import { DeleteProjectDialog } from "@/components/projects/delete-project-dialog"
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Building2,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Home,
  TrendingUp,
  Loader2,
  Layers,
} from "lucide-react"

type Project = {
  id: string
  name: string
  location: string | null
  status: string
  developer: string | null
  description: string | null
  projectType: string | null
  launchDate: string | null
  completionDate: string | null
  totalPhases: number | null
  priceMin: string | null
  priceMax: string | null
  _count: { units: number; leads: number; deals: number }
}

type Summary = {
  totalUnits: number
  unitBreakdown: Record<string, number>
  totalLeads: number
  totalDeals: number
  dealBreakdown: Record<string, number>
  totalRevenue: number
  conversionRate: number
  unitsSold: number
}

type Activity = {
  id: string
  type: string
  data: any
  createdAt: string
  actor: { name: string; email: string } | null
}

const PROJECT_TYPE_LABELS: Record<string, string> = {
  CONDO: "Condominium",
  APARTMENT: "Apartment",
  LANDED_HOUSE: "Landed House",
  TOWNSHIP: "Township",
  MIXED: "Mixed Development",
}

const UNIT_STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-green-500",
  RESERVED: "bg-yellow-500",
  BOOKED: "bg-blue-500",
  SOLD: "bg-sage-600",
  CANCELLED: "bg-red-500",
}

function formatCurrency(amount: number | string | null) {
  if (!amount) return "-"
  return `RM ${Number(amount).toLocaleString()}`
}

function formatDate(date: string | null) {
  if (!date) return "-"
  return new Date(date).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [project, setProject] = useState<Project | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  // Lazy-loaded tab data
  const [units, setUnits] = useState<any[] | null>(null)
  const [leads, setLeads] = useState<any[] | null>(null)
  const [deals, setDeals] = useState<any[] | null>(null)
  const [activities, setActivities] = useState<Activity[] | null>(null)

  useEffect(() => {
    fetchProject()
    fetchSummary()
  }, [id])

  useEffect(() => {
    if (activeTab === "units" && units === null) fetchUnits()
    if (activeTab === "leads" && leads === null) fetchLeads()
    if (activeTab === "deals" && deals === null) fetchDeals()
    if (activeTab === "activity" && activities === null) fetchActivities()
  }, [activeTab])

  async function fetchProject() {
    try {
      const res = await fetch(`/api/projects/${id}`)
      if (!res.ok) throw new Error()
      setProject(await res.json())
    } catch {
      setProject(null)
    } finally {
      setLoading(false)
    }
  }

  async function fetchSummary() {
    try {
      const res = await fetch(`/api/projects/${id}/summary`)
      if (res.ok) setSummary(await res.json())
    } catch {}
  }

  async function fetchUnits() {
    try {
      const res = await fetch(`/api/units?projectId=${id}`)
      if (res.ok) {
        const data = await res.json()
        setUnits(data.units || data)
      }
    } catch {}
  }

  async function fetchLeads() {
    try {
      const res = await fetch(`/api/leads?projectId=${id}`)
      if (res.ok) {
        const data = await res.json()
        setLeads(data.leads || data)
      }
    } catch {}
  }

  async function fetchDeals() {
    try {
      const res = await fetch(`/api/deals?projectId=${id}`)
      if (res.ok) {
        const data = await res.json()
        setDeals(data.deals || data)
      }
    } catch {}
  }

  async function fetchActivities() {
    try {
      const res = await fetch(`/api/projects/${id}/activities`)
      if (res.ok) setActivities(await res.json())
    } catch {}
  }

  function handleSaved() {
    fetchProject()
    fetchSummary()
  }

  if (loading) {
    return (
      <>
        <Header title="Project" subtitle="Loading..." />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </>
    )
  }

  if (!project) {
    return (
      <>
        <Header title="Project" subtitle="Not found" />
        <div className="p-6 text-center text-muted-foreground">
          <p>Project not found or has been deleted.</p>
          <Link href="/projects">
            <Button variant="outline" className="mt-4">Back to Projects</Button>
          </Link>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title={project.name} subtitle={project.location || "No location"} />
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/projects">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            </Link>
            <Badge variant={project.status === "ACTIVE" ? "available" : "secondary"}>
              {project.status}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="w-4 h-4 mr-1" />
              Edit
            </Button>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>

        {/* Metadata row */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {project.developer && (
            <span className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4" />
              {project.developer}
            </span>
          )}
          {project.projectType && (
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              {PROJECT_TYPE_LABELS[project.projectType] || project.projectType}
            </span>
          )}
          {project.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              {project.location}
            </span>
          )}
          {project.launchDate && (
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              Launch: {formatDate(project.launchDate)}
            </span>
          )}
          {project.completionDate && (
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              Completion: {formatDate(project.completionDate)}
            </span>
          )}
          {(project.priceMin || project.priceMax) && (
            <span className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4" />
              {formatCurrency(project.priceMin)} - {formatCurrency(project.priceMax)}
            </span>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="units">Units ({project._count.units})</TabsTrigger>
            <TabsTrigger value="leads">Leads ({project._count.leads})</TabsTrigger>
            <TabsTrigger value="deals">Deals ({project._count.deals})</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="space-y-6">
              {/* KPI Cards */}
              {summary && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                        <Home className="w-3.5 h-3.5" />
                        Total Units
                      </div>
                      <p className="text-2xl font-bold">{summary.totalUnits}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                        <Home className="w-3.5 h-3.5" />
                        Units Sold
                      </div>
                      <p className="text-2xl font-bold">{summary.unitsSold}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                        <Users className="w-3.5 h-3.5" />
                        Active Leads
                      </div>
                      <p className="text-2xl font-bold">{summary.totalLeads}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                        <DollarSign className="w-3.5 h-3.5" />
                        Revenue
                      </div>
                      <p className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        Conversion
                      </div>
                      <p className="text-2xl font-bold">{summary.conversionRate}%</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Unit Status Progress Bar */}
              {summary && summary.totalUnits > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Unit Status Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="w-full h-4 rounded-full overflow-hidden flex bg-secondary">
                      {Object.entries(summary.unitBreakdown).map(([status, count]) => (
                        <div
                          key={status}
                          className={`h-full ${UNIT_STATUS_COLORS[status] || "bg-gray-400"}`}
                          style={{ width: `${(count / summary.totalUnits) * 100}%` }}
                          title={`${status}: ${count}`}
                        />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-4 mt-3 text-xs">
                      {Object.entries(summary.unitBreakdown).map(([status, count]) => (
                        <span key={status} className="flex items-center gap-1.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${UNIT_STATUS_COLORS[status] || "bg-gray-400"}`} />
                          {status}: {count}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Description */}
              {project.description && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.description}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Units Tab */}
          <TabsContent value="units">
            {units === null ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : units.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">No units found for this project.</p>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Unit</TableHead>
                      <TableHead>Tower</TableHead>
                      <TableHead>Floor</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Size (sqm)</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {units.map((unit: any) => (
                      <TableRow key={unit.id}>
                        <TableCell className="font-medium">{unit.unitNo}</TableCell>
                        <TableCell>{unit.tower}</TableCell>
                        <TableCell>{unit.floor}</TableCell>
                        <TableCell>{unit.unitType}</TableCell>
                        <TableCell>{unit.sizeSqm || "-"}</TableCell>
                        <TableCell>{formatCurrency(unit.currentPrice)}</TableCell>
                        <TableCell>
                          <Badge variant={unit.status.toLowerCase() as any}>{unit.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          {/* Leads Tab */}
          <TabsContent value="leads">
            {leads === null ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : leads.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">No leads found for this project.</p>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Stage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead: any) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">{lead.name}</TableCell>
                        <TableCell>{lead.phoneRaw || lead.phoneE164 || "-"}</TableCell>
                        <TableCell>{lead.email || "-"}</TableCell>
                        <TableCell>{lead.source || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{lead.stage}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          {/* Deals Tab */}
          <TabsContent value="deals">
            {deals === null ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : deals.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">No deals found for this project.</p>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deals.map((deal: any) => (
                      <TableRow key={deal.id}>
                        <TableCell className="font-medium">{deal.lead?.name || "-"}</TableCell>
                        <TableCell>{deal.unit?.unitNo || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{deal.stage}</Badge>
                        </TableCell>
                        <TableCell>{formatDate(deal.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            {activities === null ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : activities.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">No activity yet.</p>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <div key={activity.id} className="flex gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p>
                            <span className="font-medium">{activity.actor?.name || "System"}</span>
                            {" — "}
                            <span className="text-muted-foreground">
                              {activity.type.replace(/_/g, " ").toLowerCase()}
                            </span>
                          </p>
                          {activity.data && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {activity.type === "UPDATED" && activity.data.changes
                                ? Object.keys(activity.data.changes).join(", ") + " updated"
                                : activity.data.name || JSON.stringify(activity.data).slice(0, 100)}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">{formatDate(activity.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <EditProjectDialog
        project={project}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={handleSaved}
      />
      <DeleteProjectDialog
        projectId={project.id}
        projectName={project.name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  )
}
