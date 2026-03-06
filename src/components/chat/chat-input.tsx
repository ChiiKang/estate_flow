"use client"

import { useRef, useEffect } from "react"
import { Send } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled?: boolean
}

export function ChatInput({ value, onChange, onSend, disabled }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 120) + "px"
  }, [value])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && value.trim()) onSend()
    }
  }

  return (
    <div className="flex items-end gap-2 p-3 border-t border-tan-200 bg-white">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about your data..."
        disabled={disabled}
        rows={1}
        className={cn(
          "flex-1 resize-none rounded-xl border border-tan-200 bg-cream-50 px-3 py-2 text-sm",
          "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sage-500/30 focus:border-sage-400",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "min-h-[36px] max-h-[120px]"
        )}
      />
      <button
        onClick={onSend}
        disabled={disabled || !value.trim()}
        className={cn(
          "shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
          "bg-sage-600 text-white hover:bg-sage-700",
          "disabled:opacity-40 disabled:cursor-not-allowed"
        )}
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  )
}
