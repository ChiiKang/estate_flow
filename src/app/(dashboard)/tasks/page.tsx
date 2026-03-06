"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Phone, MessageSquare, Mail, MapPin, FileText, CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react"
import { formatDateTime } from "@/lib/utils"

type Task = {
  id: string
  title: string
  type: string
  status: string
  dueAt: string
  completedAt: string | null
  lead: { id: string; name: string } | null
  deal: { id: string } | null
  assignee: { id: string; name: string }
}

function getTaskIcon(type: string) {
  switch (type) {
    case "CALL": return Phone
    case "WHATSAPP": return MessageSquare
    case "EMAIL": return Mail
    case "SITE_VISIT": return MapPin
    case "DOC_REQUEST": return FileText
    default: return CheckCircle2
  }
}

function getTaskColor(type: string) {
  switch (type) {
    case "CALL": return "bg-blue-100 text-blue-600"
    case "WHATSAPP": return "bg-green-100 text-green-600"
    case "EMAIL": return "bg-purple-100 text-purple-600"
    case "SITE_VISIT": return "bg-orange-100 text-orange-600"
    case "DOC_REQUEST": return "bg-tan-100 text-tan-700"
    default: return "bg-gray-100 text-gray-600"
  }
}

function categorizeTasks(tasks: Task[]) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

  const overdue: Task[] = []
  const today: Task[] = []
  const upcoming: Task[] = []
  const completed: Task[] = []

  for (const task of tasks) {
    if (task.status === "DONE") {
      completed.push(task)
      continue
    }
    const due = new Date(task.dueAt)
    if (due < todayStart) overdue.push(task)
    else if (due < todayEnd) today.push(task)
    else upcoming.push(task)
  }

  return { overdue, today, upcoming, completed }
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ title: "", type: "CALL", dueAt: "" })

  useEffect(() => {
    fetchTasks()
  }, [])

  async function fetchTasks() {
    try {
      const res = await fetch("/api/tasks")
      const data = await res.json()
      setTasks(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function markDone(taskId: string) {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DONE" }),
      })
      fetchTasks()
    } catch (err) {
      console.error(err)
    }
  }

  async function handleCreate() {
    if (!form.title.trim() || !form.dueAt) return
    setCreating(true)
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title, type: form.type, dueAt: form.dueAt }),
      })
      if (res.ok) {
        setForm({ title: "", type: "CALL", dueAt: "" })
        setDialogOpen(false)
        fetchTasks()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <>
        <Header title="Tasks" subtitle="Manage your follow-ups and tasks" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </>
    )
  }

  const { overdue, today, upcoming, completed } = categorizeTasks(tasks)

  function TaskCard({ task }: { task: Task }) {
    const Icon = getTaskIcon(task.type)
    return (
      <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border border-border bg-card hover:shadow-sm transition-shadow">
        <div className={`p-2 sm:p-2.5 rounded-lg shrink-0 ${getTaskColor(task.type)}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{task.title}</p>
          <p className="text-xs text-muted-foreground truncate">
            {task.lead?.name || "No lead"} &middot; {formatDateTime(task.dueAt)}
          </p>
        </div>
        {task.status === "OPEN" ? (
          <Button size="sm" variant="outline" className="shrink-0" onClick={() => markDone(task.id)}>
            <CheckCircle2 className="w-3.5 h-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Done</span>
          </Button>
        ) : (
          <Badge variant="sold">Completed</Badge>
        )}
      </div>
    )
  }

  return (
    <>
      <Header title="Tasks" subtitle="Manage your follow-ups and tasks" />
      <div className="p-4 sm:p-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 text-red-600"><AlertCircle className="w-5 h-5" /></div>
              <div><p className="text-xl sm:text-2xl font-bold">{overdue.length}</p><p className="text-sm text-muted-foreground">Overdue</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600"><Clock className="w-5 h-5" /></div>
              <div><p className="text-xl sm:text-2xl font-bold">{today.length}</p><p className="text-sm text-muted-foreground">Due Today</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600"><Clock className="w-5 h-5" /></div>
              <div><p className="text-xl sm:text-2xl font-bold">{upcoming.length}</p><p className="text-sm text-muted-foreground">Upcoming</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-600"><CheckCircle2 className="w-5 h-5" /></div>
              <div><p className="text-xl sm:text-2xl font-bold">{completed.length}</p><p className="text-sm text-muted-foreground">Done</p></div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />New Task</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create New Task</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Task title" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CALL">Call</SelectItem>
                        <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                        <SelectItem value="EMAIL">Email</SelectItem>
                        <SelectItem value="SITE_VISIT">Site Visit</SelectItem>
                        <SelectItem value="DOC_REQUEST">Doc Request</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date *</Label>
                    <Input type="datetime-local" value={form.dueAt} onChange={(e) => setForm((f) => ({ ...f, dueAt: e.target.value }))} />
                  </div>
                </div>
                <Button onClick={handleCreate} disabled={creating || !form.title.trim() || !form.dueAt} className="w-full">
                  {creating ? "Creating..." : "Create Task"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="today">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="w-max sm:w-auto">
              <TabsTrigger value="overdue" className="text-red-600">Overdue ({overdue.length})</TabsTrigger>
              <TabsTrigger value="today">Today ({today.length})</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="overdue" className="space-y-3">
            {overdue.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No overdue tasks</p> : overdue.map((t) => <TaskCard key={t.id} task={t} />)}
          </TabsContent>
          <TabsContent value="today" className="space-y-3">
            {today.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No tasks due today</p> : today.map((t) => <TaskCard key={t.id} task={t} />)}
          </TabsContent>
          <TabsContent value="upcoming" className="space-y-3">
            {upcoming.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No upcoming tasks</p> : upcoming.map((t) => <TaskCard key={t.id} task={t} />)}
          </TabsContent>
          <TabsContent value="completed" className="space-y-3">
            {completed.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No completed tasks</p> : completed.map((t) => <TaskCard key={t.id} task={t} />)}
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
