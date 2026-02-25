"use client"

import { Suspense } from "react"
import { InvoiceForm } from "@/components/admin/invoices/invoice-form"
import { Loader2 } from "lucide-react"

export default function NewInvoicePage() {
    return (
        <div className="max-w-5xl mx-auto py-6">
            <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>}>
                <InvoiceForm />
            </Suspense>
        </div>
    )
}
