"use client"

import { useState, useCallback, useEffect } from "react"
import { MessageCircle, X } from "lucide-react"
import { ChatPanel } from "./chat-panel"
import type { ChatMessage, StreamEvent, TraceStep } from "@/types/chat"
import { cn } from "@/lib/utils"

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [visible, setVisible] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)

  // Handle open/close with animation
  function handleOpen() {
    setVisible(true)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setOpen(true))
    })
  }

  function handleClose() {
    setOpen(false)
    setTimeout(() => setVisible(false), 300)
  }

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
      <button
        onClick={handleOpen}
        className={cn(
          "fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50",
          "w-14 h-14 rounded-full shadow-lg",
          "bg-sage-600 hover:bg-sage-700 text-white",
          "flex items-center justify-center",
          "transition-all duration-300 ease-out",
          open
            ? "scale-0 opacity-0 pointer-events-none rotate-90"
            : "scale-100 opacity-100 rotate-0 hover:scale-110 active:scale-95 hover:shadow-xl"
        )}
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Chat Panel — always mounted when visible, animated via CSS */}
      {visible && (
        <ChatPanel
          messages={messages}
          input={input}
          onInputChange={setInput}
          onSend={handleSend}
          onClose={handleClose}
          loading={loading}
          isOpen={open}
        />
      )}
    </>
  )
}
