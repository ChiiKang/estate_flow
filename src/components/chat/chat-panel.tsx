"use client"

import { useRef, useEffect } from "react"
import { X, Sparkles, Loader2 } from "lucide-react"
import { ChatMessageBubble } from "./chat-message"
import { ChatInput } from "./chat-input"
import type { ChatMessage } from "@/types/chat"
import { cn } from "@/lib/utils"

interface ChatPanelProps {
  messages: ChatMessage[]
  input: string
  onInputChange: (v: string) => void
  onSend: () => void
  onClose: () => void
  loading: boolean
  isOpen?: boolean
}

const STARTER_QUESTIONS = [
  "What tables exist in the database?",
  "How many leads do we have by stage?",
  "Show unit availability by project",
  "What's our total deal value?",
]

export function ChatPanel({
  messages,
  input,
  onInputChange,
  onSend,
  onClose,
  loading,
  isOpen = true,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50",
        "w-[calc(100vw-2rem)] sm:w-[400px] h-[min(600px,calc(100vh-120px))]",
        "bg-cream-50 rounded-2xl shadow-2xl border border-tan-200",
        "flex flex-col overflow-hidden",
        "transition-all duration-300 ease-out origin-bottom-right",
        isOpen
          ? "scale-100 opacity-100 translate-y-0"
          : "scale-50 opacity-0 translate-y-8 pointer-events-none"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-sage-900 text-white rounded-t-2xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-sage-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">EstateFlow AI</h3>
            <p className="text-[10px] text-sage-300">Database Assistant</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full hover:bg-sage-800 flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-sage-100 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-sage-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Ask me anything about your data
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                I can query your database, analyze trends, and provide insights
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 w-full max-w-xs">
              {STARTER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    onInputChange(q)
                    setTimeout(onSend, 50)
                  }}
                  className="text-left text-xs px-3 py-2 rounded-lg border border-tan-200 bg-white hover:bg-sage-50 hover:border-sage-300 transition-colors text-muted-foreground hover:text-foreground"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <ChatMessageBubble key={i} message={msg} />
            ))}
            {loading && (
              <div className="flex gap-2 items-center">
                <div className="w-7 h-7 rounded-full bg-sage-600 flex items-center justify-center shrink-0">
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                </div>
                <div className="bg-white border border-tan-200 rounded-2xl rounded-bl-md px-3.5 py-2.5">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-sage-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-sage-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-sage-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Input */}
      <ChatInput
        value={input}
        onChange={onInputChange}
        onSend={onSend}
        disabled={loading}
      />
    </div>
  )
}
