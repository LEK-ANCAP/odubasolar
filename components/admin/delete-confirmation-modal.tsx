"use client"

import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle, X, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DeleteConfirmationModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    productName: string
}

export function DeleteConfirmationModal({ isOpen, onClose, onConfirm, productName }: DeleteConfirmationModalProps) {
    if (!isOpen) return null

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-xl z-50 overflow-hidden"
                    >
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                    <AlertTriangle className="h-5 w-5 text-red-600" />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <h3 className="font-semibold text-slate-900 text-lg">¿Eliminar producto?</h3>
                                    <p className="text-slate-500 text-sm leading-relaxed">
                                        Estás a punto de eliminar <span className="font-semibold text-slate-700">"{productName}"</span>. Esta acción no se puede deshacer y perderás todo el historial asociado.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
                            <Button
                                variant="ghost"
                                onClick={onClose}
                                className="h-10 px-4 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={() => {
                                    onConfirm()
                                    onClose()
                                }}
                                className="h-10 bg-red-600 text-white hover:bg-red-700 rounded-lg px-6 shadow-sm font-medium flex items-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                Eliminar Definitivamente
                            </Button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
