"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Save, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSettingsStore } from "@/hooks/use-settings-store"

interface ConfigModalProps {
    isOpen: boolean
    onClose: () => void
}

export function ConfigModal({ isOpen, onClose }: ConfigModalProps) {
    const { usdRate, eurRate, setUsdRate, setEurRate } = useSettingsStore()
    const [localUsd, setLocalUsd] = useState(usdRate.toString())
    const [localEur, setLocalEur] = useState(eurRate.toString())

    useEffect(() => {
        if (isOpen) {
            setLocalUsd(usdRate.toString())
            setLocalEur(eurRate.toString())
        }
    }, [isOpen, usdRate, eurRate])

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault()
        setUsdRate(Number(localUsd))
        setEurRate(Number(localEur))
        onClose()
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-xl shadow-xl z-50 border border-slate-100 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Configuración</h2>
                                <p className="text-slate-500 text-xs">Tasas de cambio y preferencias.</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-slate-100 h-8 w-8">
                                <X className="w-4 h-4 text-slate-500" />
                            </Button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSave} className="p-6 space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                    <RefreshCw className="w-4 h-4 text-emerald-500" />
                                    Tasa de Cambio (Base: CUP)
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="usdRate" className="text-xs text-slate-500 font-medium">1 USD =</Label>
                                        <div className="relative">
                                            <Input
                                                id="usdRate"
                                                type="number"
                                                value={localUsd}
                                                onChange={(e) => setLocalUsd(e.target.value)}
                                                className="pr-12 h-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors text-sm font-semibold text-slate-900"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">CUP</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="eurRate" className="text-xs text-slate-500 font-medium">1 EUR =</Label>
                                        <div className="relative">
                                            <Input
                                                id="eurRate"
                                                type="number"
                                                value={localEur}
                                                onChange={(e) => setLocalEur(e.target.value)}
                                                className="pr-12 h-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors text-sm font-semibold text-slate-900"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">CUP</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
                            <Button variant="ghost" onClick={onClose} className="h-9 px-4 text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-white">Cancelar</Button>
                            <Button onClick={handleSave} className="h-9 px-4 bg-slate-900 text-white hover:bg-slate-800 text-xs font-medium shadow-sm">
                                <Save className="w-3.5 h-3.5 mr-2" />
                                Guardar Cambios
                            </Button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
