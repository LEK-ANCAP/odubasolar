"use client"

import { useEffect, useState, Suspense } from "react"
import { useParams, useRouter } from "next/navigation"
import { OrderForm } from "@/components/admin/orders/order-form"
import { useOrdersStore, Order } from "@/hooks/use-orders-store"
import { Loader2 } from "lucide-react"

export default function EditOrderPage() {
    const params = useParams()
    const { orders, fetchOrders } = useOrdersStore()
    const [order, setOrder] = useState<Order | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // Ensure we have orders loaded
    useEffect(() => {
        fetchOrders()
    }, [fetchOrders])

    useEffect(() => {
        if (params.id && orders.length > 0) {
            const foundOrder = orders.find(o => o.id === params.id)
            setOrder(foundOrder || null)
            setIsLoading(false)
        } else if (orders.length === 0) {
            // Still loading check logic can be inferred by isLoading state if store exposes it
            // but fetchOrders triggers eventually.
        }
    }, [params.id, orders])

    const storeLoading = useOrdersStore(state => state.isLoading)
    const isPageLoading = isLoading || (storeLoading && orders.length === 0)

    if (isPageLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        )
    }

    if (!order) {
        return (
            <div className="flex h-[50vh] items-center justify-center flex-col gap-2">
                <h2 className="text-xl font-semibold">Compra no encontrada</h2>
                <p className="text-slate-500">La compra que intentas editar no existe.</p>
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto py-6">
            <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>}>
                <OrderForm orderToEdit={order} />
            </Suspense>
        </div>
    )
}
