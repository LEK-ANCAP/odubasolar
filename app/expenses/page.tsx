import { Suspense } from "react"
import { prisma } from "@/lib/prisma"
import { getExpenseTemplates } from "@/app/actions/expenses"
import { ExpensesList } from "@/components/expenses/expenses-list"
import { ExpenseConfigDialog } from "@/components/expenses/expense-config-dialog"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default async function ExpensesPage() {
    const { data: templates = [] } = await getExpenseTemplates()
    const accounts = await prisma.financialAccount.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
    })

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight">Gastos Variables</h1>
                    <p className="text-muted-foreground text-sm">Configura y registra gastos recurrentes como salarios y operativos.</p>
                </div>
                {templates.length > 0 && (
                    <div className="hidden md:block w-full md:w-auto">
                        <ExpenseConfigDialog accounts={accounts} />
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <Suspense fallback={<div>Cargando gastos...</div>}>
                    <ExpensesList
                        templates={(templates || []).map(t => ({
                            ...t,
                            amount: Number(t.amount)
                        }))}
                        accounts={accounts}
                    />
                </Suspense>
            </div>

            {/* Mobile FAB */}
            <div className="md:hidden fixed bottom-6 right-6 z-40">
                <ExpenseConfigDialog
                    accounts={accounts}
                    trigger={
                        <Button className="h-14 w-14 rounded-full bg-slate-900 text-white shadow-lg hover:bg-slate-800 flex items-center justify-center p-0">
                            <Plus className="h-6 w-6" />
                        </Button>
                    }
                />
            </div>
        </div>
    )
}
