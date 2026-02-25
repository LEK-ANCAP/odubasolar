"use client"

import { useState } from "react"
import { Trash2, Plus, RefreshCw } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useInventoryStore } from "@/hooks/use-inventory-store"
import { useSettingsStore } from "@/hooks/use-settings-store"

export default function InventorySettingsPage() {
    const { categories, addCategory, removeCategory } = useInventoryStore()
    const { usdRate, eurRate, setUsdRate, setEurRate } = useSettingsStore()
    const [newCategory, setNewCategory] = useState("")

    const handleAddCategory = () => {
        if (newCategory.trim()) {
            addCategory(newCategory.trim())
            setNewCategory("")
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-12 pb-20">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">Configuración de Inventario</h1>
                <p className="text-slate-500">Reglas de negocio y definiciones globales para el inventario.</p>
            </div>

            {/* Currency Configuration */}
            <section className="space-y-6">
                <h2 className="text-lg font-bold text-slate-700 border-b border-slate-200 pb-2 flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-emerald-600" />
                    Tasa de Cambio y Moneda
                </h2>
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="usd-rate">Tasa de Cambio (1 USD)</Label>
                        <div className="relative">
                            <Input
                                id="usd-rate"
                                type="number"
                                value={usdRate}
                                onChange={(e) => setUsdRate(Number(e.target.value))}
                                className="pr-12 bg-white border-slate-200"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">CUP</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="eur-rate">Tasa de Cambio (1 EUR)</Label>
                        <div className="relative">
                            <Input
                                id="eur-rate"
                                type="number"
                                value={eurRate}
                                onChange={(e) => setEurRate(Number(e.target.value))}
                                className="pr-12 bg-white border-slate-200"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">CUP</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Default Values */}
            <section className="space-y-6">
                <h2 className="text-lg font-bold text-slate-700 border-b border-slate-200 pb-2">Valores por Defecto</h2>
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="default-category">Moneda Principal</Label>
                        <Input disabled value="CUP - Peso Cubano" className="bg-slate-100" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="sku-prefix">Prefijo SKU por Defecto</Label>
                        <Input id="sku-prefix" placeholder="ej. SOL-" className="bg-white/50 border-white/60" />
                    </div>
                </div>
            </section>

            {/* Category Control */}
            <section className="space-y-6">
                <h2 className="text-lg font-bold text-slate-700 border-b border-slate-200 pb-2">Gestión de Categorías</h2>
                <p className="text-sm text-slate-500">Estas categorías aparecerán en el selector al crear nuevos productos.</p>

                <div className="bg-white/40 border border-white/60 rounded-2xl p-6 backdrop-blur-sm shadow-sm space-y-6">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Nueva Categoría..."
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                            className="bg-white border-slate-200"
                        />
                        <Button onClick={handleAddCategory} className="bg-slate-900 text-white hover:bg-slate-800">
                            <Plus className="w-4 h-4 mr-2" />
                            Añadir
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {categories.map((category, catIdx) => (
                            <div key={category || `cat-${catIdx}`} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm group hover:border-slate-300 transition-colors">
                                <span className="font-medium text-slate-700">{category}</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeCategory(category)}
                                    className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 opacity-100" // Always visible for clarity or group-hover:opacity-100
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Lot Control */}
            <section className="space-y-6">
                <h2 className="text-lg font-bold text-slate-700 border-b border-slate-200 pb-2">Control de Lotes</h2>
                <div className="flex items-center justify-between p-4 bg-white/40 rounded-2xl border border-white/60">
                    <div className="space-y-1">
                        <Label className="text-base font-bold text-slate-800 cursor-pointer">Activar Rastreo de Lotes</Label>
                        <p className="text-sm text-slate-500">Require número de lote y fecha de expiración en entradas de stock.</p>
                    </div>
                    <Switch />
                </div>
            </section>

            <div className="pt-8 flex justify-end">
                <Button className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl px-8 py-6 text-lg shadow-lg shadow-slate-900/20">
                    Guardar Cambios
                </Button>
            </div>
        </div>
    )
}
