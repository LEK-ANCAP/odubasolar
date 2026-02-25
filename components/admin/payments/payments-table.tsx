"use client"

import { useState, useEffect } from "react"
import { useInvoicesStore } from "@/hooks/use-invoices-store"
import { useAccountsStore } from "@/hooks/use-accounts-store"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { format } from "date-fns"
import { Search, FileText, ArrowUpDown, ChevronLeft, ChevronRight, X, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

type SortConfig = {
    key: "date" | "amount" | "customerName" | "invoiceId" | null
    direction: "asc" | "desc"
}

export function PaymentsTable() {
    const { invoices } = useInvoicesStore()
    const { accounts } = useAccountsStore()
    const router = useRouter()

    const [searchTerm, setSearchTerm] = useState("")
    const [methodFilter, setMethodFilter] = useState<string>("all")
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(25)
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "date", direction: "desc" })

    // Flatten payments
    const allPayments = invoices.flatMap(invoice =>
        (invoice.payments || []).map(payment => ({
            ...payment,
            invoiceId: invoice.id,
            customerName: invoice.customerName,
            currency: invoice.currency,
            invoiceTotal: invoice.total
        }))
    )

    const normalizeText = (text: string) => {
        return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    };

    const searchNormalized = normalizeText(searchTerm);

    // Filter payments
    const filteredPayments = allPayments.filter(payment => {
        const matchesSearch =
            normalizeText(payment.invoiceId).includes(searchNormalized) ||
            normalizeText(payment.customerName).includes(searchNormalized) ||
            (payment.notes && normalizeText(payment.notes).includes(searchNormalized))

        const matchesMethod = methodFilter === "all" || payment.method === methodFilter

        return matchesSearch && matchesMethod
    })

    // Sort payments
    const sortedPayments = [...filteredPayments].sort((a, b) => {
        if (!sortConfig.key) return 0

        let comparison = 0
        switch (sortConfig.key) {
            case "date":
                comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
                break
            case "amount":
                comparison = a.amount - b.amount
                break
            case "customerName":
                comparison = a.customerName.localeCompare(b.customerName)
                break
            case "invoiceId":
                comparison = a.invoiceId.localeCompare(b.invoiceId)
                break
        }

        return sortConfig.direction === "asc" ? comparison : -comparison
    })

    // Pagination
    const totalPages = Math.ceil(sortedPayments.length / itemsPerPage)
    const paginatedPayments = sortedPayments.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    const handleSort = (key: SortConfig['key']) => {
        setSortConfig((current) => ({
            key,
            direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
        }))
    }

    const handleNewPayment = () => {
        toast.info("Selecciona una factura para añadir un pago.")
        router.push("/invoices")
    }

    const getAccountName = (accountId: string) => {
        const account = accounts.find(a => a.id === accountId)
        return account ? account.name : "Cuenta deconocida"
    }

    const getMethodLabel = (method: string) => {
        switch (method) {
            case 'cash': return 'Efectivo'
            case 'transfer': return 'Transferencia'
            case 'card': return 'Tarjeta'
            case 'other': return 'Otro'
            default: return method
        }
    }

    if (allPayments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <FileText className="h-12 w-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900">No hay pagos registrados</h3>
                <p className="text-slate-500 mb-6 text-sm">Los pagos se registran desde las facturas.</p>
                <Button onClick={() => router.push('/invoices')} variant="outline">
                    Ir a Facturas
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative w-full flex-1 md:flex-none md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Buscar pago..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-8 h-9 bg-white border-slate-200 rounded-lg focus-visible:ring-slate-900 focus-visible:ring-1 focus-visible:border-slate-900 transition-all font-medium text-slate-600 placeholder:text-slate-400 text-xs shadow-sm"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => {
                                    setSearchTerm("")
                                    setCurrentPage(1)
                                }}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 px-2 py-1 rounded-md transition-colors"
                            >
                                Borrar
                            </button>
                        )}
                    </div>
                    <Select value={methodFilter} onValueChange={setMethodFilter}>
                        <SelectTrigger className="w-[120px] h-9 text-xs bg-white border-slate-200 shadow-sm shrink-0">
                            <SelectValue placeholder="Método" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="cash">Efectivo</SelectItem>
                            <SelectItem value="transfer">Transferencia</SelectItem>
                            <SelectItem value="card">Tarjeta</SelectItem>
                            <SelectItem value="other">Otro</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Actions & Pagination */}
                <div className="flex flex-wrap gap-2 w-full md:w-auto items-center justify-end">
                    <div className="flex items-center gap-2 mr-0 sm:mr-4">
                        <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap hidden sm:inline-block uppercase tracking-wider">
                            Filas
                        </span>
                        <Select
                            value={itemsPerPage.toString()}
                            onValueChange={(val) => {
                                setItemsPerPage(Number(val))
                                setCurrentPage(1)
                            }}
                        >
                            <SelectTrigger className="h-8 w-[70px] text-xs bg-white border-slate-200 shadow-sm shrink-0">
                                <SelectValue placeholder="25" />
                            </SelectTrigger>
                            <SelectContent align="end">
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2 ml-2 bg-slate-50 p-1 rounded-lg border border-slate-100">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-md"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
                        </Button>
                        <span className="text-xs font-medium text-slate-600 min-w-[3rem] text-center shrink-0">
                            {currentPage} de {totalPages || 1}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-md shrink-0"
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                        >
                            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                        </Button>
                    </div>

                    <div className="flex gap-2 items-center">
                        <Button
                            onClick={handleNewPayment}
                            className="hidden md:flex h-8 rounded-lg bg-slate-900 text-white hover:bg-slate-800 shadow-sm font-medium px-3 text-xs ml-2"
                        >
                            <Plus className="w-3.5 h-3.5 mr-2 shrink-0" />
                            Nuevo Pago
                        </Button>
                    </div>
                </div>
            </div>

            {/* Desktop View */}
            <div className="hidden md:block rounded-md border border-slate-200 bg-white overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow>
                            <TableHead className="w-[120px]">
                                <Button variant="ghost" size="sm" onClick={() => handleSort("date")} className="-ml-3 h-8 text-xs font-medium text-slate-500 hover:text-slate-700">
                                    Fecha
                                    <ArrowUpDown className="ml-2 h-3 w-3" />
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button variant="ghost" size="sm" onClick={() => handleSort("invoiceId")} className="-ml-3 h-8 text-xs font-medium text-slate-500 hover:text-slate-700">
                                    Factura
                                    <ArrowUpDown className="ml-2 h-3 w-3" />
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button variant="ghost" size="sm" onClick={() => handleSort("customerName")} className="-ml-3 h-8 text-xs font-medium text-slate-500 hover:text-slate-700">
                                    Cliente
                                    <ArrowUpDown className="ml-2 h-3 w-3" />
                                </Button>
                            </TableHead>
                            <TableHead className="text-xs font-medium text-slate-500">Método</TableHead>
                            <TableHead className="text-xs font-medium text-slate-500">Cuenta</TableHead>
                            <TableHead className="text-xs font-medium text-slate-500">Notas</TableHead>
                            <TableHead className="text-right">
                                <Button variant="ghost" size="sm" onClick={() => handleSort("amount")} className="-mr-3 h-8 text-xs font-medium text-slate-500 hover:text-slate-700">
                                    Monto
                                    <ArrowUpDown className="ml-2 h-3 w-3" />
                                </Button>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedPayments.map((payment) => (
                            <TableRow key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                                <TableCell className="font-medium text-slate-700 text-xs">
                                    {format(new Date(payment.date), "dd/MM/yyyy")}
                                </TableCell>
                                <TableCell>
                                    <span
                                        className="text-xs font-medium text-blue-600 hover:underline cursor-pointer"
                                        onClick={() => router.push(`/invoices/${payment.invoiceId}`)}
                                    >
                                        {payment.invoiceId}
                                    </span>
                                </TableCell>
                                <TableCell className="text-xs text-slate-600">{payment.customerName}</TableCell>
                                <TableCell className="text-xs text-slate-600 capitalize">{getMethodLabel(payment.method)}</TableCell>
                                <TableCell className="text-xs text-slate-500">{getAccountName(payment.accountId)}</TableCell>
                                <TableCell className="text-xs text-slate-500 max-w-[200px] truncate" title={payment.notes}>
                                    {payment.notes || "-"}
                                </TableCell>
                                <TableCell className="text-right font-medium text-slate-900 text-sm">
                                    {payment.currency === 'USD' ? '$' : 'CUP'} {payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden space-y-4">
                {paginatedPayments.map((payment) => (
                    <div
                        key={payment.id}
                        className="bg-white border rounded-xl p-4 shadow-sm relative active:bg-slate-50 transition-colors cursor-pointer block"
                        onClick={() => router.push(`/invoices/${payment.invoiceId}`)}
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div className="pr-10">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 px-2 flex items-center h-5 rounded-md border border-slate-200 shadow-sm">
                                        {format(new Date(payment.date), "dd/MM/yyyy")}
                                    </span>
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold border border-blue-200 bg-blue-50 text-blue-700">
                                        {payment.invoiceId}
                                    </span>
                                </div>
                                <h3 className="font-bold text-slate-900 text-sm leading-tight mt-1.5 line-clamp-1">
                                    {payment.customerName}
                                </h3>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                            <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                                <span className="text-slate-400 block mb-0.5 text-[10px] uppercase font-semibold">Método</span>
                                <span className="font-medium text-slate-700 capitalize">
                                    {getMethodLabel(payment.method)}
                                </span>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                                <span className="text-slate-400 block mb-0.5 text-[10px] uppercase font-semibold">Cuenta</span>
                                <span className="font-medium text-slate-700">
                                    {getAccountName(payment.accountId)}
                                </span>
                            </div>
                        </div>

                        {payment.notes && (
                            <div className="mb-3 text-xs text-slate-600 bg-amber-50 rounded-lg p-2 border border-amber-100">
                                <span className="font-medium text-amber-800 block mb-0.5">Notas:</span>
                                {payment.notes}
                            </div>
                        )}

                        <div className="pt-3 border-t flex justify-between items-center text-sm">
                            <span className="text-slate-500 font-medium">Monto</span>
                            <div className="font-bold text-slate-900 text-base">
                                {payment.currency === 'USD' ? '$' : 'CUP'} {payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Mobile FAB */}
            <div className="md:hidden fixed bottom-6 right-6 z-40">
                <Button
                    onClick={handleNewPayment}
                    className="h-14 w-14 rounded-full bg-slate-900 text-white shadow-lg hover:bg-slate-800 flex items-center justify-center p-0"
                >
                    <Plus className="h-6 w-6" />
                </Button>
            </div>
        </div>
    )
}
