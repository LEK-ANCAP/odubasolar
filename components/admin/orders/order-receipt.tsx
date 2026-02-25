"use client"

import { Order, useOrdersStore } from "@/hooks/use-orders-store"
import { useSettingsStore } from "@/hooks/use-settings-store"
import { useProvidersStore } from "@/hooks/use-providers-store"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Printer, Edit, X, Download, PackageCheck, Wallet, CheckCircle2, DollarSign, Banknote, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useInventoryStore } from "@/hooks/use-inventory-store"
import { useRef, useState } from "react"
import { useReactToPrint } from "react-to-print"
import { useAccountsStore } from "@/hooks/use-accounts-store"
import { useSettingsStore as useSettingsStoreBase } from "@/hooks/use-settings-store"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

// Returns the formatted short order ID, e.g. "OC-260220-001"
function formatOrderId(orderId: string, orderDate: string, allOrders: { id: string; date: string }[]): string {
    const dateStr = new Date(orderDate)
        .toLocaleDateString('en-GB', { year: '2-digit', month: '2-digit', day: '2-digit' })
        .split('/').reverse().join('')
    const dayKey = new Date(orderDate).toISOString().slice(0, 10)
    const sameDay = allOrders
        .filter(o => new Date(o.date).toISOString().slice(0, 10) === dayKey)
        .sort((a, b) => a.id.localeCompare(b.id))
    const idx = sameDay.findIndex(o => o.id === orderId)
    const seq = String(idx + 1).padStart(3, '0')
    return `OC-${dateStr}-${seq}`
}

interface OrderReceiptProps {
    isOpen: boolean
    onClose: () => void
    order: Order | null
    onEdit: () => void
    onReceive?: () => Promise<void>
    onRegisterPayment?: (accountId: string, amount: number) => Promise<void>
}

export function OrderReceipt({ isOpen, onClose, order, onEdit, onReceive, onRegisterPayment }: OrderReceiptProps) {
    const { companyName, companyEmail, companyPhone, companyAddress, companyLogo, usdRate } = useSettingsStoreBase()
    const { providers } = useProvidersStore()
    const { products } = useInventoryStore()
    const { accounts } = useAccountsStore()
    const { orders: allOrders } = useOrdersStore()

    // Payment panel state
    const [showPayment, setShowPayment] = useState(false)
    const [selectedAccountId, setSelectedAccountId] = useState('')
    const [paymentAmount, setPaymentAmount] = useState('')
    const [isReceiving, setIsReceiving] = useState(false)
    const [isPaying, setIsPaying] = useState(false)

    // For printing
    const contentRef = useRef<HTMLDivElement>(null)
    const handlePrint = useReactToPrint({
        contentRef: contentRef,
        documentTitle: `Pedido-${order?.id || 'Detalle'}`,
    })

    if (!order) return null

    const provider = providers.find(p => p.id === order.supplier)
    const currency = 'USD' // Base currency for calculations shown here, or update based on order preference if added later

    // Calculate totals
    const totalAmount = order.totalAmount

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl p-0 gap-0 bg-slate-50 overflow-hidden h-[90vh] flex flex-col [&>button]:hidden">
                <DialogTitle className="sr-only">Detalles del Pedido</DialogTitle>

                {/* ─── Top Action Bar ─── */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white shrink-0 shadow-sm">
                    {/* Left actions */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePrint && handlePrint()}
                            className="h-8 gap-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium text-xs"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Imprimir</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium text-xs"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">PDF</span>
                        </Button>

                        <Separator orientation="vertical" className="h-5 mx-1" />

                        {/* Receive order */}
                        {onReceive && order?.status !== 'received' && (
                            <Button
                                size="sm"
                                disabled={isReceiving}
                                onClick={async () => {
                                    setIsReceiving(true)
                                    await onReceive()
                                    setIsReceiving(false)
                                }}
                                className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm shadow-emerald-200 transition-all"
                            >
                                {isReceiving
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <PackageCheck className="w-3.5 h-3.5" />}
                                <span className="hidden sm:inline">{isReceiving ? 'Recibiendo…' : 'Recibir Pedido'}</span>
                            </Button>
                        )}

                        {/* Register payment toggle */}
                        {onRegisterPayment && order?.paymentStatus !== 'paid' && (
                            <Button
                                size="sm"
                                onClick={() => {
                                    const opening = !showPayment
                                    setShowPayment(opening)
                                    if (opening) {
                                        // Pre-fill with order total in USD by default
                                        setPaymentAmount(totalAmount.toFixed(2))
                                    }
                                }}
                                className={cn(
                                    "h-8 gap-1.5 font-semibold text-xs transition-all shadow-sm",
                                    showPayment
                                        ? "bg-violet-600 hover:bg-violet-700 text-white shadow-violet-200"
                                        : "bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200"
                                )}
                            >
                                <Wallet className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{showPayment ? 'Cancelar Pago' : 'Registrar Pago'}</span>
                            </Button>
                        )}

                        {/* Paid badge */}
                        {order?.paymentStatus === 'paid' && (
                            <Badge className="h-7 gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium text-xs">
                                <CheckCircle2 className="w-3 h-3" /> Pagado
                            </Badge>
                        )}
                    </div>

                    {/* Right actions */}
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onEdit}
                            className="h-8 gap-1.5 text-slate-500 hover:text-slate-900 font-medium text-xs"
                        >
                            <Edit className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Editar</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* ─── Payment Panel (animated slide-in) ─── */}
                <AnimatePresence>
                    {showPayment && onRegisterPayment && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            className="overflow-hidden shrink-0"
                        >
                            <div className="bg-gradient-to-r from-violet-50 via-purple-50 to-fuchsia-50 border-b border-violet-100 px-4 py-4">
                                <p className="text-xs font-bold uppercase tracking-wider text-violet-600 mb-3 flex items-center gap-2">
                                    <Wallet className="w-3.5 h-3.5" /> Registrar Pago
                                </p>
                                <div className="flex items-center gap-3 flex-wrap">
                                    {/* Account selector */}
                                    <Select
                                        value={selectedAccountId}
                                        onValueChange={(id) => {
                                            const prevCurrency = accounts.find(a => a.id === selectedAccountId)?.currency
                                            const newCurrency = accounts.find(a => a.id === id)?.currency
                                            setSelectedAccountId(id)
                                            // Auto-convert the amount when switching currency
                                            if (paymentAmount && prevCurrency !== newCurrency) {
                                                const val = parseFloat(paymentAmount) || 0
                                                if (newCurrency === 'CUP' && prevCurrency === 'USD') {
                                                    setPaymentAmount((val * usdRate).toFixed(0))
                                                } else if (newCurrency === 'USD' && prevCurrency === 'CUP') {
                                                    setPaymentAmount((val / usdRate).toFixed(2))
                                                }
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="h-9 w-56 bg-white border-violet-200 text-sm focus:ring-violet-400 focus:ring-1 shadow-sm">
                                            <SelectValue placeholder="Seleccionar cuenta…" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {accounts.map(a => (
                                                <SelectItem key={a.id} value={a.id} className="text-sm">
                                                    <span className="flex items-center gap-2">
                                                        {a.currency === 'USD'
                                                            ? <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                                                            : <Banknote className="w-3.5 h-3.5 text-blue-600" />}
                                                        {a.name}
                                                        <span className="text-xs text-slate-400">({a.currency})</span>
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    {/* Amount input */}
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm pointer-events-none">
                                            {accounts.find(a => a.id === selectedAccountId)?.currency === 'CUP' ? '₱' : '$'}
                                        </span>
                                        <Input
                                            type="number"
                                            placeholder="0.00"
                                            value={paymentAmount}
                                            onChange={e => setPaymentAmount(e.target.value)}
                                            className="h-9 w-32 pl-7 bg-white border-violet-200 text-sm focus-visible:ring-violet-400 focus-visible:ring-1 shadow-sm"
                                        />
                                    </div>

                                    {/* Confirm button */}
                                    <Button
                                        disabled={!selectedAccountId || !paymentAmount || isPaying}
                                        onClick={async () => {
                                            setIsPaying(true)
                                            await onRegisterPayment(selectedAccountId, parseFloat(paymentAmount))
                                            setShowPayment(false)
                                            setIsPaying(false)
                                        }}
                                        className="h-9 gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm shadow-sm shadow-violet-200 transition-all"
                                    >
                                        {isPaying
                                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            : <CheckCircle2 className="w-3.5 h-3.5" />}
                                        {isPaying ? 'Guardando…' : 'Confirmar Pago'}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

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
                                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">PEDIDO DE COMPRA</h1>
                                <p className="text-slate-400 font-medium">{order ? formatOrderId(order.id, order.date, allOrders) : ''}</p>
                                <div className="pt-2">
                                    <Badge variant="outline" className={
                                        order.status === 'received' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                            order.status === 'ordered' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                "bg-slate-100 text-slate-600 border-slate-200"
                                    }>
                                        {order.status === 'received' ? 'RECIBIDO' : order.status === 'ordered' ? 'ENVIADO' : 'BORRADOR'}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-2 gap-12 mb-12 border-t border-b border-slate-100 py-8">
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Proveedor</h3>
                                <div className="space-y-1 text-sm">
                                    <p className="font-bold text-slate-900">{provider?.name || order.supplier}</p>
                                    <p className="text-slate-600">{provider?.email}</p>
                                    <p className="text-slate-600">{provider?.phone}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Fecha de Emisión</h3>
                                    <p className="text-sm font-medium text-slate-900">
                                        {format(new Date(order.date), "dd MMMM, yyyy", { locale: es })}
                                    </p>
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Fecha de Pago</h3>
                                    <p className="text-sm font-medium text-slate-900">
                                        {order.paymentDate ? format(new Date(order.paymentDate), "dd MMM, yyyy", { locale: es }) : '-'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="mb-0 flex-1">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200">
                                        <th className="text-left font-bold text-slate-900 pb-4 pl-4">Descripción</th>
                                        <th className="text-right font-bold text-slate-900 pb-4 w-24">Cant.</th>
                                        <th className="text-right font-bold text-slate-900 pb-4 w-32">Precio Unit.</th>
                                        <th className="text-right font-bold text-slate-900 pb-4 w-32 pr-4">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {order.items.map((item, itemIdx) => {
                                        const product = products.find(p => p.id === item.productId)
                                        return (
                                            <tr key={item.productId || `item-${itemIdx}`} className="group">
                                                <td className="py-4 pl-4">
                                                    <p className="font-medium text-slate-900">{product?.name || item.productId}</p>
                                                    <p className="text-xs text-slate-500">{product?.description || 'Sin descripción'}</p>
                                                </td>
                                                <td className="py-4 text-right text-slate-600">{item.quantity}</td>
                                                <td className="py-4 text-right text-slate-600">${item.unitCost.toFixed(2)}</td>
                                                <td className="py-4 text-right font-medium text-slate-900 pr-4">${(item.quantity * item.unitCost).toFixed(2)}</td>
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
                                        <span className="font-medium text-slate-900">${totalAmount.toFixed(2)}</span>
                                    </div>
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
                        {(order.notes || companyAddress) && (
                            <div className="mt-16 pt-8 border-t border-slate-100 text-xs text-slate-500">
                                {order.notes && (
                                    <div className="mb-4">
                                        <h4 className="font-bold text-slate-900 mb-1">Notas:</h4>
                                        <p>{order.notes}</p>
                                    </div>
                                )}
                                <div className="flex justify-between items-end mt-8">
                                    <div>
                                        <p className="font-medium text-slate-900">{companyName}</p>
                                        <p>Gracias por su preferencia.</p>
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
        </Dialog>
    )
}
