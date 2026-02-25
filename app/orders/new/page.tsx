"use client"

import { Suspense } from "react"
import { OrderForm } from "@/components/admin/orders/order-form"
import { Loader2 } from "lucide-react"

export default function NewOrderPage() {
    return (
        <div className="max-w-6xl mx-auto py-6">
            <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>}>
                <OrderForm />
            </Suspense>
        </div>
    )
}
