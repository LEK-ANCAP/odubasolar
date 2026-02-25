"use client"

import { useEffect } from "react"
import { InventoryTable } from "@/components/admin/inventory-table"
// import { useAdminHeaderStore } from "@/hooks/use-admin-header-store"

export default function InventoryPage() {
    // const { setTitle, setActions } = useAdminHeaderStore() // Removed

    // useEffect(() => {
    //     setTitle("Inventario")
    //     setActions(null)
    // }, [setTitle, setActions])

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Inventario</h1>
            <InventoryTable />
        </div>
    )
}
