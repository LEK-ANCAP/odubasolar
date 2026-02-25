"use client"

import { Quote } from "@/hooks/use-quotes-store"
import { useSettingsStore } from "@/hooks/use-settings-store"
import { useCustomersStore } from "@/hooks/use-customers-store"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Printer, Edit, X, Download, Share2, Receipt } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useInventoryStore } from "@/hooks/use-inventory-store"
import { useRef } from "react"
import { useReactToPrint } from "react-to-print"

interface QuoteReceiptProps {
    isOpen: boolean
    onClose: () => void
    quote: Quote | null
    onEdit: () => void
}

export function QuoteReceipt({ isOpen, onClose, quote, onEdit }: QuoteReceiptProps) {
    const { companyName, companyEmail, companyPhone, companyAddress, companyLogo, usdRate } = useSettingsStore()
    const { customers } = useCustomersStore()
    const { products } = useInventoryStore()

    // For printing
    const contentRef = useRef<HTMLDivElement>(null)
    const handlePrint = useReactToPrint({
        contentRef: contentRef,
        documentTitle: `Presupuesto-${quote?.id || 'Detalle'}`,
    })

    if (!quote) return null

    const customer = customers.find(c => c.id === quote.customerId)
    const currency = 'USD' // Base currency

    // Calculate totals
    const subtotal = quote.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0)

    let discountAmount = 0
    if (quote.discountType === 'percentage') {
        discountAmount = subtotal * ((quote.discountValue || 0) / 100)
    } else if (quote.discountType === 'fixed_total') {
        // If fixed total, discount is subtotal - fixed_total
        // Ensure we don't have negative discount if fixed total > subtotal (though logically weird)
        discountAmount = Math.max(0, subtotal - (quote.discountValue || 0))
    } else {
        discountAmount = quote.discountValue || 0
    }

    const totalAmount = Math.max(0, subtotal - discountAmount)


    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl p-0 gap-0 bg-slate-50/50 overflow-hidden h-[90vh] flex flex-col [&>button]:hidden">
                <DialogTitle className="sr-only">Detalles del Presupuesto</DialogTitle>
                {/* Header Actions */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white shrink-0">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handlePrint && handlePrint()} className="h-8 gap-2">
                            <Printer className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Imprimir</span>
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 gap-2">
                            <Download className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Descargar PDF</span>
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 gap-2 text-slate-600 hover:text-slate-900">
                            <Edit className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Editar Presupuesto</span>
                        </Button>
                        <Separator orientation="vertical" className="h-4" />
                        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Scrollable Receipt Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-8">
                    <div
                        ref={contentRef}
                        className="bg-white shadow-sm border border-slate-200 rounded-xl max-w-[210mm] mx-auto min-h-[297mm] p-8 md:p-12 relative flex flex-col"
                    >
                        {/* Receipt Header */}
                        <div className="flex justify-between items-start mb-12">
                            <div className="space-y-4">
                                {companyLogo ? (
                                    <img src={companyLogo} alt={companyName} className="h-16 w-auto object-contain" />
                                ) : (
                                    <div className="h-16 w-16 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-2xl">
                                        {companyName.charAt(0)}
                                    </div>
                                )}
                                <div className="text-sm text-slate-500 space-y-1">
                                    <p className="font-bold text-slate-900 text-lg">{companyName}</p>
                                    <p>{companyAddress}</p>
                                    <p>{companyPhone}</p>
                                    <p>{companyEmail}</p>
                                </div>
                            </div>
                            <div className="text-right space-y-2">
                                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">PRESUPUESTO</h1>
                                <p className="text-slate-400 font-medium">#{quote.id}</p>
                                {quote.name && <p className="text-lg font-bold text-slate-800">{quote.name}</p>}
                                <div className="pt-2">
                                    <Badge variant="outline" className={
                                        quote.status === 'accepted' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                            quote.status === 'sent' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                quote.status === 'rejected' ? "bg-rose-50 text-rose-700 border-rose-200" :
                                                    "bg-slate-100 text-slate-600 border-slate-200"
                                    }>
                                        {quote.status === 'accepted' ? 'ACEPTADO' : quote.status === 'sent' ? 'ENVIADO' : quote.status === 'rejected' ? 'RECHAZADO' : 'BORRADOR'}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-2 gap-12 mb-12 border-t border-b border-slate-100 py-8">
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Cliente</h3>
                                <div className="space-y-1 text-sm">
                                    <p className="font-bold text-slate-900">{customer?.name || "Cliente General"}</p>
                                    <p className="text-slate-600">{customer?.email}</p>
                                    <p className="text-slate-600">{customer?.phone}</p>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Fecha de Emisión</h3>
                                <p className="text-sm font-medium text-slate-900">
                                    {format(new Date(quote.date), "dd MMMM, yyyy", { locale: es })}
                                </p>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="mb-0 flex-1">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200">
                                        <th className="text-left font-bold text-slate-900 pb-2 pl-4">Producto</th>
                                        <th className="text-right font-bold text-slate-900 pb-2 w-24">Cant.</th>
                                        <th className="text-right font-bold text-slate-900 pb-2 w-32">Precio Unit.</th>
                                        <th className="text-right font-bold text-slate-900 pb-2 w-32 pr-4">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {quote.items.map((item, index) => {
                                        const product = products.find(p => p.id === item.productId)
                                        return (
                                            <tr key={item.productId || `item-${index}`} className="group">
                                                <td className="py-1 pl-4">
                                                    <p className="font-medium text-slate-900 text-sm">{product?.name || item.productId}</p>
                                                    <p className="text-[10px] text-slate-500">{product?.description || 'Sin descripción'}</p>
                                                </td>
                                                <td className="py-1 text-right text-slate-600">{item.quantity}</td>
                                                <td className="py-1 text-right text-slate-600">${item.unitPrice.toFixed(2)}</td>
                                                <td className="py-1 text-right font-medium text-slate-900 pr-4">${(item.quantity * item.unitPrice).toFixed(2)}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer Totals */}
                        <div className="border-t border-slate-200 pt-8 mt-8">
                            <div className="flex justify-end">
                                <div className="w-64 space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Subtotal</span>
                                        <span className="font-medium text-slate-900">${subtotal.toFixed(2)}</span>
                                    </div>

                                    {discountAmount > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-emerald-600 font-medium">Descuento {quote.discountType === 'percentage' ? `(${quote.discountValue}%)` : ''}</span>
                                            <span className="font-medium text-emerald-600">-${discountAmount.toFixed(2)}</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Impuestos (0%)</span>
                                        <span className="font-medium text-slate-900">$0.00</span>
                                    </div>
                                    <Separator className="my-2" />
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-base font-bold text-slate-900">Total</span>
                                        <span className="text-2xl font-bold text-slate-900">${totalAmount.toFixed(2)}</span>
                                    </div>
                                    <p className="text-xs text-right text-slate-400 mt-1">
                                        ~ {(totalAmount * usdRate).toLocaleString('es-CU', { style: 'currency', currency: 'CUP' })}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Notes & Terms */}
                        {(quote.notes || companyAddress) && (
                            <div className="mt-16 pt-8 border-t border-slate-100 text-xs text-slate-500">
                                {quote.notes && (
                                    <div className="mb-4">
                                        <h4 className="font-bold text-slate-900 mb-1">Notas:</h4>
                                        <p>{quote.notes}</p>
                                    </div>
                                )}
                                <div className="flex justify-between items-end mt-8">
                                    <div>
                                        <p className="font-medium text-slate-900">{companyName}</p>
                                        <p>Gracias por considerar nuestra propuesta.</p>
                                    </div>
                                    <div className="h-px w-48 bg-slate-300 mt-8 relative">
                                        <span className="absolute top-2 left-0 w-full text-center text-[10px] uppercase tracking-wider">Firma Autorizada</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog >
    )
}
