"use client"

import { useSettingsStore } from "@/hooks/use-settings-store"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CircleDollarSign } from "lucide-react"

export function CurrencySettings() {
    const { usdRate, eurRate, setUsdRate, setEurRate } = useSettingsStore()

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Monedas y Tasas</h2>
                <p className="text-slate-500">Gestiona las tasas de cambio y configuraciones monetarias del sistema.</p>
            </div>

            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                        <CircleDollarSign className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Tasas de Cambio</h3>
                        <p className="text-sm text-slate-500">Valores de referencia para conversiones a moneda nacional (CUP).</p>
                    </div>
                </div>

                <div className="p-6 grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label>Tasa USD (CUP)</Label>
                        <Input
                            type="number"
                            value={usdRate}
                            onChange={(e) => setUsdRate(Number(e.target.value))}
                            className="bg-slate-50 border-slate-200 font-mono"
                        />
                        <p className="text-xs text-slate-400">1 USD = {usdRate} CUP</p>
                    </div>
                    <div className="space-y-2">
                        <Label>Tasa EUR (CUP)</Label>
                        <Input
                            type="number"
                            value={eurRate}
                            onChange={(e) => setEurRate(Number(e.target.value))}
                            className="bg-slate-50 border-slate-200 font-mono"
                        />
                        <p className="text-xs text-slate-400">1 EUR = {eurRate} CUP</p>
                    </div>
                </div>
            </section>
        </div>
    )
}
