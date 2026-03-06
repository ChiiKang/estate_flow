export type TraceStepType = "thinking" | "sql" | "result" | "error"

export type TraceStep = {
  id: number
  type: TraceStepType
  label: string
  content: string
}

export type ChatMessage = {
  role: "user" | "assistant"
  content: string
  trace?: TraceStep[]
}

export type StreamEvent =
  | { type: "trace"; data: TraceStep }
  | { type: "delta"; data: string }
  | { type: "done" }
  | { type: "error"; data: string }
