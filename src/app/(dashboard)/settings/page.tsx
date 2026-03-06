"use client"

import { useEffect, useState } from "react"
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
import { Shield, Loader2 } from "lucide-react"

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

  return (
    <>
      <Header title="Settings" subtitle="Manage your organization" />
      <div className="p-4 sm:p-6 space-y-6">
        <Tabs defaultValue="general">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="w-max sm:w-auto">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="profile">My Profile</TabsTrigger>
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
        </Tabs>
      </div>
    </>
  )
}
