import type { ChatCompletionTool } from "openai/resources/chat/completions"

export const chatTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_database_schema",
      description:
        "Get the database schema. Use this to list all tables or get column details for a specific table. Useful when you need to verify table/column names before writing a query.",
      parameters: {
        type: "object",
        properties: {
          table_name: {
            type: "string",
            description:
              "Optional. If provided, returns columns/types/constraints for this table. If omitted, returns a list of all tables.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_sql_query",
      description:
        "Execute a read-only SQL SELECT query against the PostgreSQL database. The query MUST include WHERE org_id = '__ORG_ID__' for org scoping. Only SELECT statements are allowed. Results are limited to 100 rows.",
      parameters: {
        type: "object",
        properties: {
          sql: {
            type: "string",
            description:
              "The SQL SELECT query to execute. Must include org_id = '__ORG_ID__' filter.",
          },
          purpose: {
            type: "string",
            description: "Brief description of what this query is looking for.",
          },
        },
        required: ["sql", "purpose"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_data",
      description:
        "Analyze and reason about data that has been retrieved from previous queries. Use this to structure your analytical thinking before presenting findings to the user.",
      parameters: {
        type: "object",
        properties: {
          analysis: {
            type: "string",
            description:
              "Your analytical reasoning about the data retrieved so far.",
          },
          conclusion: {
            type: "string",
            description: "Key takeaway or conclusion from the analysis.",
          },
        },
        required: ["analysis", "conclusion"],
      },
    },
  },
]
