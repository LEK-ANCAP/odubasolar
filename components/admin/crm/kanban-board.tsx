'use client'

import { useState } from "react"
import { Deal, updateDealStage } from "@/app/actions/crm"
import { motion } from "framer-motion"
import { DealCard } from "./deal-card"
import { AddDealButton } from "./add-deal-button"
import { toast } from "sonner"

type KanbanBoardProps = {
    initialDeals: Deal[]
}

const COLUMNS = [
    { id: "PROSPECT", title: "Prospecto" },
    { id: "CONTACTED", title: "Contactado" },
    { id: "PITCH", title: "Propuesta" },
    { id: "REVIEW", title: "Revisión" },
    { id: "NEGOTIATION", title: "Negociación" },
    { id: "WON", title: "Ganada" },
    { id: "LOST", title: "Perdida" },
]

export function KanbanBoard({ initialDeals }: KanbanBoardProps) {
    const [deals, setDeals] = useState<Deal[]>(initialDeals)
    const [activeId, setActiveId] = useState<string | null>(null)

    const handleDragStart = (id: string) => {
        setActiveId(id)
    }

    // Optimized for simple column switching without full dnd-kit overhead if we use simple state toggles,
    // but for drag and drop we might want a library.
    // Actually, let's implement a simple "Select Status" dropdown on the card as a fallback interaction, 
    // and full drag-drop if requested. 
    // The user asked for "Visual like I show you", which implies drag and drop columns.
    // Implementing full Drag and Drop with just Framer Motion can be tricky for lists.
    // Let's use a simple approach: The cards move, but we might just use a mutation to update local state immediately.

    // Real implementation of Drag and Drop might require more code or a library like @dnd-kit/core.
    // Since we don't have it, and stick to "simple and practical", I'll implement a robust Click-to-Move or Drag-Select.
    // WAIT, I can use HTML5 Drag and Drop which is native!

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault()
    }

    const onDrop = async (e: React.DragEvent, stage: string) => {
        e.preventDefault()
        const dealId = e.dataTransfer.getData("dealId")
        if (!dealId) return

        // Optimistic Update
        const deal = deals.find(d => d.id === dealId)
        if (deal && deal.stage !== stage) {
            const oldStage = deal.stage
            setDeals(deals.map(d => d.id === dealId ? { ...d, stage } : d))

            const res = await updateDealStage(dealId, stage)
            if (!res.success) {
                // Revert
                setDeals(deals.map(d => d.id === dealId ? { ...d, stage: oldStage } : d))
                toast.error("Error al mover el deal")
            }
        }
    }

    const onDragStart = (e: React.DragEvent, dealId: string) => {
        e.dataTransfer.setData("dealId", dealId)
    }

    return (
        <div className="flex h-full gap-4 pb-4 w-fit min-w-full">
            {COLUMNS.map(column => (
                <div
                    key={column.id}
                    className="w-80 flex-shrink-0 flex flex-col bg-muted/30 rounded-lg p-2 border border-border/50"
                    onDragOver={onDragOver}
                    onDrop={(e) => onDrop(e, column.id)}
                >
                    <div className="flex items-center justify-between p-2 mb-2 font-semibold">
                        <span className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${getColumnColor(column.id)}`} />
                            {column.title}
                        </span>
                        <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded border">
                            {deals.filter(d => d.stage === column.id).length}
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 min-h-[500px]">
                        {/* Add button available in every column or just the first? Usually first. */}
                        {column.id === 'PROSPECT' && (
                            <AddDealButton />
                        )}

                        {deals.filter(d => d.stage === column.id).map(deal => (
                            <DealCard
                                key={deal.id}
                                deal={deal}
                                onDragStart={(e) => onDragStart(e, deal.id)}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}

function getColumnColor(id: string) {
    switch (id) {
        case 'PROSPECT': return 'bg-slate-400'
        case 'CONTACTED': return 'bg-blue-400'
        case 'PITCH': return 'bg-yellow-400'
        case 'REVIEW': return 'bg-purple-400'
        case 'NEGOTIATION': return 'bg-orange-400'
        case 'WON': return 'bg-green-500'
        case 'LOST': return 'bg-red-500'
        default: return 'bg-gray-400'
    }
}
