"use client"

import { useState, useCallback } from "react"
import { MessageCircle } from "lucide-react"
import { ChatPanel } from "./chat-panel"
import type { ChatMessage, StreamEvent, TraceStep } from "@/types/chat"
import { cn } from "@/lib/utils"

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: ChatMessage = { role: "user", content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setLoading(true)

    const traceSteps: TraceStep[] = []
    let assistantContent = ""

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      if (!res.ok) {
        throw new Error("Failed to get response")
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error("No stream")

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const event: StreamEvent = JSON.parse(line)

            switch (event.type) {
              case "trace":
                traceSteps.push(event.data)
                // Update the assistant message in-progress to show trace
                setMessages((prev) => {
                  const updated = [...prev]
                  const last = updated[updated.length - 1]
                  if (last?.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      trace: [...traceSteps],
                    }
                  } else {
                    updated.push({
                      role: "assistant",
                      content: "",
                      trace: [...traceSteps],
                    })
                  }
                  return updated
                })
                break

              case "delta":
                assistantContent += event.data
                setMessages((prev) => {
                  const updated = [...prev]
                  const last = updated[updated.length - 1]
                  if (last?.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      content: assistantContent,
                    }
                  } else {
                    updated.push({
                      role: "assistant",
                      content: assistantContent,
                      trace: traceSteps.length > 0 ? [...traceSteps] : undefined,
                    })
                  }
                  return updated
                })
                break

              case "error":
                setMessages((prev) => [
                  ...prev.filter((m) => m.role !== "assistant" || m.content),
                  {
                    role: "assistant",
                    content: `Error: ${event.data}`,
                    trace: traceSteps.length > 0 ? [...traceSteps] : undefined,
                  },
                ])
                break
            }
          } catch {
            // Skip malformed lines
          }
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            err instanceof Error
              ? `Sorry, something went wrong: ${err.message}`
              : "Sorry, something went wrong. Please try again.",
        },
      ])
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages])

  return (
    <>
      {/* Floating Action Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className={cn(
            "fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50",
            "w-14 h-14 rounded-full shadow-lg",
            "bg-sage-600 hover:bg-sage-700 text-white",
            "flex items-center justify-center",
            "transition-all duration-200 hover:scale-105 active:scale-95",
            "animate-in fade-in zoom-in duration-200"
          )}
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat Panel */}
      {open && (
        <ChatPanel
          messages={messages}
          input={input}
          onInputChange={setInput}
          onSend={handleSend}
          onClose={() => setOpen(false)}
          loading={loading}
        />
      )}
    </>
  )
}
