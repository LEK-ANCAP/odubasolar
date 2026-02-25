"use client"

import { Suspense, useState, useEffect } from "react"
import { BudgetForm } from "@/components/admin/budgets/budget-form"
import { InitialForm } from "@/components/budget/initial-form"
import { Loader2 } from "lucide-react"
import { getBudgetQuestions } from "@/app/actions/budget-config"

export default function NewBudgetPage() {
    const [initialItems, setInitialItems] = useState<any[]>([])
    const [showWizard, setShowWizard] = useState(false) // Default false until we check questions
    const [isLoading, setIsLoading] = useState(true)
    const [questions, setQuestions] = useState<any[]>([])

    useEffect(() => {
        const checkQuestions = async () => {
            try {
                const data = await getBudgetQuestions()
                setQuestions(data)
                if (data.length > 0) {
                    setShowWizard(true)
                }
            } catch (error) {
                console.error("Failed to load questions", error)
            } finally {
                setIsLoading(false)
            }
        }
        checkQuestions()
    }, [])

    const handleWizardComplete = (items: any[]) => {
        setInitialItems(items)
        setShowWizard(false)
    }

    const handleSkip = () => {
        setInitialItems([])
        setShowWizard(false)
    }

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
    }

    if (showWizard) {
        return (
            <div className="max-w-5xl mx-auto py-6">
                <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>}>
                    <InitialForm
                        questions={questions}
                        onComplete={handleWizardComplete}
                        onSkip={handleSkip}
                    />
                </Suspense>
            </div>
        )
    }

    return (
        <div className="max-w-5xl mx-auto py-6">
            <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>}>
                <BudgetForm initialItems={initialItems} />
            </Suspense>
        </div>
    )
}
