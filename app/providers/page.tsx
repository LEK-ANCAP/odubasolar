"use client"

import { ProviderTable } from "@/components/admin/providers/provider-table"

export default function ProvidersPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Proveedores</h1>
                <p className="text-slate-500 text-sm mt-1">Gestiona tus proveedores.</p>
            </div>
            <ProviderTable />
        </div>
    )
}
