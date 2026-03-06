"use client"

import { useMemo } from "react"
import { cn, formatCurrency } from "@/lib/utils"

type Unit = {
  id: string
  tower: string
  floor: string
  unitNo: string
  unitType: string
  sizeSqm: string | null
  currentPrice: string
  status: string
}

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-green-100 border-green-300 text-green-800 hover:bg-green-200",
  RESERVED: "bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200",
  BOOKED: "bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200",
  SOLD: "bg-sage-100 border-sage-300 text-sage-800",
  CANCELLED: "bg-gray-100 border-gray-300 text-gray-500",
}

export function FloorPlanView({
  units,
  selectedTower,
  onUnitClick,
}: {
  units: Unit[]
  selectedTower: string
  onUnitClick: (unitId: string) => void
}) {
  const filtered = useMemo(
    () => (selectedTower ? units.filter((u) => u.tower === selectedTower) : units),
    [units, selectedTower]
  )

  const { floors, unitsByFloor } = useMemo(() => {
    const map = new Map<string, Unit[]>()
    for (const u of filtered) {
      const list = map.get(u.floor) || []
      list.push(u)
      map.set(u.floor, list)
    }
    // Sort floors descending (highest floor first)
    const sorted = [...map.keys()].sort((a, b) => {
      const na = parseInt(a), nb = parseInt(b)
      if (!isNaN(na) && !isNaN(nb)) return nb - na
      return b.localeCompare(a)
    })
    return { floors: sorted, unitsByFloor: map }
  }, [filtered])

  if (filtered.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No units to display</p>
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(STATUS_COLORS).map(([status, cls]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={cn("w-3 h-3 rounded border", cls)} />
            <span>{status}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="space-y-1 min-w-[400px]">
          {floors.map((floor) => {
            const floorUnits = unitsByFloor.get(floor) || []
            floorUnits.sort((a, b) => a.unitNo.localeCompare(b.unitNo))
            return (
              <div key={floor} className="flex gap-1 items-stretch">
                <div className="w-12 flex-shrink-0 flex items-center justify-center text-xs font-medium text-muted-foreground bg-secondary/50 rounded">
                  F{floor}
                </div>
                <div className="flex gap-1 flex-1">
                  {floorUnits.map((unit) => (
                    <button
                      key={unit.id}
                      onClick={() => onUnitClick(unit.id)}
                      className={cn(
                        "flex-1 min-w-[80px] max-w-[140px] border rounded p-1.5 text-left transition-colors cursor-pointer",
                        STATUS_COLORS[unit.status] || STATUS_COLORS.CANCELLED
                      )}
                    >
                      <p className="text-xs font-semibold truncate">{unit.unitNo}</p>
                      <p className="text-[10px] opacity-75">{unit.unitType}</p>
                      <p className="text-[10px] font-medium">{formatCurrency(Number(unit.currentPrice))}</p>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
