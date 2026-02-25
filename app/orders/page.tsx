"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
// import { useAdminHeaderStore } from "@/hooks/use-admin-header-store"
import { useOrdersStore } from "@/hooks/use-orders-store"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { OrderTable } from "@/components/admin/orders/order-table"
import { OrderReceipt } from "@/components/admin/orders/order-receipt"

function OrdersPageContent() {
    const [selectedOrder, setSelectedOrder] = useState<any>(null)
    // const { setTitle, setActions } = useAdminHeaderStore() // Removed
    const { orders } = useOrdersStore()
    const searchParams = useSearchParams()
    const router = useRouter()

    const [isReceiptOpen, setIsReceiptOpen] = useState(false)

    // Deep Linking Effect - Only for Receipt now or strictly view mode if we keep it
    useEffect(() => {
        const orderId = searchParams.get('orderId')
        if (orderId && !isReceiptOpen) {
            const order = orders.find(o => o.id === orderId)
            if (order) {
                setSelectedOrder(order)
                setIsReceiptOpen(true)
            }
        }
    }, [searchParams, orders])

    const handleCreate = () => {
        router.push('/orders/new')
    }

    const handleView = (order: any) => {
        // Can either open receipt modal or go to edit page. 
        // User requested "same format as Budget", Budget usually has an edit page.
        // Let's decide: Clicking "View Details" -> Edit Page? Or Receipt?
        // Budget uses "View Details" -> Edit Page usually.
        // But we have an explicit "Ver detalles" action. 
        // Let's make "Ver detalles" go to the receipt (as it seems to be a read-only view) 
        // AND create a way to edit.
        // WAIT: The prompt says "no hagamos la neva compra como un modal, sino como una pagina".
        // It implies the "Edit" flow should also be a page.
        // So let's make handleView go to the page?
        // Or keep handleView as receipt and let the table have an edit action?
        // Let's make handleView navigate to the edit page for now as default interaction for "row click" or "view".
        router.push(`/orders/${order.id}`)
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Compras</h1>
            <OrderTable
                onCreate={handleCreate}
                onView={handleView}
            />

            {/* Receipt Modal */}
            <OrderReceipt
                isOpen={isReceiptOpen}
                onClose={() => setIsReceiptOpen(false)}
                order={selectedOrder}
                onEdit={() => {
                    setIsReceiptOpen(false)
                    if (selectedOrder) {
                        router.push(`/orders/${selectedOrder.id}`)
                    }
                }}
            />
        </div>
    )
}

export default function OrdersPage() {
    return (
        <Suspense fallback={<div className="p-6">Cargando...</div>}>
            <OrdersPageContent />
        </Suspense>
    )
}
