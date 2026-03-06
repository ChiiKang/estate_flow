import { requireAuth } from "@/lib/auth-utils"
import { SYSTEM_PROMPT } from "@/lib/chat/system-prompt"
import { chatTools } from "@/lib/chat/tools"
import { executeTool } from "@/lib/chat/tool-executor"
import type { StreamEvent, TraceStep } from "@/types/chat"
import OpenAI from "openai"

const MAX_TOOL_ITERATIONS = 10

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: Request) {
  let user
  try {
    user = await requireAuth()
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    })
  }

  const body = await req.json()
  const userMessages: { role: string; content: string }[] = body.messages || []

  if (!userMessages.length) {
    return new Response(JSON.stringify({ error: "No messages" }), {
      status: 400,
    })
  }

  const encoder = new TextEncoder()
  let stepCounter = 0

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: StreamEvent) {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"))
      }

      try {
        // Build conversation for OpenAI o4-mini (reasoning model)
        // o4-mini uses "developer" role instead of "system"
        const messages: OpenAI.ChatCompletionMessageParam[] = [
          { role: "developer", content: SYSTEM_PROMPT },
          ...userMessages.map(
            (m) =>
              ({
                role: m.role as "user" | "assistant",
                content: m.content,
              }) as OpenAI.ChatCompletionMessageParam
          ),
        ]

        // Agentic tool-use loop
        for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
          const response = await openai.chat.completions.create({
            model: "o4-mini",
            messages,
            tools: chatTools,
            reasoning_effort: "medium",
          })

          const choice = response.choices[0]
          const message = choice.message

          // Extract reasoning summary from o4-mini's thinking
          const reasoning = (message as unknown as Record<string, unknown>).reasoning
          if (reasoning && typeof reasoning === "string" && reasoning.length > 0) {
            stepCounter++
            send({
              type: "trace",
              data: {
                id: stepCounter,
                type: "thinking",
                label: "THINKING",
                content: reasoning,
              },
            })
          }

          // If no tool calls, stream the final answer
          if (!message.tool_calls || message.tool_calls.length === 0) {
            const content = message.content || ""
            send({ type: "delta", data: content })
            send({ type: "done" })
            break
          }

          // Append assistant message with tool calls
          messages.push({
            role: "assistant",
            content: message.content || null,
            tool_calls: message.tool_calls as OpenAI.ChatCompletionMessageToolCall[],
          })

          // Process each tool call
          const toolResults: OpenAI.ChatCompletionToolMessageParam[] = []

          for (const toolCall of message.tool_calls) {
            if (toolCall.type !== "function") continue

            const args = JSON.parse(toolCall.function.arguments)

            // Send thinking trace before tool execution
            stepCounter++
            send({
              type: "trace",
              data: {
                id: stepCounter,
                type: "thinking",
                label: "THINKING",
                content:
                  args.purpose ||
                  `Calling ${toolCall.function.name}...`,
              },
            })

            // Execute the tool
            const result = await executeTool(
              toolCall.function.name,
              args,
              user.orgId
            )

            // Send tool result trace
            stepCounter++
            const traceStep: TraceStep = {
              id: stepCounter,
              type: result.traceType,
              label: result.traceLabel,
              content:
                toolCall.function.name === "execute_sql_query"
                  ? args.sql
                  : result.content,
            }
            send({ type: "trace", data: traceStep })

            toolResults.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: result.content,
            })
          }

          // Append all tool results
          messages.push(...toolResults)
        }
      } catch (err) {
        send({
          type: "error",
          data: err instanceof Error ? err.message : "Something went wrong",
        })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
