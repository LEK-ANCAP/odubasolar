import { getDeals } from "@/app/actions/crm"
import { KanbanBoard } from "@/components/admin/crm/kanban-board"
import { Separator } from "@/components/ui/separator"

export default async function CRMPage() {
    const { data: deals } = await getDeals()

    return (
        <div className="flex flex-col h-full space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">CRM</h2>
                    <p className="text-muted-foreground">
                        Gestiona tus leads y oportunidades de venta.
                    </p>
                </div>
            </div>
            <Separator />
            <div className="flex-1 overflow-x-auto overflow-y-hidden">
                <KanbanBoard initialDeals={deals?.map(d => ({
                    ...d,
                    value: Number(d.value)
                })) || []} />
            </div>
        </div>
    )
}
