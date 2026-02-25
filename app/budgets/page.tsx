"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useBudgetsStore } from "@/hooks/use-budgets-store"
import { BudgetTable } from "@/components/admin/budgets/budget-table"
import { Button } from "@/components/ui/button"
import { Plus, Loader2 } from "lucide-react"

export default function BudgetsPage() {
    const router = useRouter()
    const { budgets, fetchBudgets, isLoading } = useBudgetsStore()

    useEffect(() => {
        fetchBudgets()
    }, [fetchBudgets])

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Presupuestos</h1>
                    <p className="text-slate-500 mt-2">Gestiona tus presupuestos y propuestas comerciales.</p>
                </div>
                <Button onClick={() => router.push("/budgets/new")} className="hidden md:flex bg-slate-900 text-white hover:bg-slate-800">
                    <Plus className="mr-2 h-4 w-4" /> Nuevo Presupuesto
                </Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
            ) : (
                <BudgetTable budgets={budgets} />
            )}
        </div>
    )
}
