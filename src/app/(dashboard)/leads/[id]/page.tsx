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
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Phone,
  Mail,
  Calendar,
  User,
  Briefcase,
  Target,
  Clock,
  CheckCircle2,
  Loader2,
  Megaphone,
  FolderOpen,
} from "lucide-react"
import { formatDate, formatDateTime } from "@/lib/utils"
import { EditLeadDialog } from "@/components/leads/edit-lead-dialog"
import { DeleteLeadDialog } from "@/components/leads/delete-lead-dialog"

type Lead = {
  id: string
  name: string
  phoneRaw: string | null
  phoneE164: string | null
  email: string | null
  source: string | null
  campaign: string | null
  stage: string
  priority: number
  notes: string | null
  nextFollowupAt: string | null
  lastContactedAt: string | null
  createdAt: string
  owner: { id: string; name: string } | null
  project: { id: string; name: string } | null
  deals: Array<{
    id: string
    stage: string
    createdAt: string
    unit: { tower: string; floor: string; unitNo: string } | null
  }>
  tasks: Array<{
    id: string
    type: string
    title: string
    dueAt: string | null
    status: string
  }>
  activities: Array<{
    id: string
    type: string
    data: any
    createdAt: string
    actor: { name: string } | null
  }>
}

function getStageColor(stage: string) {
  switch (stage) {
    case "NEW": return "secondary"
    case "CONTACTED": return "outline"
    case "QUALIFIED": return "accent"
    case "SITE_VISIT": case "UNIT_SELECTED": return "reserved"
    case "RESERVED": case "BOOKED": return "booked"
    case "SPA_SIGNED": case "LOAN_SUBMITTED": case "LOAN_APPROVED": return "booked"
    case "SOLD": return "sold"
    default: return "secondary"
  }
}

function getPriorityBadge(priority: number) {
  if (priority >= 2) return { label: "High", className: "text-red-600 bg-red-50 border-red-200" }
  if (priority === 1) return { label: "Medium", className: "text-yellow-600 bg-yellow-50 border-yellow-200" }
  return { label: "Low", className: "text-green-600 bg-green-50 border-green-200" }
}

function getActivityIcon(type: string) {
  switch (type) {
    case "CREATED": return "✨"
    case "STAGE_CHANGE": return "🔄"
    case "ASSIGNMENT_CHANGE": return "👤"
    case "UPDATED": return "✏️"
    case "NOTE": return "📝"
    case "TASK_CREATED": return "📋"
    case "TASK_COMPLETED": return "✅"
    case "MSG_LOGGED": return "💬"
    default: return "📌"
  }
}

function getActivityDescription(activity: Lead["activities"][0]) {
  const data = activity.data as any
  switch (activity.type) {
    case "CREATED":
      return "Lead created"
    case "STAGE_CHANGE":
      return `Stage: ${data?.from?.replace(/_/g, " ")} → ${data?.to?.replace(/_/g, " ")}`
    case "ASSIGNMENT_CHANGE":
      return "Owner reassigned"
    case "UPDATED":
      if (data?.action === "soft_deleted") return "Lead archived"
      return "Lead updated"
    case "NOTE":
      return "Added a note"
    default:
      return activity.type.replace(/_/g, " ").toLowerCase()
  }
}

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    fetchLead()
  }, [id])

  async function fetchLead() {
    setLoading(true)
    try {
      const res = await fetch(`/api/leads/${id}`)
      if (!res.ok) throw new Error()
      setLead(await res.json())
    } catch {
      setLead(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <>
        <Header title="Lead" subtitle="Loading..." />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </>
    )
  }

  if (!lead) {
    return (
      <>
        <Header title="Lead" subtitle="Not found" />
        <div className="p-6 text-center text-muted-foreground">
          <p>Lead not found or has been deleted.</p>
          <Link href="/leads">
            <Button variant="outline" className="mt-4">Back to Leads</Button>
          </Link>
        </div>
      </>
    )
  }

  const priority = getPriorityBadge(lead.priority)
  const daysSinceCreated = Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24))
  const daysSinceLastContact = lead.lastContactedAt
    ? Math.floor((Date.now() - new Date(lead.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24))
    : null
  const openTasks = lead.tasks.length
  const dealsCount = lead.deals.length

  return (
    <>
      <Header title={lead.name} subtitle={lead.stage.replace(/_/g, " ")} />
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/leads">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            </Link>
            <Badge variant={getStageColor(lead.stage) as any}>
              {lead.stage.replace(/_/g, " ")}
            </Badge>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${priority.className}`}>
              {priority.label}
            </span>
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
          {lead.phoneRaw && (
            <span className="flex items-center gap-1.5">
              <Phone className="w-4 h-4" />
              {lead.phoneRaw}
            </span>
          )}
          {lead.email && (
            <span className="flex items-center gap-1.5">
              <Mail className="w-4 h-4" />
              {lead.email}
            </span>
          )}
          {lead.source && (
            <span className="flex items-center gap-1.5">
              <Target className="w-4 h-4" />
              {lead.source}
            </span>
          )}
          {lead.campaign && (
            <span className="flex items-center gap-1.5">
              <Megaphone className="w-4 h-4" />
              {lead.campaign}
            </span>
          )}
          {lead.project && (
            <span className="flex items-center gap-1.5">
              <FolderOpen className="w-4 h-4" />
              {lead.project.name}
            </span>
          )}
          {lead.owner && (
            <span className="flex items-center gap-1.5">
              <User className="w-4 h-4" />
              {lead.owner.name}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            Created {formatDate(lead.createdAt)}
          </span>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="deals">Deals ({dealsCount})</TabsTrigger>
            <TabsTrigger value="tasks">Tasks ({openTasks})</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <Clock className="w-3.5 h-3.5" />
                      Days in Pipeline
                    </div>
                    <p className="text-2xl font-bold">{daysSinceCreated}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <Phone className="w-3.5 h-3.5" />
                      Days Since Contact
                    </div>
                    <p className="text-2xl font-bold">{daysSinceLastContact ?? "—"}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Open Tasks
                    </div>
                    <p className="text-2xl font-bold">{openTasks}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <Briefcase className="w-3.5 h-3.5" />
                      Deals
                    </div>
                    <p className="text-2xl font-bold">{dealsCount}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Next Follow-up */}
              {lead.nextFollowupAt && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Next Follow-up</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{formatDateTime(lead.nextFollowupAt)}</p>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              {lead.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{lead.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Deals Tab */}
          <TabsContent value="deals">
            {lead.deals.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">No deals found for this lead.</p>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Unit</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lead.deals.map((deal) => (
                      <TableRow key={deal.id}>
                        <TableCell className="font-medium">
                          {deal.unit
                            ? `${deal.unit.tower}-${deal.unit.floor}-${deal.unit.unitNo}`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{deal.stage}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(deal.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks">
            {lead.tasks.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">No open tasks for this lead.</p>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lead.tasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.title}</TableCell>
                        <TableCell className="text-sm">{task.type}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {task.dueAt ? formatDate(task.dueAt) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={task.status === "OPEN" ? "secondary" : "outline"}>
                            {task.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            {lead.activities.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">No activity yet.</p>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {lead.activities.map((activity) => (
                      <div key={activity.id} className="flex gap-3 text-sm">
                        <span className="text-lg leading-none mt-0.5">{getActivityIcon(activity.type)}</span>
                        <div className="flex-1 min-w-0">
                          <p>
                            <span className="font-medium">{activity.actor?.name || "System"}</span>
                            {" — "}
                            <span className="text-muted-foreground">{getActivityDescription(activity)}</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDateTime(activity.createdAt)}
                          </p>
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
      <EditLeadDialog
        lead={lead}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={fetchLead}
      />
      <DeleteLeadDialog
        leadId={lead.id}
        leadName={lead.name}
        hasActiveDeals={lead.deals.some((d) => d.stage !== "CANCELLED")}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  )
}
