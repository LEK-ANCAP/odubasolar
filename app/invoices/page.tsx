"use client"

import { InvoiceTable } from "@/components/admin/invoices/invoice-table"

export default function InvoicesPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Facturas</h1>
                    <p className="text-slate-500 text-sm mt-1">Gestiona las facturas y cobros a clientes.</p>
                </div>
            </div>

            <InvoiceTable />
        </div>
    )
}
