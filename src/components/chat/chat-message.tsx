"use client"

import type { ChatMessage } from "@/types/chat"
import { ChatTrace } from "./chat-trace"
import { cn } from "@/lib/utils"
import { Bot, User } from "lucide-react"

export function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user"

  return (
    <div className={cn("flex gap-2", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-sage-600 flex items-center justify-center shrink-0 mt-1">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}
      <div className={cn("max-w-[85%] space-y-1", isUser ? "items-end" : "items-start")}>
        {!isUser && message.trace && message.trace.length > 0 && (
          <ChatTrace steps={message.trace} />
        )}
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-sage-600 text-white rounded-br-md"
              : "bg-white border border-tan-200 text-foreground rounded-bl-md"
          )}
        >
          <MarkdownContent content={message.content} />
        </div>
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-tan-400 flex items-center justify-center shrink-0 mt-1">
          <User className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  )
}

function MarkdownContent({ content }: { content: string }) {
  const blocks = parseBlocks(content)

  return (
    <div className="space-y-2">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "code":
            return (
              <pre
                key={i}
                className="bg-sage-900/5 rounded-lg p-2.5 text-xs font-mono overflow-x-auto"
              >
                {block.content}
              </pre>
            )
          case "table":
            return <MarkdownTable key={i} rows={block.rows} />
          case "text":
            return <TextBlock key={i} lines={block.lines} />
        }
      })}
    </div>
  )
}

type Block =
  | { type: "code"; content: string }
  | { type: "table"; rows: string[][] }
  | { type: "text"; lines: string[] }

function parseBlocks(content: string): Block[] {
  const blocks: Block[] = []
  const lines = content.split("\n")
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Code block
    if (line.trimStart().startsWith("```")) {
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing ```
      blocks.push({ type: "code", content: codeLines.join("\n") })
      continue
    }

    // Table: line starts with | and contains at least one more |
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const tableRows: string[][] = []
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        const row = lines[i]
          .trim()
          .slice(1, -1)
          .split("|")
          .map((cell) => cell.trim())
        // Skip separator rows like |---|---|
        if (!row.every((cell) => /^[-:\s]+$/.test(cell))) {
          tableRows.push(row)
        }
        i++
      }
      if (tableRows.length > 0) {
        blocks.push({ type: "table", rows: tableRows })
      }
      continue
    }

    // Regular text — collect consecutive non-special lines
    const textLines: string[] = []
    while (
      i < lines.length &&
      !lines[i].trimStart().startsWith("```") &&
      !(lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|"))
    ) {
      textLines.push(lines[i])
      i++
    }
    if (textLines.length > 0) {
      blocks.push({ type: "text", lines: textLines })
    }
  }

  return blocks
}

function MarkdownTable({ rows }: { rows: string[][] }) {
  if (rows.length === 0) return null
  const [header, ...body] = rows

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            {header.map((cell, i) => (
              <th
                key={i}
                className="text-left px-2 py-1.5 font-semibold border-b border-tan-200 bg-sage-50/50"
              >
                <InlineMarkdown text={cell} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className="px-2 py-1.5 border-b border-tan-100">
                  <InlineMarkdown text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TextBlock({ lines }: { lines: string[] }) {
  return (
    <div>
      {lines.map((line, i) => {
        // Heading
        const headingMatch = line.match(/^(#{1,3})\s+(.+)/)
        if (headingMatch) {
          const level = headingMatch[1].length
          const text = headingMatch[2]
          const Tag = level === 1 ? "h3" : level === 2 ? "h4" : "h5"
          const cls = level === 1 ? "text-sm font-bold" : level === 2 ? "text-sm font-semibold" : "text-xs font-semibold"
          return <Tag key={i} className={cls}><InlineMarkdown text={text} /></Tag>
        }

        // List item
        const listMatch = line.match(/^(\s*)([-*]|\d+\.)\s+(.+)/)
        if (listMatch) {
          const indent = Math.floor(listMatch[1].length / 2)
          return (
            <div key={i} className="flex gap-1.5" style={{ paddingLeft: indent * 12 }}>
              <span className="text-muted-foreground shrink-0">•</span>
              <span><InlineMarkdown text={listMatch[3]} /></span>
            </div>
          )
        }

        // Empty line
        if (line.trim() === "") {
          return <div key={i} className="h-1" />
        }

        // Regular line
        return (
          <div key={i}>
            <InlineMarkdown text={line} />
          </div>
        )
      })}
    </div>
  )
}

function InlineMarkdown({ text }: { text: string }) {
  // Process bold, inline code
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
    // Inline code
    const codeMatch = remaining.match(/`([^`]+)`/)

    const matches = [
      boldMatch ? { match: boldMatch, idx: boldMatch.index!, type: "bold" as const } : null,
      codeMatch ? { match: codeMatch, idx: codeMatch.index!, type: "code" as const } : null,
    ]
      .filter(Boolean)
      .sort((a, b) => a!.idx - b!.idx)

    if (matches.length === 0) {
      parts.push(remaining)
      break
    }

    const first = matches[0]!
    if (first.idx > 0) {
      parts.push(remaining.slice(0, first.idx))
    }

    if (first.type === "bold") {
      parts.push(
        <strong key={key++} className="font-semibold">
          {first.match[1]}
        </strong>
      )
    } else {
      parts.push(
        <code
          key={key++}
          className="bg-sage-900/5 px-1 py-0.5 rounded text-[11px] font-mono"
        >
          {first.match[1]}
        </code>
      )
    }

    remaining = remaining.slice(first.idx + first.match[0].length)
  }

  return <>{parts}</>
}
