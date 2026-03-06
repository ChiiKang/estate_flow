"use client"

import { useState, useEffect } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Loader2 } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"

type PriceEntry = {
  date: string
  fromPrice: string
  toPrice: string
  changedBy: string
}

export function PriceHistoryChart({ unitId }: { unitId: string }) {
  const [data, setData] = useState<PriceEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/units/${unitId}/price-history`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [unitId])

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
  }

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No price changes recorded</p>
  }

  const chartData = data.map((d) => ({
    date: formatDate(d.date),
    price: Number(d.toPrice),
    changedBy: d.changedBy,
  }))

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="text-muted-foreground" />
          <Tooltip
            formatter={(value) => [formatCurrency(Number(value)), "Price"]}
            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
          />
          <Line type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
