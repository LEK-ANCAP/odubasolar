"use client"

import { useEffect, useState, Suspense } from "react"
import { useParams } from "next/navigation"
import { InvoiceForm } from "@/components/admin/invoices/invoice-form"
import { useInvoicesStore, Invoice } from "@/hooks/use-invoices-store"
import { Loader2 } from "lucide-react"

export default function EditInvoicePage() {
    const params = useParams()
    const { invoices } = useInvoicesStore()
    const [invoice, setInvoice] = useState<Invoice | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (params.id) {
            const foundInvoice = invoices.find(inv => inv.id === params.id)
            setInvoice(foundInvoice || null)
            setIsLoading(false)
        }
    }, [params.id, invoices])

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        )
    }

    if (!invoice) {
        return (
            <div className="flex h-[50vh] items-center justify-center flex-col gap-2">
                <h2 className="text-xl font-semibold">Factura no encontrada</h2>
                <p className="text-slate-500">La factura que intentas editar no existe.</p>
            </div>
        )
    }

    return (
        <div className="max-w-5xl mx-auto py-6">
            <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>}>
                <InvoiceForm invoiceToEdit={invoice} isEditing={true} />
            </Suspense>
        </div>
    )
}
