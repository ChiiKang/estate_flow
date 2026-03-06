"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Building2,
  Grid3X3,
  Users,
  CheckSquare,
  Handshake,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  X,
} from "lucide-react"
import { useState, useEffect, createContext, useContext } from "react"
import { signOut } from "next-auth/react"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: Building2 },
  { href: "/units", label: "Units", icon: Grid3X3 },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/deals", label: "Deals", icon: Handshake },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/reports", label: "Reports", icon: BarChart3 },
]

type SidebarContextType = {
  open: boolean
  setOpen: (open: boolean) => void
}

const SidebarContext = createContext<SidebarContextType>({ open: false, setOpen: () => {} })

export function useSidebar() {
  return useContext(SidebarContext)
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <SidebarContext.Provider value={{ open, setOpen }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const { open, setOpen } = useSidebar()

  // Close mobile sidebar on route change
  useEffect(() => {
    setOpen(false)
  }, [pathname, setOpen])

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [open])

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border shrink-0">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-tan-400 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-white">EstateFlow</span>
          </Link>
        )}
        {/* Desktop collapse button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:block p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-muted hover:text-white"
        >
          {collapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
        {/* Mobile close button */}
        <button
          onClick={() => setOpen(false)}
          className="lg:hidden p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-muted hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-white"
                  : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {(!collapsed || open) && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-2 border-t border-sidebar-border space-y-1 shrink-0">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-white transition-colors"
        >
          <Settings className="w-5 h-5 shrink-0" />
          {(!collapsed || open) && <span>Settings</span>}
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-white transition-colors w-full"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {(!collapsed || open) && <span>Sign Out</span>}
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 shrink-0",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col w-72 bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-transform duration-300 lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
