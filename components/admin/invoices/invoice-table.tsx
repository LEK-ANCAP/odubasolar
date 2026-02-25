"use client"

import { useState, useEffect } from "react"
import { useInvoicesStore, Invoice } from "@/hooks/use-invoices-store"
import {
    Edit,
    Trash2,
    Loader2,
    Search,
    ChevronLeft,
    ChevronRight,
    ArrowUp,
    ArrowDown,
    ArrowUpDown,
    Download,
    X,
    MoreHorizontal,
    Plus,
    FileText,
    Eye,
    DollarSign
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
// import { InvoiceModal } from "./invoice-modal" // Assume same folder
import { useRouter } from "next/navigation"

import { useSettingsStore } from "@/hooks/use-settings-store"
import { PaymentDialog } from "./payment-dialog"
import { InvoiceReceiptDialog } from "./invoice-receipt-dialog"

type SortConfig = {
    key: "id" | "customerName" | "total" | "date" | "status" | null
    direction: "asc" | "desc"
}

export function InvoiceTable() {
    const { invoices, deleteInvoice, generateTestData, clearInvoices } = useInvoicesStore()
    const { usdRate } = useSettingsStore()
    const router = useRouter()

    // Local state
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [selectedInvoices, setSelectedInvoices] = useState<string[]>([])
    const [currentPage, setCurrentPage] = useState(1)
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "date", direction: "desc" })
    const [itemsPerPage, setItemsPerPage] = useState(25)
    const [showConversion, setShowConversion] = useState(false)
    const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null)
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
    const [selectedInvoiceForReceipt, setSelectedInvoiceForReceipt] = useState<Invoice | null>(null)
    const [isReceiptOpen, setIsReceiptOpen] = useState(false)

    // Reset page on filter change
    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm, statusFilter])

    const handleDelete = (id: string) => {
        if (confirm("¿Estás seguro de eliminar esta factura?")) {
            deleteInvoice(id)
        }
    }

    const handleClearAll = () => {
        if (confirm("¿Estás seguro de eliminar TODAS las facturas? Esta acción no se puede deshacer.")) {
            clearInvoices()
        }
    }

    const handleSort = (key: SortConfig['key']) => {
        setSortConfig((current) => ({
            key,
            direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
        }))
    }

    const normalizeText = (text: string) => {
        return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    };

    const searchNormalized = normalizeText(searchTerm);

    const filteredInvoices = invoices.filter((invoice) => {
        const matchesSearch =
            normalizeText(invoice.id).includes(searchNormalized) ||
            normalizeText(invoice.customerName).includes(searchNormalized)

        const matchesStatus = statusFilter === "all" || invoice.status === statusFilter

        return matchesSearch && matchesStatus
    })

    const sortedInvoices = [...filteredInvoices].sort((a, b) => {
        if (!sortConfig.key) return 0

        let comparison = 0
        switch (sortConfig.key) {
            case "id":
                comparison = a.id.localeCompare(b.id)
                break
            case "customerName":
                comparison = a.customerName.localeCompare(b.customerName)
                break
            case "total":
                comparison = a.total - b.total
                break
            case "date":
                comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
                break
            case "status":
                comparison = a.status.localeCompare(b.status)
                break
        }

        return sortConfig.direction === "asc" ? comparison : -comparison
    })

    const totalPages = Math.ceil(sortedInvoices.length / itemsPerPage)
    const paginatedInvoices = sortedInvoices.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    // Selection
    const toggleSelectAll = () => {
        if (selectedInvoices.length === filteredInvoices.length) {
            setSelectedInvoices([])
        } else {
            setSelectedInvoices(filteredInvoices.map((i) => i.id))
        }
    }

    const toggleSelectInvoice = (id: string) => {
        if (selectedInvoices.includes(id)) {
            setSelectedInvoices(selectedInvoices.filter((iId) => iId !== id))
        } else {
            setSelectedInvoices([...selectedInvoices, id])
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "paid": return "bg-emerald-100 text-emerald-700 border-emerald-200"
            case "partial": return "bg-amber-100 text-amber-700 border-amber-200"
            case "pending": return "bg-slate-100 text-slate-700 border-slate-200"
            case "overdue": return "bg-rose-100 text-rose-700 border-rose-200"
            case "draft": return "bg-slate-50 text-slate-500 border-slate-200"
            case "cancelled": return "bg-slate-50 text-slate-500 border-slate-200 line-through"
            default: return "bg-slate-100 text-slate-700"
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "paid": return "Pagada"
            case "partial": return "Parcial"
            case "pending": return "Pendiente"
            case "overdue": return "Vencida"
            case "draft": return "Borrador"
            case "cancelled": return "Cancelada"
            default: return status
        }
    }

    const handleCreate = () => {
        router.push("/invoices/new")
    }

    const handleEdit = (invoice: Invoice) => {
        router.push(`/invoices/${invoice.id}`)
    }

    if (invoices.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <FileText className="h-12 w-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900">No hay facturas</h3>
                <p className="text-slate-500 mb-6 text-sm">Crea tu primera factura o genera datos de prueba.</p>
                <div className="flex gap-4">
                    <Button onClick={handleCreate} className="hidden md:flex bg-slate-900 text-white hover:bg-slate-800">
                        <Plus className="w-4 h-4 mr-2" />
                        Nueva Factura
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
                {/* Search & Filter */}
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Buscar factura o cliente..."
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
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[130px] h-9 text-xs bg-white border-slate-200">
                            <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="paid">Pagadas</SelectItem>
                            <SelectItem value="partial">Parcial</SelectItem>
                            <SelectItem value="pending">Pendientes</SelectItem>
                            <SelectItem value="overdue">Vencidas</SelectItem>
                            <SelectItem value="draft">Borrador</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 w-full md:w-auto items-center justify-end">

                    <div className="flex items-center space-x-2 mr-4 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-100">
                        <Checkbox
                            id="showConversion"
                            checked={showConversion}
                            onCheckedChange={(checked) => setShowConversion(checked as boolean)}
                            className="w-4 h-4 border-slate-300 data-[state=checked]:bg-slate-900 data-[state=checked]:border-slate-900"
                        />
                        <label
                            htmlFor="showConversion"
                            className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-600 cursor-pointer"
                        >
                            Mostrar conversión
                        </label>
                    </div>

                    {selectedInvoices.length > 0 && (
                        <Button
                            variant="destructive"
                            size="sm"
                            className="mr-2 h-8 text-xs font-medium"
                            onClick={() => {
                                if (confirm(`¿Estás seguro de que deseas eliminar ${selectedInvoices.length} facturas?`)) {
                                    selectedInvoices.forEach(id => deleteInvoice(id))
                                    setSelectedInvoices([])
                                }
                            }}
                        >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Eliminar ({selectedInvoices.length})
                        </Button>
                    )}
                    <div className="flex items-center gap-2 mr-4">
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
                            <SelectTrigger className="h-8 w-[70px] text-xs bg-white border-slate-200 shadow-sm">
                                <SelectValue placeholder="25" />
                            </SelectTrigger>
                            <SelectContent align="end">
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2 mr-2 bg-slate-50 p-1 rounded-lg border border-slate-100">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-md"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
                        </Button>
                        <span className="text-xs font-medium text-slate-600 min-w-[3rem] text-center">
                            {currentPage} de {totalPages || 1}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-md"
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                        >
                            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                        </Button>
                    </div>

                    <div className="flex gap-2 items-center">
                        <Button
                            variant="outline"
                            onClick={handleClearAll}
                            title="Eliminar Todo"
                            className="h-8 px-2 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                        >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            Limpiar
                        </Button>
                        <Button
                            onClick={handleCreate}
                            className="hidden md:flex h-8 rounded-lg bg-slate-900 text-white hover:bg-slate-800 shadow-sm font-medium px-3 text-xs ml-2"
                        >
                            <Plus className="w-3.5 h-3.5 mr-2" />
                            Nueva Factura
                        </Button>
                    </div>
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse border border-slate-100 rounded-lg overflow-hidden">
                    <thead className="text-xs font-medium text-slate-500 border-b border-slate-100 bg-slate-50/50">
                        <tr>
                            <th className="pl-4 w-10 py-3">
                                <Checkbox
                                    checked={selectedInvoices.length === filteredInvoices.length && filteredInvoices.length > 0}
                                    onCheckedChange={toggleSelectAll}
                                    className="border-slate-300 data-[state=checked]:bg-slate-900"
                                />
                            </th>
                            <th className="px-4 py-3">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSort("id")}
                                    className="-ml-3 h-8 hover:bg-slate-100 text-slate-500 font-medium text-xs gap-2 normal-case"
                                >
                                    Factura #
                                    <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                                </Button>
                            </th>
                            <th className="px-4 py-3">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSort("customerName")}
                                    className="-ml-3 h-8 hover:bg-slate-100 text-slate-500 font-medium text-xs gap-2 normal-case"
                                >
                                    Cliente
                                    <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                                </Button>
                            </th>
                            <th className="px-4 py-3">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSort("date")}
                                    className="-ml-3 h-8 hover:bg-slate-100 text-slate-500 font-medium text-xs gap-2 normal-case"
                                >
                                    Fecha
                                    <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                                </Button>
                            </th>
                            <th className="px-4 py-3 text-center">Moneda</th>
                            <th className="px-4 py-3 text-center">Estado</th>
                            <th className="px-4 py-3 text-right">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSort("total")}
                                    className="-mr-3 h-8 hover:bg-slate-100 text-slate-500 font-medium text-xs gap-2 normal-case"
                                >
                                    Total
                                    <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                                </Button>
                            </th>
                            <th className="px-4 py-3 text-right">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 bg-white">
                        {paginatedInvoices.map((invoice, index) => {
                            const isSelected = selectedInvoices.includes(invoice.id)
                            const totalInUSD = invoice.currency === 'USD'
                                ? invoice.total
                                : invoice.total / (usdRate || 1)
                            const totalInCUP = invoice.currency === 'CUP'
                                ? invoice.total
                                : invoice.total * (usdRate || 1)

                            return (
                                <tr
                                    key={invoice.id}
                                    className={cn(
                                        "hover:bg-slate-50 transition-colors group cursor-pointer",
                                        isSelected && "bg-slate-50"
                                    )}
                                    onClick={() => handleEdit(invoice)}
                                >
                                    <td className="pl-4 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() => toggleSelectInvoice(invoice.id)}
                                            className="border-slate-300 data-[state=checked]:bg-slate-900"
                                        />
                                    </td>
                                    <td className="px-4 py-3 align-middle font-medium text-slate-900 text-sm">
                                        {invoice.id}
                                    </td>
                                    <td className="px-4 py-3 align-middle text-sm text-slate-700">
                                        {invoice.customerName}
                                    </td>
                                    <td className="px-4 py-3 align-middle text-xs text-slate-500">
                                        {new Date(invoice.date).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3 align-middle text-center">
                                        <span className={cn(
                                            "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border",
                                            invoice.currency === 'USD'
                                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                                : "bg-orange-50 text-orange-700 border-orange-200"
                                        )}>
                                            {invoice.currency}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 align-middle text-center">
                                        <span className={cn(
                                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
                                            getStatusColor(invoice.status)
                                        )}>
                                            {getStatusLabel(invoice.status)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 align-middle text-right font-medium text-slate-900 text-sm">
                                        <div className="flex flex-col items-end w-full">
                                            <span>
                                                ${totalInUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>

                                            {/* Progress Bar */}
                                            <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden relative group/progress">
                                                <div
                                                    className={cn(
                                                        "h-full rounded-full transition-all duration-500",
                                                        invoice.status === 'paid' ? "bg-emerald-500" :
                                                            invoice.status === 'partial' ? "bg-amber-500" :
                                                                invoice.status === 'overdue' ? "bg-rose-500" : "bg-slate-300"
                                                    )}
                                                    style={{ width: `${invoice.status === 'paid' ? 100 : Math.min(100, Math.max(0, (invoice.payments?.reduce((sum, p) => sum + p.amount, 0) || 0) / invoice.total * 100))}%` }}

                                                />
                                                {/* Tooltip on hover */}
                                                <div className="absolute bottom-full right-0 mb-1 hidden group-hover/progress:block bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                                                    Pagado: {(invoice.payments?.reduce((sum, p) => sum + p.amount, 0) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </div>
                                            </div>

                                            {showConversion && (
                                                <span className="text-[10px] text-slate-500 font-normal mt-0.5">
                                                    {totalInCUP.toLocaleString('es-ES', {
                                                        style: 'currency',
                                                        currency: 'CUP',
                                                        minimumFractionDigits: 2
                                                    })}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 align-middle text-right">
                                        <div
                                            className="flex justify-end gap-1"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                                                onClick={() => handleEdit(invoice)}
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                                                    >
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleEdit(invoice)}>
                                                        <Edit className="mr-2 h-4 w-4" /> Editar
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            setSelectedInvoiceForReceipt(invoice)
                                                            setIsReceiptOpen(true)
                                                        }}
                                                    >
                                                        <Eye className="mr-2 h-4 w-4" /> Ver Recibo
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            setSelectedInvoiceForPayment(invoice)
                                                            setIsPaymentDialogOpen(true)
                                                        }}
                                                        disabled={invoice.status === 'paid' || invoice.status === 'cancelled'}
                                                    >
                                                        <DollarSign className="mr-2 h-4 w-4" /> Registrar Pago
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => handleDelete(invoice.id)}
                                                        className="text-red-600 focus:text-red-700 focus:bg-red-50"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden space-y-4">
                {paginatedInvoices.map((invoice) => {
                    const totalInUSD = invoice.currency === 'USD'
                        ? invoice.total
                        : invoice.total / (usdRate || 1)
                    const totalInCUP = invoice.currency === 'CUP'
                        ? invoice.total
                        : invoice.total * (usdRate || 1)

                    return (
                        <div
                            key={invoice.id}
                            className="bg-white border rounded-xl p-4 shadow-sm relative active:bg-slate-50 transition-colors cursor-pointer"
                            onClick={() => handleEdit(invoice)}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="pr-10">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 px-2 flex items-center h-5 rounded-md border border-slate-200 shadow-sm">
                                            {invoice.id}
                                        </span>
                                        <span className={cn(
                                            "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold border",
                                            getStatusColor(invoice.status)
                                        )}>
                                            {getStatusLabel(invoice.status)}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-slate-900 text-sm leading-tight mt-1.5">
                                        {invoice.customerName}
                                    </h3>
                                </div>
                                <div className="absolute top-3 right-3">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                                                <MoreHorizontal className="h-4 w-4 text-slate-500" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(invoice) }}>
                                                <Edit className="mr-2 h-4 w-4" /> Editar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedInvoiceForReceipt(invoice);
                                                setIsReceiptOpen(true);
                                            }}>
                                                <FileText className="mr-2 h-4 w-4" /> Ver Recibo
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedInvoiceForPayment(invoice);
                                                setIsPaymentDialogOpen(true);
                                            }}>
                                                <DollarSign className="mr-2 h-4 w-4" /> Registrar Pago
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={(e) => { e.stopPropagation(); handleDelete(invoice.id) }}>
                                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-y-2 text-sm mt-3 pt-3 border-t border-slate-50">
                                <div>
                                    <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">Fecha</p>
                                    <p className="font-medium text-slate-700">{new Date(invoice.date).toLocaleDateString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">Total</p>
                                    <div className="flex flex-col items-end">
                                        <span className="font-bold text-slate-900">
                                            {invoice.currency === 'USD' ? '$' : '₱'}
                                            {totalInUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                        {showConversion && (
                                            <span className="text-[10px] text-slate-500 mt-0.5 font-medium">
                                                {totalInCUP.toLocaleString('es-ES', {
                                                    style: 'currency',
                                                    currency: 'CUP',
                                                    minimumFractionDigits: 2
                                                })}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {isPaymentDialogOpen && selectedInvoiceForPayment && (
                <PaymentDialog
                    invoiceId={selectedInvoiceForPayment.id}
                    totalAmount={selectedInvoiceForPayment.total}
                    remainingBalance={selectedInvoiceForPayment.total - (selectedInvoiceForPayment.payments?.reduce((sum, p) => sum + p.amount, 0) || 0)}
                    currency={selectedInvoiceForPayment.currency}
                    open={isPaymentDialogOpen}
                    onOpenChange={setIsPaymentDialogOpen}
                    onPaymentSuccess={() => {
                        setIsPaymentDialogOpen(false)
                        setSelectedInvoiceForPayment(null)
                        router.refresh()
                    }}
                />
            )}

            {isReceiptOpen && selectedInvoiceForReceipt && (
                <InvoiceReceiptDialog
                    invoice={selectedInvoiceForReceipt}
                    open={isReceiptOpen}
                    onOpenChange={(open) => {
                        setIsReceiptOpen(open)
                        if (!open) setSelectedInvoiceForReceipt(null)
                    }}
                />
            )}

            {/* FAB */}
            <Button
                onClick={handleCreate}
                className="md:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-slate-900 hover:bg-slate-800 text-white p-0 flex items-center justify-center z-50 border-[3px] border-white/50"
            >
                <Plus className="h-6 w-6" />
                <span className="sr-only">Nueva Factura</span>
            </Button>
        </div>
    )
}
