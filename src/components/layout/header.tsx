"use client"

import { useEffect, useState, useCallback } from "react"
import { Bell, Search, Menu } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSidebar } from "./sidebar"
import { useSession } from "next-auth/react"
import { signOut } from "next-auth/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { formatRelativeTime } from "@/lib/notification-utils"

type Notification = {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  readAt: string | null
  createdAt: string
}

interface HeaderProps {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  const { setOpen } = useSidebar()
  const { data: session } = useSession()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const userName = session?.user?.name || "User"
  const userRole = (session?.user as any)?.role || "AGENT"
  const initials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications")
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
    } catch {}
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      })
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })))
      setUnreadCount(0)
    } catch {}
  }

  const handleNotificationClick = async (n: Notification) => {
    if (!n.readAt) {
      fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: n.id }),
      }).catch(() => {})
      setNotifications((prev) => prev.map((item) => (item.id === n.id ? { ...item, readAt: new Date().toISOString() } : item)))
      setUnreadCount((c) => Math.max(0, c - 1))
    }
    if (n.link) router.push(n.link)
  }

  return (
    <header className="h-14 sm:h-16 border-b border-border bg-card flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(true)}
          className="lg:hidden p-1.5 -ml-1 rounded-lg hover:bg-secondary transition-colors"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-semibold text-foreground truncate">{title}</h1>
          {subtitle && <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="pl-9 w-64 bg-secondary border-transparent focus:border-border"
          />
        </div>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative p-2 rounded-lg hover:bg-secondary transition-colors">
              <Bell className="w-5 h-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-semibold rounded-full px-1">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-3 py-2">
              <DropdownMenuLabel className="p-0 text-sm font-semibold">Notifications</DropdownMenuLabel>
              {unreadCount > 0 && (
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    markAllRead()
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            <DropdownMenuSeparator />
            <ScrollArea className="max-h-80">
              {notifications.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No notifications yet
                </div>
              ) : (
                notifications.map((n) => (
                  <DropdownMenuItem
                    key={n.id}
                    className="flex flex-col items-start gap-0.5 px-3 py-2.5 cursor-pointer"
                    onClick={() => handleNotificationClick(n)}
                  >
                    <div className="flex w-full gap-2">
                      {!n.readAt && (
                        <span className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${!n.readAt ? "font-medium" : "text-muted-foreground"}`}>
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="text-xs text-muted-foreground truncate">{n.body}</p>
                        )}
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {formatRelativeTime(n.createdAt)}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 sm:gap-3 p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs text-muted-foreground">{userRole}</p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => signOut({ callbackUrl: "/login" })}>
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
