"use client"

import { useEffect } from "react"
import { InventoryTable } from "@/components/admin/inventory-table"
import { ImportWizard } from "@/components/admin/inventory/import-wizard"

export default function InventoryPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-slate-800">Inventario</h1>
                <ImportWizard />
            </div>
            <InventoryTable />
        </div>
    )
}
