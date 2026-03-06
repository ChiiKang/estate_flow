"use client"

import { SessionProvider } from "next-auth/react"
import { Sidebar, SidebarProvider } from "@/components/layout/sidebar"
import { ChatWidget } from "@/components/chat/chat-widget"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider>
      <SidebarProvider>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-background min-w-0">
            {children}
          </main>
          <ChatWidget />
        </div>
      </SidebarProvider>
    </SessionProvider>
  )
}
