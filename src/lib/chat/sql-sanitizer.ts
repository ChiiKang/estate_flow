const BLOCKED_KEYWORDS = [
  "INSERT",
  "UPDATE",
  "DELETE",
  "DROP",
  "ALTER",
  "CREATE",
  "TRUNCATE",
  "GRANT",
  "REVOKE",
  "COPY",
  "EXECUTE",
  "CALL",
]

const BLOCKED_FUNCTIONS = [
  "pg_sleep",
  "pg_terminate_backend",
  "pg_cancel_backend",
  "pg_read_file",
  "pg_write_file",
  "pg_ls_dir",
  "set_config",
  "current_setting",
  "lo_import",
  "lo_export",
  "dblink",
]

export type SanitizeResult =
  | { ok: true; sql: string; params: unknown[] }
  | { ok: false; error: string }

export function sanitizeSql(rawSql: string, orgId: string): SanitizeResult {
  // Strip SQL comments
  let sql = rawSql
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim()

  if (!sql) {
    return { ok: false, error: "Empty query" }
  }

  // Must start with SELECT or WITH (for CTEs)
  const upper = sql.toUpperCase()
  if (!upper.startsWith("SELECT") && !upper.startsWith("WITH")) {
    return { ok: false, error: "Only SELECT queries are allowed" }
  }

  // Check for blocked keywords (as standalone words, not within strings)
  for (const keyword of BLOCKED_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, "i")
    // Simple check - strip quoted strings first
    const unquoted = sql.replace(/'[^']*'/g, "''")
    if (regex.test(unquoted)) {
      return { ok: false, error: `Blocked keyword: ${keyword}` }
    }
  }

  // Check for blocked functions
  for (const fn of BLOCKED_FUNCTIONS) {
    const regex = new RegExp(`\\b${fn}\\s*\\(`, "i")
    if (regex.test(sql)) {
      return { ok: false, error: `Blocked function: ${fn}` }
    }
  }

  // Check for semicolons (prevent multi-statement injection)
  const unquoted = sql.replace(/'[^']*'/g, "''")
  if (unquoted.includes(";")) {
    return { ok: false, error: "Multiple statements are not allowed" }
  }

  // Replace __ORG_ID__ placeholder with parameterized value
  sql = sql.replace(/'__ORG_ID__'/g, "$1")

  // Add LIMIT if not present
  if (!/\bLIMIT\b/i.test(sql)) {
    sql = sql + " LIMIT 100"
  }

  return { ok: true, sql, params: [orgId] }
}
