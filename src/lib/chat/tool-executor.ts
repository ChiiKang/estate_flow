import { Prisma } from "@prisma/client"
import prisma from "@/lib/db"
import { sanitizeSql } from "./sql-sanitizer"

type ToolResult = {
  content: string
  traceType: "sql" | "result" | "thinking" | "error"
  traceLabel: string
}

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  orgId: string
): Promise<ToolResult> {
  switch (toolName) {
    case "get_database_schema":
      return executeGetSchema(args.table_name as string | undefined)

    case "execute_sql_query":
      return executeSqlQuery(args.sql as string, args.purpose as string, orgId)

    case "analyze_data":
      return {
        content: `Analysis: ${args.analysis}\nConclusion: ${args.conclusion}`,
        traceType: "thinking",
        traceLabel: "ANALYSIS",
      }

    default:
      return {
        content: `Unknown tool: ${toolName}`,
        traceType: "error",
        traceLabel: "ERROR",
      }
  }
}

async function executeGetSchema(tableName?: string): Promise<ToolResult> {
  try {
    if (!tableName) {
      // List all tables
      const tables = await prisma.$queryRaw<{ table_name: string }[]>`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `
      const names = tables.map((t) => t.table_name)
      return {
        content: `Tables in database:\n${names.map((n) => `- ${n}`).join("\n")}`,
        traceType: "result",
        traceLabel: "SCHEMA",
      }
    }

    // Get columns for specific table
    const columns = await prisma.$queryRaw<
      {
        column_name: string
        data_type: string
        is_nullable: string
        column_default: string | null
      }[]
    >`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${tableName}
      ORDER BY ordinal_position
    `

    if (columns.length === 0) {
      return {
        content: `Table '${tableName}' not found`,
        traceType: "error",
        traceLabel: "SCHEMA",
      }
    }

    // Get foreign keys
    const fks = await prisma.$queryRaw<
      {
        column_name: string
        foreign_table: string
        foreign_column: string
      }[]
    >`
      SELECT
        kcu.column_name,
        ccu.table_name AS foreign_table,
        ccu.column_name AS foreign_column
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = ${tableName}
    `

    const fkMap = new Map(fks.map((fk) => [fk.column_name, fk]))

    const lines = columns.map((c) => {
      const fk = fkMap.get(c.column_name)
      const fkStr = fk ? ` → ${fk.foreign_table}.${fk.foreign_column}` : ""
      const nullable = c.is_nullable === "YES" ? " (nullable)" : ""
      return `- ${c.column_name}: ${c.data_type}${nullable}${fkStr}`
    })

    return {
      content: `Table: ${tableName}\n${lines.join("\n")}`,
      traceType: "result",
      traceLabel: "SCHEMA",
    }
  } catch (err) {
    return {
      content: `Schema error: ${err instanceof Error ? err.message : "Unknown error"}`,
      traceType: "error",
      traceLabel: "ERROR",
    }
  }
}

async function executeSqlQuery(
  rawSql: string,
  purpose: string,
  orgId: string
): Promise<ToolResult> {
  const result = sanitizeSql(rawSql, orgId)

  if (!result.ok) {
    return {
      content: `Query rejected: ${result.error}`,
      traceType: "error",
      traceLabel: "SQL ERROR",
    }
  }

  try {
    const rows = await prisma.$queryRawUnsafe(result.sql, ...result.params)
    const data = Array.isArray(rows) ? rows : [rows]

    // Truncate large results
    const serialized = JSON.stringify(data, bigIntReplacer, 2)
    const truncated =
      serialized.length > 4000
        ? serialized.slice(0, 4000) + `\n... (${data.length} rows total, truncated)`
        : serialized

    return {
      content: `Purpose: ${purpose}\nQuery: ${rawSql}\nResults (${data.length} rows):\n${truncated}`,
      traceType: "sql",
      traceLabel: "SQL",
    }
  } catch (err) {
    const message =
      err instanceof Prisma.PrismaClientKnownRequestError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Query execution failed"

    return {
      content: `SQL error: ${message}`,
      traceType: "error",
      traceLabel: "SQL ERROR",
    }
  }
}

function bigIntReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") return Number(value)
  if (value instanceof Prisma.Decimal) return Number(value)
  return value
}
