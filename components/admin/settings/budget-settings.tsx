"use client"

import { QuestionList } from "@/components/budget-config/question-list"
import { Calculator } from "lucide-react"

export function BudgetSettings() {
    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Configuración de Presupuestos</h2>
                <p className="text-slate-500">Define las preguntas y reglas para la generación automática de presupuestos.</p>
            </div>

            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                    <div className="p-2 bg-slate-900 rounded-lg text-white">
                        <Calculator className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Lógica Inicial</h3>
                        <p className="text-sm text-slate-500">Preguntas que el usuario debe responder antes de crear un presupuesto.</p>
                    </div>
                </div>

                <div className="p-6">
                    <QuestionList />
                </div>
            </section>
        </div>
    )
}
