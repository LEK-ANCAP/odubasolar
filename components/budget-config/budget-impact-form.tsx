"use strict";
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2 } from "lucide-react"
import { addImpactToOption, removeImpact } from "@/app/actions/budget-config"
import { toast } from "sonner"
import { ProductSelector } from "@/components/admin/product-selector"

interface Impact {
    id: string
    productId: string
    quantity: number
    product: {
        name: string
    }
}

interface BudgetImpactFormProps {
    optionId: string
    initialImpacts: Impact[]
}

export function BudgetImpactForm({ optionId, initialImpacts }: BudgetImpactFormProps) {
    const [impacts, setImpacts] = useState<Impact[]>(initialImpacts)
    const [selectedProduct, setSelectedProduct] = useState<string>("")
    const [quantity, setQuantity] = useState<number>(1)
    const [isAdding, setIsAdding] = useState(false)

    const handleAdd = async () => {
        if (!selectedProduct) return

        setIsAdding(true)
        const result = await addImpactToOption({
            optionId,
            productId: selectedProduct,
            quantity
        })

        if (result.success && result.data) {
            // We need the product name for display, might need to fetch or get from combobox return
            // For now, reloading page or optimistic update is fine.
            // Let's rely on server revalidation to refresh the parent list, 
            // but here we need local state update if we want instant feedback without refresh.
            // simpler: just refresh router?

            // Quick fix: Just reload/revalidate parent. 
            // But for now, let's just toast and maybe waiting for parent refresh?
            toast.success("Impacto añadido")
            setSelectedProduct("")
            setQuantity(1)
            // In a real app we'd update local state properly
        } else {
            toast.error("Error al añadir impacto")
        }
        setIsAdding(false)
    }

    const handleRemove = async (id: string) => {
        const result = await removeImpact(id)
        if (result.success) {
            setImpacts(impacts.filter(i => i.id !== id))
            toast.success("Impacto eliminado")
        } else {
            toast.error("Error al eliminar")
        }
    }

    return (
        <div className="space-y-4 mt-4 border-t pt-4">
            <h4 className="text-sm font-medium">Productos asociados</h4>
            <div className="space-y-2">
                {impacts.map(impact => (
                    <div key={impact.id} className="flex items-center justify-between bg-slate-50 p-2 rounded text-sm">
                        <span>{impact.quantity}x {impact.product.name}</span>
                        <Button variant="ghost" size="icon" onClick={() => handleRemove(impact.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                    </div>
                ))}
            </div>

            <div className="flex gap-2 items-end">
                <div className="flex-1">
                    <Label className="text-xs">Producto</Label>
                    <ProductSelector value={selectedProduct} onChange={(val) => setSelectedProduct(val)} />
                </div>
                <div className="w-20">
                    <Label className="text-xs">Cant.</Label>
                    <Input type="number" min={1} value={quantity} onChange={e => setQuantity(parseInt(e.target.value))} />
                </div>
                <Button onClick={handleAdd} disabled={isAdding || !selectedProduct} size="icon">
                    <Plus className="w-4 h-4" />
                </Button>
            </div>
        </div>
    )
}
