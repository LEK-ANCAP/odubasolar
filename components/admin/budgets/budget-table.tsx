"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Pencil, Trash2, FileText, CheckCircle, Ban, Send, Download, Search, ChevronLeft, ChevronRight, Plus, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useBudgetsStore, Budget } from "@/hooks/use-budgets-store"
import dynamic from "next/dynamic"

const BudgetReceiptDialog = dynamic(
    () => import("./budget-receipt-dialog").then((mod) => mod.BudgetReceiptDialog),
    { ssr: false }
)

interface BudgetTableProps {
    budgets: Budget[]
}

export function BudgetTable({ budgets }: BudgetTableProps) {
    const router = useRouter()
    const { deleteBudget, updateBudget, clearBudgets } = useBudgetsStore()
    const [isDeleting, setIsDeleting] = useState<string | null>(null)
    const [selectedBudgetForReceipt, setSelectedBudgetForReceipt] = useState<Budget | null>(null)
    const [isReceiptOpen, setIsReceiptOpen] = useState(false)

    const handleDelete = async (id: string) => {
        if (confirm("¿Estás seguro de eliminar este presupuesto?")) {
            setIsDeleting(id)
            await deleteBudget(id)
            setIsDeleting(null)
        }
    }

    const handleClearAll = () => {
        if (confirm("¿Estás seguro de eliminar TODOS los presupuestos? Esta acción no se puede deshacer.")) {
            clearBudgets()
        }
    }

    const handleViewReceipt = (budget: Budget) => {
        setSelectedBudgetForReceipt(budget)
        setIsReceiptOpen(true)
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'DRAFT': return <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200">Borrador</Badge>
            case 'SENT': return <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">Enviado</Badge>
            case 'APPROVED': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Aprobado</Badge>
            case 'PAID': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">Pagado</Badge>
            case 'CANCELLED': return <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">Cancelado</Badge>
            default: return <Badge variant="outline">{status}</Badge>
        }
    }

    // ... (rest of selection logic remains same, but omitted for brevity in replace tool if possible, but simpler to replace whole component logic or just specific parts)

    const [selectedBudgets, setSelectedBudgets] = useState<string[]>([])

    const [searchTerm, setSearchTerm] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(25)

    const normalizeText = (text: string) => {
        return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    };

    const searchNormalized = normalizeText(searchTerm);

    const filteredBudgets = budgets.filter((budget) =>
        normalizeText(budget.displayId || budget.id).includes(searchNormalized) ||
        normalizeText(budget.clientName || "").includes(searchNormalized) ||
        normalizeText(budget.status).includes(searchNormalized)
    )

    const totalPages = Math.ceil(filteredBudgets.length / itemsPerPage)
    const paginatedBudgets = filteredBudgets.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    const toggleSelectAll = () => {
        if (selectedBudgets.length === filteredBudgets.length) {
            setSelectedBudgets([])
        } else {
            setSelectedBudgets(filteredBudgets.map(b => b.id))
        }
    }

    const toggleSelectBudget = (id: string) => {
        if (selectedBudgets.includes(id)) {
            setSelectedBudgets(selectedBudgets.filter(bId => bId !== id))
        } else {
            setSelectedBudgets([...selectedBudgets, id])
        }
    }

    return (
        <div className="space-y-4">
            {/* Dialog for Receipt */}
            {selectedBudgetForReceipt && (
                <BudgetReceiptDialog
                    budget={selectedBudgetForReceipt}
                    open={isReceiptOpen}
                    onOpenChange={setIsReceiptOpen}
                />
            )}

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
                {/* Search */}
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Buscar presupuesto..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value)
                            setCurrentPage(1)
                        }}
                        className="pl-9 pr-20 h-9 bg-white border-slate-200 rounded-lg focus-visible:ring-slate-900 focus-visible:ring-1 focus-visible:border-slate-900 transition-all font-medium text-slate-600 placeholder:text-slate-400 text-xs shadow-sm"
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

                {/* Actions */}
                <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
                    {selectedBudgets.length > 0 && (
                        <Button
                            variant="destructive"
                            size="sm"
                            className="mr-2 h-8 text-xs font-medium"
                            onClick={() => {
                                if (confirm(`¿Estás seguro de que deseas eliminar ${selectedBudgets.length} presupuestos?`)) {
                                    selectedBudgets.forEach(id => deleteBudget(id))
                                    setSelectedBudgets([])
                                }
                            }}
                        >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Eliminar ({selectedBudgets.length})
                        </Button>
                    )}

                    {/* Pagination */}
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

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={handleClearAll}
                            title="Eliminar Todo"
                            className="h-8 px-2 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                        >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            Limpiar
                        </Button>
                    </div>
                </div>
            </div>

            {budgets.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg bg-slate-50/50 h-[300px]">
                    <FileText className="w-10 h-10 text-slate-300 mb-2" />
                    <h3 className="font-semibold text-lg text-slate-900">No hay presupuestos</h3>
                    <p className="text-slate-500 text-sm max-w-sm mt-1">Crea tu primer presupuesto para empezar a realizar seguimiento de tus ventas potenciales.</p>
                </div>
            ) : (
                <div className="hidden md:block border rounded-lg overflow-hidden bg-white">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-[50px]">
                                    <input
                                        type="checkbox"
                                        className="w-3.5 h-3.5 rounded border-slate-300 text-slate-500 focus:ring-slate-500 cursor-pointer accent-slate-500 translate-y-0.5"
                                        checked={selectedBudgets.length === budgets.length && budgets.length > 0}
                                        onChange={toggleSelectAll}
                                    />
                                </TableHead>
                                <TableHead className="w-[100px]">ID</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="w-[70px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedBudgets.map((budget) => (
                                <TableRow
                                    key={budget.id}
                                    className="hover:bg-slate-50/50 cursor-pointer"
                                    onClick={() => router.push(`/budgets/${budget.id}`)}
                                >
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            className="w-3.5 h-3.5 rounded border-slate-300 text-slate-500 focus:ring-slate-500 cursor-pointer accent-slate-500 translate-y-0.5"
                                            checked={selectedBudgets.includes(budget.id)}
                                            onChange={() => toggleSelectBudget(budget.id)}
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium text-xs font-mono text-slate-500 whitespace-nowrap">
                                        {budget.displayId || budget.id.substring(0, 8)}
                                    </TableCell>
                                    <TableCell className="font-medium text-slate-900">
                                        {budget.clientName || "Cliente Desconocido"}
                                    </TableCell>
                                    <TableCell className="text-slate-500">
                                        {format(new Date(budget.date), "dd MMM yyyy", { locale: es })}
                                    </TableCell>
                                    <TableCell>
                                        {getStatusBadge(budget.status)}
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-slate-900">
                                        ${budget.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => router.push(`/budgets/${budget.id}`)}>
                                                    <Pencil className="mr-2 h-4 w-4" /> Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleViewReceipt(budget)}>
                                                    <FileText className="mr-2 h-4 w-4" /> Ver Recibo
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => router.push(`/invoices/new?budgetId=${budget.id}`)}>
                                                    <FileText className="mr-2 h-4 w-4" /> Convertir a Factura
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => handleDelete(budget.id)}>
                                                    {isDeleting === budget.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                                    Eliminar
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Mobile View */}
            {budgets.length > 0 && (
                <div className="md:hidden space-y-4">
                    {paginatedBudgets.map((budget) => (
                        <div key={budget.id} className="bg-white border rounded-xl p-4 shadow-sm relative active:bg-slate-50 transition-colors" onClick={() => router.push(`/budgets/${budget.id}`)}>
                            <div className="flex justify-between items-start mb-3">
                                <div className="pr-10">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 px-2 flex items-center h-5 rounded-md border border-slate-200">
                                            {budget.displayId || budget.id.substring(0, 8)}
                                        </span>
                                        {getStatusBadge(budget.status)}
                                    </div>
                                    <h3 className="font-bold text-slate-900 text-sm leading-tight mt-1.5">
                                        {budget.clientName || "Cliente Desconocido"}
                                    </h3>
                                </div>
                                <div className="absolute top-3 right-3">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/budgets/${budget.id}`) }}>
                                                <Pencil className="mr-2 h-4 w-4" /> Editar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewReceipt(budget) }}>
                                                <FileText className="mr-2 h-4 w-4" /> Ver Recibo
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/invoices/new?budgetId=${budget.id}`) }}>
                                                <FileText className="mr-2 h-4 w-4" /> Convertir a Factura
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={(e) => { e.stopPropagation(); handleDelete(budget.id) }}>
                                                {isDeleting === budget.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />} Eliminar
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-y-2 text-sm mt-3 pt-3 border-t border-slate-50">
                                <div>
                                    <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">Fecha</p>
                                    <p className="font-medium text-slate-700">{format(new Date(budget.date), "dd MMM yyyy", { locale: es })}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">Total</p>
                                    <p className="font-bold text-slate-900">
                                        {budget.currency === 'USD' ? '$' : '₱'}
                                        {budget.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* FAB */}
            <Button
                onClick={() => router.push("/budgets/new")}
                className="md:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-slate-900 hover:bg-slate-800 text-white p-0 flex items-center justify-center z-50 border-[3px] border-white/50"
            >
                <Plus className="h-6 w-6" />
                <span className="sr-only">Nuevo Presupuesto</span>
            </Button>
        </div>
    )
}
