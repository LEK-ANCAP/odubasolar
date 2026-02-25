"use client"

import { useEffect, useState, Suspense } from "react"
import { useParams } from "next/navigation"
import { BudgetForm } from "@/components/admin/budgets/budget-form"
import { useBudgetsStore, Budget } from "@/hooks/use-budgets-store"
import { Loader2 } from "lucide-react"

export default function EditBudgetPage() {
    const params = useParams()
    const { budgets, fetchBudgets } = useBudgetsStore()
    const [budget, setBudget] = useState<Budget | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // Ensure we have budgets loaded
    useEffect(() => {
        fetchBudgets()
    }, [fetchBudgets])

    useEffect(() => {
        if (params.id && budgets.length > 0) {
            const foundBudget = budgets.find(b => b.id === params.id)
            setBudget(foundBudget || null)
            setIsLoading(false)
        } else if (budgets.length === 0) {
            // Still loading check logic...
        }
    }, [params.id, budgets])

    // Safety fallback for loading state from store if needed
    const storeLoading = useBudgetsStore(state => state.isLoading)

    // Combined loading check
    const isPageLoading = isLoading || (storeLoading && budgets.length === 0)

    if (isPageLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        )
    }

    if (!budget) {
        return (
            <div className="flex h-[50vh] items-center justify-center flex-col gap-2">
                <h2 className="text-xl font-semibold">Presupuesto no encontrado</h2>
                <p className="text-slate-500">El presupuesto que intentas editar no existe.</p>
            </div>
        )
    }

    return (
        <div className="max-w-5xl mx-auto py-6">
            <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>}>
                <BudgetForm budgetToEdit={budget} />
            </Suspense>
        </div>
    )
}
