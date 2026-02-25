"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Save, Calculator, History, TrendingUp, TrendingDown, RefreshCw, AlertCircle, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { useInventoryStore, Product } from "@/hooks/use-inventory-store"
import { getProductHistory, getNextSku, getWeightedCost } from "@/app/actions/inventory"
import { useSettingsStore } from "@/hooks/use-settings-store"
import { cn } from "@/lib/utils"

interface AddProductModalProps {
    isOpen: boolean
    onClose: () => void
    productToEdit?: Product | null
}

export function AddProductModal({ isOpen, onClose, productToEdit }: AddProductModalProps) {
    const { categories, addProduct, updateProduct, isLoading, error } = useInventoryStore()
    const { usdRate } = useSettingsStore()
    const [activeTab, setActiveTab] = useState("general")

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        category: "",
        stock: "",
        costCup: "",
        costUsd: "",
        saleCup: "",
        saleUsd: "",
        sku: "",
        lowStockThreshold: "10",
        margin: "30",
        useWeightedCost: true,
        weightedCost: "0" // Display only, or editable if needed
    })

    const [historyMovements, setHistoryMovements] = useState<any[]>([])
    const [historyLoading, setHistoryLoading] = useState(false)
    const [weightedCostLoading, setWeightedCostLoading] = useState(false)
    const [weightedCostError, setWeightedCostError] = useState<string | null>(null)
    const [weightedCostUnits, setWeightedCostUnits] = useState<number | null>(null)

    useEffect(() => {
        if ((activeTab === 'history' || activeTab === 'economy') && productToEdit) {
            setHistoryLoading(true)
            getProductHistory(productToEdit.id)
                .then(result => {
                    if (result.success && result.data) {
                        setHistoryMovements(result.data)
                    }
                })
                .catch(err => console.error(err))
                .finally(() => setHistoryLoading(false))
        }
    }, [activeTab, productToEdit])

    useEffect(() => {
        if (isOpen) {
            setActiveTab("general")
            setWeightedCostError(null)
            setWeightedCostUnits(null)

            if (productToEdit) {
                const useWeighted = productToEdit.useWeightedCost || false
                setFormData({
                    name: productToEdit.name,
                    category: productToEdit.category,
                    stock: productToEdit.stock.toString(),
                    costCup: productToEdit.costCup.toString(),
                    costUsd: productToEdit.costUsd.toString(),
                    saleCup: productToEdit.saleCup.toString(),
                    saleUsd: productToEdit.saleUsd.toString(),
                    sku: productToEdit.sku || productToEdit.id,
                    lowStockThreshold: productToEdit.lowStockThreshold?.toString() || "10",
                    margin: "30",
                    useWeightedCost: useWeighted,
                    weightedCost: productToEdit.weightedCost?.toString() || "0"
                })

                // If already using weighted cost, refresh it from purchase history
                if (useWeighted) {
                    setWeightedCostLoading(true)
                    getWeightedCost(productToEdit.id)
                        .then(result => {
                            if (result.success && result.weightedCost !== undefined) {
                                setFormData(prev => ({ ...prev, weightedCost: result.weightedCost!.toFixed(2) }))
                                setWeightedCostUnits(result.totalUnits ?? null)
                            } else {
                                setWeightedCostError(result.error || 'Error al calcular')
                            }
                        })
                        .catch(() => setWeightedCostError('Error de conexión'))
                        .finally(() => setWeightedCostLoading(false))
                }
            } else {
                setFormData({
                    name: "",
                    category: "",
                    stock: "",
                    costCup: "",
                    costUsd: "",
                    saleCup: "",
                    saleUsd: "",
                    sku: "Cargando...",
                    lowStockThreshold: "10",
                    margin: "30",
                    useWeightedCost: true,
                    weightedCost: "0"
                })

                // Fetch next SKU
                getNextSku().then(result => {
                    if (result.success && result.sku) {
                        setFormData(prev => ({ ...prev, sku: result.sku }))
                    } else {
                        setFormData(prev => ({ ...prev, sku: "" }))
                    }
                })
            }
        }
    }, [isOpen, productToEdit])

    const handleCostChange = (value: string, currency: 'cup' | 'usd') => {
        const newData = { ...formData }
        if (currency === 'cup') newData.costCup = value
        else newData.costUsd = value
        setFormData(newData)
    }

    const handleSaleChange = (value: string, currency: 'cup' | 'usd') => {
        const newData = { ...formData }
        if (currency === 'cup') newData.saleCup = value
        else newData.saleUsd = value
        setFormData(newData)
    }

    const handleConvertCosts = () => {
        const costCup = parseFloat(formData.costCup) || 0
        const costUsd = parseFloat(formData.costUsd) || 0
        const newData = { ...formData }

        if (costCup > 0 && !costUsd) {
            newData.costUsd = (costCup / usdRate).toFixed(2)
        } else if (costUsd > 0 && !costCup) {
            newData.costCup = (costUsd * usdRate).toFixed(0)
        }
        setFormData(newData)
    }

    const calculatePrice = () => {
        const costCup = parseFloat(formData.costCup) || 0
        const costUsd = parseFloat(formData.costUsd) || 0
        const newData = { ...formData }

        // 1. Auto-fill missing Cost based on the other currency
        if (costCup > 0 && !costUsd) {
            newData.costUsd = (costCup / usdRate).toFixed(2)
        } else if (costUsd > 0 && !costCup) {
            newData.costCup = (costUsd * usdRate).toFixed(0)
        }

        // Re-read costs after potential auto-fill
        const finalCostCup = parseFloat(newData.costCup) || 0
        const finalCostUsd = parseFloat(newData.costUsd) || 0


        const marginPercentage = parseFloat(formData.margin) || 30
        const marginMultiplier = 1 + (marginPercentage / 100)

        // 2. Calculate Sale Prices (using dynamic margin)
        if (finalCostCup > 0) {
            newData.saleCup = (finalCostCup * marginMultiplier).toFixed(0)
        }
        if (finalCostUsd > 0) {
            newData.saleUsd = (finalCostUsd * marginMultiplier).toFixed(2)
        }

        // 3. Auto-fill missing Sale based on the other currency (if margin calc didn't cover it)
        const saleCup = parseFloat(newData.saleCup) || 0
        const saleUsd = parseFloat(newData.saleUsd) || 0

        if (saleCup > 0 && !saleUsd) {
            newData.saleUsd = (saleCup / usdRate).toFixed(2)
        } else if (saleUsd > 0 && !saleCup) {
            newData.saleCup = (saleUsd * usdRate).toFixed(0)
        }

        setFormData(newData)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const threshold = Number(formData.lowStockThreshold) || 10
        const stock = Number(formData.stock)

        // When weighted cost is active, the cost IS the weighted cost
        const effectiveCostUsd = formData.useWeightedCost
            ? Number(formData.weightedCost) || 0
            : Number(formData.costUsd) || 0
        const effectiveCostCup = formData.useWeightedCost
            ? (Number(formData.weightedCost) || 0) * usdRate
            : Number(formData.costCup) || 0

        const commonData = {
            name: formData.name,
            category: formData.category,
            stock: stock,
            costCup: effectiveCostCup,
            costUsd: effectiveCostUsd,
            saleCup: Number(formData.saleCup),
            saleUsd: Number(formData.saleUsd),
            status: stock > threshold ? 'in_stock' as const : stock > 0 ? 'low_stock' as const : 'out_of_stock' as const,
            lowStockThreshold: threshold,
            weightedCost: Number(formData.weightedCost),
            useWeightedCost: formData.useWeightedCost,
        }

        let success = false
        if (productToEdit) {
            success = await updateProduct(productToEdit.id, commonData)
        } else {
            success = await addProduct({
                sku: formData.sku,
                ...commonData
            })
        }

        if (success) {
            onClose()
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="bg-white w-full max-w-4xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] relative z-10 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white shrink-0">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">{productToEdit ? "Editar Producto" : "Nuevo Producto"}</h2>
                                <p className="text-slate-500 text-sm mt-0.5">{productToEdit ? "Modificar detalles e historial." : "Añadir nuevo ítem al inventario."}</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Tabs content wrapper */}
                        <div className="flex-1 overflow-hidden flex flex-col bg-white min-h-0">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full min-h-0">
                                <div className="px-6 pt-4 shrink-0 border-b border-slate-100 pb-4">
                                    <TabsList className="grid w-full max-w-md grid-cols-3">
                                        <TabsTrigger value="general">General</TabsTrigger>
                                        <TabsTrigger value="economy">Economía</TabsTrigger>
                                        <TabsTrigger value="history">Historial</TabsTrigger>
                                    </TabsList>
                                </div>

                                <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
                                    {/* GENERAL TAB */}
                                    <TabsContent value="general" className="mt-0 h-full">
                                        <div className="space-y-6 max-w-2xl">
                                            <div className="grid gap-6">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="name" className="text-slate-700 font-medium">Nombre del Producto</Label>
                                                    <Input
                                                        id="name"
                                                        required
                                                        placeholder="Ej: Cable Solar 4mm..."
                                                        className="h-10 bg-slate-50 border-slate-200 focus-visible:ring-slate-900"
                                                        value={formData.name}
                                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="category" className="text-slate-700 font-medium">Categoría</Label>
                                                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                                                        <SelectTrigger className="h-10 bg-slate-50 border-slate-200 focus:ring-slate-900">
                                                            <SelectValue placeholder="Seleccionar" />
                                                        </SelectTrigger>
                                                        <SelectContent className="z-[100] bg-white border-slate-200">
                                                            {categories.map((cat, idx) => (
                                                                <SelectItem key={`cat-opt-${cat || idx}-${idx}`} value={cat}>{cat || "Sin categoría"}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            <div className="border-t border-slate-100 pt-6 mt-2">
                                                <h3 className="text-sm font-semibold text-slate-800 mb-5 flex items-center gap-2">
                                                    <RefreshCw className="w-4 h-4 text-slate-400" />
                                                    Control de Inventario
                                                </h3>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="stock" className="text-slate-700">Stock Actual</Label>
                                                        <Input
                                                            id="stock"
                                                            type="number"
                                                            placeholder="0"
                                                            className="h-10 bg-white border-slate-200 focus-visible:ring-slate-900"
                                                            value={formData.stock}
                                                            onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="lowStockThreshold" className="text-slate-700">Alerta de Stock Bajo</Label>
                                                        <div className="relative">
                                                            <Input
                                                                id="lowStockThreshold"
                                                                type="number"
                                                                placeholder="10"
                                                                className="h-10 bg-white border-slate-200 focus-visible:ring-slate-900 pr-16"
                                                                value={formData.lowStockThreshold}
                                                                onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                                                            />
                                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none pl-2">unidades</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </TabsContent>

                                    {/* ECONOMY TAB */}
                                    <TabsContent value="economy" className="mt-0">
                                        {/* Main Pricing */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                                            {/* Cost Column */}
                                            <div className="space-y-5">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                                        <TrendingDown className="w-4 h-4 text-blue-600" />
                                                        Costes
                                                    </h3>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs text-slate-400 font-mono">1 USD = {usdRate} CUP</span>
                                                        <Button variant="ghost" size="sm" onClick={handleConvertCosts} className="h-6 text-[10px] text-blue-600 hover:bg-blue-50 px-2 uppercase font-bold tracking-wide">
                                                            Convertir
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <div className="grid gap-1.5">
                                                        <Label className="text-xs text-slate-500">Coste Manual (USD)</Label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                                                            <Input
                                                                className={cn("pl-7 h-9 border-slate-200", formData.useWeightedCost ? "bg-blue-50 text-blue-700 cursor-not-allowed" : "bg-slate-50")}
                                                                value={formData.useWeightedCost ? (parseFloat(formData.weightedCost || '0').toFixed(2)) : formData.costUsd}
                                                                onChange={(e) => !formData.useWeightedCost && handleCostChange(e.target.value, 'usd')}
                                                                readOnly={formData.useWeightedCost}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="grid gap-1.5">
                                                        <Label className="text-xs text-slate-500">Coste Manual (CUP)</Label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₱</span>
                                                            <Input
                                                                className={cn("pl-7 h-9 border-slate-200", formData.useWeightedCost ? "bg-blue-50 text-blue-700 cursor-not-allowed" : "bg-slate-50")}
                                                                value={formData.useWeightedCost ? ((parseFloat(formData.weightedCost || '0') * usdRate).toFixed(0)) : formData.costCup}
                                                                onChange={(e) => !formData.useWeightedCost && handleCostChange(e.target.value, 'cup')}
                                                                readOnly={formData.useWeightedCost}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="pt-5 border-t border-slate-100">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <Label htmlFor="useWeighted" className="text-sm text-slate-700 font-medium cursor-pointer">Usar Coste Ponderado</Label>
                                                        <Switch
                                                            id="useWeighted"
                                                            checked={formData.useWeightedCost}
                                                            onCheckedChange={async (checked) => {
                                                                setFormData(prev => ({ ...prev, useWeightedCost: checked }))
                                                                if (checked && productToEdit) {
                                                                    setWeightedCostLoading(true)
                                                                    setWeightedCostError(null)
                                                                    try {
                                                                        const result = await getWeightedCost(productToEdit.id)
                                                                        if (result.success && result.weightedCost !== undefined) {
                                                                            setFormData(prev => ({ ...prev, useWeightedCost: true, weightedCost: result.weightedCost!.toFixed(2) }))
                                                                            setWeightedCostUnits(result.totalUnits ?? null)
                                                                        } else {
                                                                            setWeightedCostError(result.error || 'Error al calcular')
                                                                        }
                                                                    } catch {
                                                                        setWeightedCostError('Error de conexión')
                                                                    } finally {
                                                                        setWeightedCostLoading(false)
                                                                    }
                                                                } else if (!checked) {
                                                                    setWeightedCostUnits(null)
                                                                    setWeightedCostError(null)
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                    {formData.useWeightedCost && (
                                                        <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-100 space-y-2 mb-3">
                                                            {weightedCostLoading ? (
                                                                <div className="flex items-center gap-2 text-sm text-blue-600">
                                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                                    Calculando desde historial de compras...
                                                                </div>
                                                            ) : weightedCostError ? (
                                                                <div className="flex items-center gap-2 text-sm text-rose-600">
                                                                    <AlertCircle className="w-4 h-4" />
                                                                    {weightedCostError}
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-sm text-blue-700 font-medium">Valor Calculado</span>
                                                                        <span className="text-base font-bold text-blue-800">${parseFloat(formData.weightedCost || '0').toFixed(2)}</span>
                                                                    </div>
                                                                    {weightedCostUnits !== null && (
                                                                        <p className="text-xs text-blue-500">
                                                                            Basado en {weightedCostUnits} unidad{weightedCostUnits !== 1 ? 'es' : ''} compradas (órdenes recibidas)
                                                                        </p>
                                                                    )}
                                                                    {weightedCostUnits === 0 && (
                                                                        <p className="text-xs text-amber-600 flex items-center gap-1.5 mt-1">
                                                                            <AlertCircle className="w-3.5 h-3.5" />
                                                                            Sin compras registradas. El coste ponderado es $0.00.
                                                                        </p>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                    <p className="text-xs text-slate-500 leading-relaxed">
                                                        Activa esta opción para que los reportes financieros utilicen el promedio ponderado de las compras históricas en lugar del coste manual.
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Sale Column */}
                                            <div className="space-y-5">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                                                        Ventas
                                                    </h3>
                                                    <Button variant="ghost" size="sm" onClick={calculatePrice} className="h-6 text-[10px] text-emerald-600 hover:bg-emerald-50 px-2 uppercase font-bold tracking-wide">
                                                        Autocalcular
                                                    </Button>
                                                </div>

                                                <div className="bg-emerald-50/30 p-3 rounded-lg border border-emerald-100/50 flex items-center gap-3">
                                                    <Label className="text-xs font-medium text-emerald-700">Margen Deseado (%)</Label>
                                                    <Input
                                                        className="h-7 w-20 text-center bg-white border-emerald-200 text-xs font-bold text-emerald-800 focus-visible:ring-emerald-500"
                                                        value={formData.margin}
                                                        onChange={(e) => setFormData({ ...formData, margin: e.target.value })}
                                                    />
                                                </div>

                                                <div className="space-y-3">
                                                    <div className="grid gap-1.5">
                                                        <Label className="text-xs text-slate-500">Precio Venta (USD)</Label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                                                            <Input
                                                                className="pl-7 h-9 bg-white border-slate-200 focus-visible:ring-emerald-500"
                                                                value={formData.saleUsd}
                                                                onChange={(e) => handleSaleChange(e.target.value, 'usd')}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="grid gap-1.5">
                                                        <Label className="text-xs text-slate-500">Precio Venta (CUP)</Label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₱</span>
                                                            <Input
                                                                className="pl-7 h-9 bg-white border-slate-200 focus-visible:ring-emerald-500"
                                                                value={formData.saleCup}
                                                                onChange={(e) => handleSaleChange(e.target.value, 'cup')}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Real History Lists */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mt-12 pt-8 border-t border-slate-100">
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-800 mb-5 flex items-center gap-2">
                                                    <TrendingDown className="w-4 h-4 text-blue-500" />
                                                    Historial de Costes (Compras)
                                                </h4>
                                                <div className="space-y-4">
                                                    {historyMovements.filter(m => m.type === 'Compra').slice(0, 5).map((move) => (
                                                        <div key={move.id} className="flex justify-between items-center text-sm py-3 border-b border-slate-100 last:border-0">
                                                            <span className="text-slate-500">{new Date(move.date).toLocaleDateString()}</span>
                                                            <div className="flex gap-4">
                                                                <span className="text-slate-600 font-medium bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">{move.quantity} u.</span>
                                                                <span className="font-bold text-slate-900">${Number(move.unitCost).toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {historyMovements.filter(m => m.type === 'Compra').length === 0 && (
                                                        <p className="text-sm text-slate-400 italic bg-slate-50 border border-slate-100 border-dashed rounded-lg p-4 text-center">No hay compras registradas</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-800 mb-5 flex items-center gap-2">
                                                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                                                    Historial de Ventas
                                                </h4>
                                                <div className="space-y-4">
                                                    {historyMovements.filter(m => m.type === 'Venta').slice(0, 5).map((move) => (
                                                        <div key={move.id} className="flex justify-between items-center text-sm py-3 border-b border-slate-100 last:border-0">
                                                            <span className="text-slate-500">{new Date(move.date).toLocaleDateString()}</span>
                                                            <div className="flex gap-4 items-center">
                                                                <span className="text-slate-600 truncate max-w-[140px] text-xs font-medium" title={move.concept}>{move.concept.split(' - ')[0]}</span>
                                                                <span className="font-bold text-emerald-600">${Number(move.price).toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {historyMovements.filter(m => m.type === 'Venta').length === 0 && (
                                                        <p className="text-sm text-slate-400 italic bg-slate-50 border border-slate-100 border-dashed rounded-lg p-4 text-center">No hay ventas registradas</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </TabsContent>

                                    {/* HISTORY TAB */}
                                    <TabsContent value="history" className="mt-0 h-full">
                                        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm mt-2">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-medium">
                                                    <tr>
                                                        <th className="px-5 py-3">Fecha</th>
                                                        <th className="px-5 py-3">Tipo</th>
                                                        <th className="px-5 py-3">Concepto</th>
                                                        <th className="px-5 py-3 text-right">Cantidad</th>
                                                        <th className="px-5 py-3 text-right">Saldo</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {historyLoading ? (
                                                        <tr>
                                                            <td colSpan={5} className="text-center py-8 text-slate-400">
                                                                <RefreshCw className="w-4 h-4 mx-auto animate-spin mb-2" />
                                                                Cargando historial...
                                                            </td>
                                                        </tr>
                                                    ) : historyMovements.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={5} className="text-center py-8 text-slate-400">
                                                                No hay movimientos registrados
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        historyMovements.map((move) => (
                                                            <tr key={move.id}>
                                                                <td className="px-5 py-3 text-slate-600">
                                                                    {new Date(move.date).toLocaleDateString()}
                                                                </td>
                                                                <td className="px-5 py-3">
                                                                    <Badge variant="outline" className={cn(
                                                                        "font-normal border-opacity-50",
                                                                        move.type === 'Compra' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                                                            move.type === 'Venta' ? "bg-blue-50 text-blue-700 border-blue-100" :
                                                                                "bg-slate-50 text-slate-700 border-slate-100"
                                                                    )}>
                                                                        {move.type}
                                                                    </Badge>
                                                                </td>
                                                                <td className="px-5 py-3 text-slate-700">{move.concept}</td>
                                                                <td className={cn(
                                                                    "px-5 py-3 text-right font-medium",
                                                                    move.quantity > 0 ? "text-emerald-600" : "text-rose-600"
                                                                )}>
                                                                    {move.quantity > 0 ? "+" : ""}{move.quantity}
                                                                </td>
                                                                <td className="px-5 py-3 text-right text-slate-600 font-mono">
                                                                    {move.balance}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                            {!historyLoading && historyMovements.length > 0 && (
                                                <div className="p-8 text-center text-slate-400 text-xs">
                                                    • Fin del historial •
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>
                                </div>
                            </Tabs>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-white shrink-0 z-20">
                            <Button
                                variant="ghost"
                                onClick={onClose}
                                disabled={isLoading}
                                className="h-10 px-4 text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-medium text-sm transition-colors"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={(e) => handleSubmit(e)}
                                disabled={isLoading}
                                className="h-10 bg-slate-900 text-white hover:bg-slate-800 px-6 shadow-sm font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4 mr-2" />
                                )}
                                {productToEdit ? "Actualizar" : "Guardar"}
                            </Button>
                        </div>
                        {error && (
                            <div className="px-6 py-2 bg-rose-50 border-t border-rose-100 text-rose-600 text-xs font-medium flex items-center justify-center">
                                <AlertCircle className="w-3.5 h-3.5 mr-2" />
                                {error}
                            </div>
                        )}
                    </motion.div>
                </div >
            )
            }
        </AnimatePresence>
    )
}
