"use client"

import { useState, useMemo, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { PackageOpen, ArrowRight, CheckCircle2 } from "lucide-react"
import { Kit, AttributeOption } from "@/hooks/use-kits-store"
import { useInventoryStore } from "@/hooks/use-inventory-store"
import { cn } from "@/lib/utils"

interface KitConfigurationWizardProps {
    kit: Kit | null
    isOpen: boolean
    onClose: () => void
    onConfirm: (products: { productId: string; quantity: number; unitCost: number }[]) => void
}

export function KitConfigurationWizard({ kit, isOpen, onClose, onConfirm }: KitConfigurationWizardProps) {
    const { products: inventoryProducts } = useInventoryStore()
    const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})

    // Reset options when kit changes
    useEffect(() => {
        if (isOpen && kit) {
            const initialOptions: Record<string, string> = {}
            kit.attributes.forEach(attr => {
                if (attr.options.length > 0) {
                    initialOptions[attr.name] = attr.options[0].value
                }
            })
            setSelectedOptions(initialOptions)
        }
    }, [isOpen, kit])

    const resolvedProducts = useMemo(() => {
        if (!kit) return []

        // Start with base products
        const productMap = new Map<string, number>()

        // Add base products
        kit.products.forEach(p => {
            productMap.set(p.productId, p.quantity)
        })

        // Apply variations from selected options
        kit.attributes.forEach(attr => {
            const selectedValue = selectedOptions[attr.name]
            const selectedOption = attr.options.find(o => o.value === selectedValue)

            if (selectedOption) {
                selectedOption.variations.forEach(v => {
                    const currentQty = productMap.get(v.productId) || 0
                    const newQty = currentQty + v.quantityAdjustment

                    if (newQty <= 0) {
                        productMap.delete(v.productId)
                    } else {
                        productMap.set(v.productId, newQty)
                    }
                })
            }
        })

        // Convert map to array with details
        return Array.from(productMap.entries()).map(([productId, quantity]) => {
            const product = inventoryProducts.find(p => p.id === productId)
            return {
                productId,
                quantity,
                unitCost: product?.costUsd || 0,
                name: product?.name || "Producto Desconocido",
                stock: product?.stock || 0
            }
        })
    }, [kit, selectedOptions, inventoryProducts])

    const handleConfirm = () => {
        onConfirm(resolvedProducts.map(p => ({
            productId: p.productId,
            quantity: p.quantity,
            unitCost: p.unitCost
        })))
        onClose()
    }

    if (!kit) return null

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-2xl p-0 overflow-hidden gap-0">
                <DialogHeader className="p-6 bg-slate-50 border-b border-slate-100">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <PackageOpen className="w-5 h-5 text-blue-600" />
                        Configurar Kit: {kit.name}
                    </DialogTitle>
                    <p className="text-sm text-slate-500 mt-1">
                        Selecciona las opciones para personalizar este kit.
                    </p>
                </DialogHeader>

                <div className="flex flex-col md:flex-row h-[60vh] md:h-[500px]">
                    {/* Options Column */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8 border-r border-slate-100">
                        {kit.attributes.map((attr, attrIdx) => (
                            <div key={attr.name || `attr-${attrIdx}`} className="space-y-3">
                                <Label className="text-base font-semibold text-slate-900">
                                    {attr.name}
                                </Label>
                                <RadioGroup
                                    value={selectedOptions[attr.name]}
                                    onValueChange={(val) => setSelectedOptions(prev => ({ ...prev, [attr.name]: val }))}
                                    className="grid gap-2"
                                >
                                    {attr.options.map((option, optIdx) => (
                                        <div key={option.value || `opt-${optIdx}`}>
                                            <RadioGroupItem
                                                value={option.value}
                                                id={`${attr.name}-${option.value}`}
                                                className="peer sr-only"
                                            />
                                            <Label
                                                htmlFor={`${attr.name}-${option.value}`}
                                                className="flex items-start justify-between rounded-md border-2 border-slate-100 bg-white p-3 hover:bg-slate-50 hover:text-slate-900 peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50/50 [&:has([data-state=checked])]:border-blue-500 cursor-pointer transition-all"
                                            >
                                                <div className="space-y-1">
                                                    <p className="text-sm font-medium leading-none">
                                                        {option.label}
                                                    </p>
                                                    {option.variations.length > 0 && (
                                                        <p className="text-xs text-slate-500">
                                                            {option.variations.map(v => {
                                                                const product = inventoryProducts.find(p => p.id === v.productId)
                                                                const sign = v.quantityAdjustment > 0 ? "+" : ""
                                                                return `${sign}${v.quantityAdjustment} ${product?.name || v.productId}`
                                                            }).join(", ")}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="h-4 w-4 rounded-full border border-blue-600 opacity-0 peer-data-[state=checked]:opacity-100 flex items-center justify-center">
                                                    <div className="h-2 w-2 rounded-full bg-blue-600" />
                                                </div>
                                            </Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            </div>
                        ))}
                    </div>

                    {/* Preview Column */}
                    <div className="w-full md:w-80 bg-slate-50/50 flex flex-col border-t md:border-t-0 border-slate-100">
                        <div className="p-4 border-b border-slate-100 bg-slate-50">
                            <h4 className="font-semibold text-sm text-slate-900 uppercase tracking-wider">Resumen de Productos</h4>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {resolvedProducts.map((item, itemIdx) => (
                                <div key={item.productId || `resolved-${itemIdx}`} className="flex items-center gap-3 bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm">
                                    <div className="h-8 w-8 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                                        <PackageOpen className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-900 truncate" title={item.name}>
                                            {item.name}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            ID: {item.productId}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-slate-900">{item.quantity}</div>
                                        <div className="text-[10px] text-slate-400">UNID</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-white shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-sm font-medium text-slate-500">Total Items</span>
                                <span className="text-lg font-bold text-slate-900">{resolvedProducts.length}</span>
                            </div>
                            <Button onClick={handleConfirm} className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-md">
                                Confirmar y Añadir
                                <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
