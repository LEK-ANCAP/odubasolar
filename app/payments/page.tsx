import { PaymentsTable } from "@/components/admin/payments/payments-table"

export default function PaymentsPage() {
    return (
        <div className="h-full flex flex-col p-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Pagos</h1>
                    <p className="text-sm text-slate-500">Historial de pagos recibidos</p>
                </div>
            </div>

            <PaymentsTable />
        </div>
    )
}
