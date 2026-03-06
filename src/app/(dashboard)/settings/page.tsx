"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Shield, Loader2, Plus, Copy, Check, Key, AlertTriangle } from "lucide-react"

function getRoleBadge(role: string) {
  switch (role) {
    case "ADMIN": return "destructive"
    case "MANAGER": return "accent"
    case "AGENT": return "default"
    case "FINANCE": return "booked"
    case "VIEWER": return "secondary"
    default: return "secondary"
  }
}

type ApiKeyItem = {
  id: string
  name: string
  keyPrefix: string
  source: string | null
  lastUsedAt: string | null
  expiresAt: string | null
  revokedAt: string | null
  createdAt: string
}

function ApiKeysTab() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [newKeySource, setNewKeySource] = useState("")
  const [creating, setCreating] = useState(false)
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/webhook/leads`
    : ""

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/api-keys")
      if (res.ok) {
        const data = await res.json()
        setKeys(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  async function handleCreate() {
    if (!newKeyName.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName.trim(),
          source: newKeySource.trim() || undefined,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setCreatedRawKey(data.rawKey)
        fetchKeys()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  async function handleRevoke(id: string) {
    setRevoking(id)
    try {
      const res = await fetch(`/api/settings/api-keys/${id}`, { method: "DELETE" })
      if (res.ok) fetchKeys()
    } catch (err) {
      console.error(err)
    } finally {
      setRevoking(null)
    }
  }

  function handleCopy() {
    if (createdRawKey) {
      navigator.clipboard.writeText(createdRawKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function handleCloseDialog() {
    setShowCreateDialog(false)
    setNewKeyName("")
    setNewKeySource("")
    setCreatedRawKey(null)
    setCopied(false)
  }

  return (
    <div className="space-y-6">
      {/* Webhook URL */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Webhook Endpoint
          </CardTitle>
          <CardDescription>
            Use this URL to send leads from external services (Facebook Ads, Google Forms, Zapier, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-2.5 rounded-md bg-cream-100 border border-tan-200 text-sm font-mono break-all">
              POST {webhookUrl}
            </code>
          </div>
        </CardContent>
      </Card>

      {/* API Keys List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>Manage API keys for webhook authentication</CardDescription>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Generate Key
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : keys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No API keys yet. Generate one to start receiving leads via webhook.
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Default Source</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">{key.name}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-cream-100 px-1.5 py-0.5 rounded">
                          {key.keyPrefix}...
                        </code>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {key.source || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {key.lastUsedAt
                          ? new Date(key.lastUsedAt).toLocaleDateString()
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        {key.revokedAt ? (
                          <Badge variant="secondary">Revoked</Badge>
                        ) : key.expiresAt && new Date(key.expiresAt) < new Date() ? (
                          <Badge variant="secondary">Expired</Badge>
                        ) : (
                          <Badge variant="default">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!key.revokedAt && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleRevoke(key.id)}
                            disabled={revoking === key.id}
                          >
                            {revoking === key.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              "Revoke"
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Show Key Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {createdRawKey ? "API Key Created" : "Generate New API Key"}
            </DialogTitle>
            <DialogDescription>
              {createdRawKey
                ? "Copy your API key now. It will not be shown again."
                : "Create a new API key for webhook authentication."}
            </DialogDescription>
          </DialogHeader>

          {createdRawKey ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800">
                  This key will not be shown again. Make sure to copy it now.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2.5 rounded-md bg-cream-100 border border-tan-200 text-xs font-mono break-all select-all">
                  {createdRawKey}
                </code>
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <Button onClick={handleCloseDialog} className="w-full">
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Key Name</Label>
                <Input
                  placeholder="e.g. Facebook Ads, Zapier, Google Forms"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Default Source (optional)</Label>
                <Input
                  placeholder="e.g. Facebook, Google Ads"
                  value={newKeySource}
                  onChange={(e) => setNewKeySource(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Used when the incoming payload doesn&apos;t include a source field.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={creating || !newKeyName.trim()}>
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate Key"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [profileName, setProfileName] = useState("")

  useEffect(() => {
    if (session?.user?.name) {
      setProfileName(session.user.name)
    }
  }, [session])

  async function handleSaveProfile() {
    setSaving(true)
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileName }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const userName = session?.user?.name || "User"
  const userEmail = session?.user?.email || ""
  const userRole = (session?.user as any)?.role || "AGENT"
  const orgName = (session?.user as any)?.orgName || "Organization"
  const isAdmin = userRole === "ADMIN"

  return (
    <>
      <Header title="Settings" subtitle="Manage your organization" />
      <div className="p-4 sm:p-6 space-y-6">
        <Tabs defaultValue="general">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="w-max sm:w-auto">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="profile">My Profile</TabsTrigger>
              {isAdmin && <TabsTrigger value="api-keys">API Keys</TabsTrigger>}
            </TabsList>
          </div>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Organization Details</CardTitle>
                <CardDescription>Your organization information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Organization Name</Label>
                    <Input value={orgName} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Your Role</Label>
                    <div className="pt-2">
                      <Badge variant={getRoleBadge(userRole) as any}>
                        <Shield className="w-3 h-3 mr-1" />
                        {userRole}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {saved && (
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                    Profile updated successfully!
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={userEmail} disabled />
                  </div>
                </div>
                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="api-keys">
              <ApiKeysTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </>
  )
}
