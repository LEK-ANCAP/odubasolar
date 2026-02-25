"use client"

import { useState, useEffect, Fragment } from "react"
import { Filter, ChevronLeft, ChevronRight, Search, Download, MoreHorizontal, ArrowUpRight, Eye, Trash2, ArrowUpDown, ArrowUp, ArrowDown, X, DollarSign, TrendingUp, Coins, Calendar as CalendarIcon, Package, Wallet, CheckCircle2 } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useInventoryStore } from "@/hooks/use-inventory-store"
import { useOrdersStore, Order } from "@/hooks/use-orders-store"
import { useSettingsStore } from "@/hooks/use-settings-store"

type SortConfig = {
    key: 'id' | 'supplier' | 'date' | 'totalAmount' | 'status' | null
    direction: 'asc' | 'desc'
}

// Returns a stable 3-digit daily sequence number for an order (e.g. "001", "002")
function getOrderDailySequence(orderId: string, orderDate: string, allOrders: { id: string; date: string }[]): string {
    const dayKey = new Date(orderDate).toISOString().slice(0, 10)
    const sameDay = allOrders
        .filter(o => new Date(o.date).toISOString().slice(0, 10) === dayKey)
        .sort((a, b) => a.id.localeCompare(b.id))
    const idx = sameDay.findIndex(o => o.id === orderId)
    return String(idx + 1).padStart(3, '0')
}

interface OrderTableProps {
    searchTerm?: string
    onView?: (order: Order) => void
    onSearchChange?: (term: string) => void
    onCreate?: () => void
}

export function OrderTable({ searchTerm: externalSearchTerm = "", onView, onSearchChange, onCreate }: OrderTableProps) {
    const { products } = useInventoryStore() // Need products to show names in expanded view
    const { orders, deleteOrder, fetchOrders, isLoading, error } = useOrdersStore()
    const { usdRate } = useSettingsStore()

    // Fetch orders on mount
    useEffect(() => {
        fetchOrders()
    }, [fetchOrders])

    // Local state
    const [searchTerm, setSearchTerm] = useState(externalSearchTerm)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [orderToDelete, setOrderToDelete] = useState<Order | null>(null)
    const [selectedOrders, setSelectedOrders] = useState<string[]>([])
    const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
    const [currentPage, setCurrentPage] = useState(1)
    const [statusFilter, setStatusFilter] = useState("all")
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'desc' }) // Default sort by newest date
    const [itemsPerPage, setItemsPerPage] = useState(25)
    const [showCup, setShowCup] = useState(false)

    // Sync external search term
    useEffect(() => {
        setSearchTerm(externalSearchTerm)
    }, [externalSearchTerm])

    // Reset page when search changes
    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm, statusFilter])

    const handleSearchChange = (val: string) => {
        setSearchTerm(val)
        onSearchChange?.(val)
    }

    const handleDeleteClick = (e: React.MouseEvent, order: Order) => {
        e.stopPropagation()
        // Implement delete confirmation modal later if needed, for now direct delete
        if (confirm(`¿Estás seguro de que deseas eliminar la compra ${order.id}?`)) {
            deleteOrder(order.id)
        }
    }

    const toggleRow = (id: string) => {
        const newExpanded = new Set(expandedOrders)
        if (newExpanded.has(id)) {
            newExpanded.delete(id)
        } else {
            newExpanded.add(id)
        }
        setExpandedOrders(newExpanded)
    }

    const handleSort = (key: SortConfig['key']) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }))
    }

    const getStatusBadge = (status: Order['status']) => {
        switch (status) {
            case 'draft':
                return <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200">Borrador</Badge>
            case 'ordered':
                return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Compra</Badge>
            case 'received':
                return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Recibido</Badge>
            case 'cancelled':
                return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelado</Badge>
            default:
                return null
        }
    }

    const getPaymentBadge = (status?: Order['paymentStatus']) => {
        switch (status) {
            case 'paid':
                return (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Pagado
                    </Badge>
                )
            case 'partial':
                return (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
                        <Wallet className="w-2.5 h-2.5" /> Parcial
                    </Badge>
                )
            default:
                return (
                    <Badge variant="outline" className="bg-slate-50 text-slate-400 border-slate-200 gap-1">
                        Pendiente
                    </Badge>
                )
        }
    }

    const normalizeText = (text: string) => {
        return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    };

    const filteredOrders = orders.filter(order => {
        const searchNormalized = normalizeText(searchTerm);
        const matchesSearch = normalizeText(order.supplier).includes(searchNormalized) ||
            normalizeText(order.id).includes(searchNormalized)
        const matchesStatus = statusFilter === "all" || order.status === statusFilter

        return matchesSearch && matchesStatus
    })

    const sortedOrders = [...filteredOrders].sort((a, b) => {
        if (!sortConfig.key) return 0

        let comparison = 0
        if (sortConfig.key === 'id') {
            comparison = a.id.localeCompare(b.id)
        } else if (sortConfig.key === 'supplier') {
            comparison = a.supplier.localeCompare(b.supplier)
        } else if (sortConfig.key === 'date') {
            comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
        } else if (sortConfig.key === 'totalAmount') {
            comparison = a.totalAmount - b.totalAmount
        } else if (sortConfig.key === 'status') {
            comparison = a.status.localeCompare(b.status)
        }

        return sortConfig.direction === 'asc' ? comparison : -comparison
    })

    const totalPages = Math.ceil(sortedOrders.length / itemsPerPage)
    const paginatedOrders = sortedOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    // Selection Logic
    const toggleSelectAll = () => {
        if (selectedOrders.length === filteredOrders.length) {
            setSelectedOrders([])
        } else {
            setSelectedOrders(filteredOrders.map(o => o.id))
        }
    }

    const toggleSelectOrder = (id: string) => {
        if (selectedOrders.includes(id)) {
            setSelectedOrders(selectedOrders.filter(oId => oId !== id))
        } else {
            setSelectedOrders([...selectedOrders, id])
        }
    }

    // Derived Metrics
    const totalOrders = orders.length
    const totalValueUsdConsolidated = orders.reduce((acc, o) => acc + o.totalAmount, 0)
    const totalValueCupConsolidated = totalValueUsdConsolidated * usdRate

    if (isLoading && orders.length === 0) {
        return <div className="py-12 text-center text-slate-500">Cargando compras...</div>
    }

    if (error) {
        return <div className="py-12 text-center text-red-500">Error: {error}</div>
    }

    return (
        <div className="space-y-6 mt-8 -mx-4 md:mx-0">

            {/* Main Table Section - Removed outer card wrapper to match standard style */}
            <div className="space-y-4">

                {/* Toolbar */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6 px-4 md:px-0">
                    {/* Search */}
                    <div className="flex gap-2 w-full md:w-auto">
                        <div className="relative w-full flex-1 md:flex-none md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Buscar por proveedor o ID..."
                                value={searchTerm}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                className="pl-9 pr-8 h-9 bg-white border-slate-200 rounded-lg focus-visible:ring-slate-900 focus-visible:ring-1 focus-visible:border-slate-900 transition-all font-medium text-slate-600 placeholder:text-slate-400 text-xs shadow-sm"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => handleSearchChange("")}
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 px-2 py-1 rounded-md transition-colors"
                                >
                                    Borrar
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 w-full md:w-auto items-center justify-end">
                        {/* Rows Per Page */}
                        <div className="flex items-center gap-2 mr-0 sm:mr-4">
                            <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap hidden sm:inline-block uppercase tracking-wider">Filas</span>
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
                                    <SelectItem value="10" className="text-xs">10</SelectItem>
                                    <SelectItem value="25" className="text-xs">25</SelectItem>
                                    <SelectItem value="50" className="text-xs">50</SelectItem>
                                    <SelectItem value="9999" className="text-xs">Todos</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center gap-2 ml-2 sm:ml-0 bg-slate-50 p-1 rounded-lg border border-slate-100">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 rounded-md shrink-0"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages || totalPages === 0}
                            >
                                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                            </Button>
                        </div>

                        <div className="flex gap-2 items-center">
                            {/* Status Filter */}
                            <Select
                                value={statusFilter}
                                onValueChange={(val) => {
                                    setStatusFilter(val)
                                    setCurrentPage(1)
                                }}
                            >
                                <SelectTrigger className="h-8 w-[150px] bg-white border-slate-200 text-xs font-medium text-slate-600 shadow-sm focus:ring-slate-900 focus:ring-1">
                                    <div className="flex items-center gap-2 truncate">
                                        <Filter className="w-3.5 h-3.5 text-slate-400" />
                                        <SelectValue placeholder="Estado" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent align="end">
                                    <SelectItem value="all" className="text-xs font-medium">Todos</SelectItem>
                                    <SelectItem value="draft" className="text-xs">Borrador</SelectItem>
                                    <SelectItem value="ordered" className="text-xs">Compra</SelectItem>
                                    <SelectItem value="received" className="text-xs">Recibido</SelectItem>
                                    <SelectItem value="cancelled" className="text-xs">Cancelado</SelectItem>
                                </SelectContent>
                            </Select>

                            <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm" title="Exportar">
                                <Download className="w-3.5 h-3.5" />
                            </Button>
                        </div>

                        <div className="flex items-center space-x-2 ml-2">
                            <Checkbox
                                id="showCup"
                                checked={showCup}
                                onCheckedChange={(checked) => setShowCup(checked as boolean)}
                                className="w-4 h-4 border-slate-300 data-[state=checked]:bg-slate-900 data-[state=checked]:border-slate-900"
                            />
                            <label
                                htmlFor="showCup"
                                className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-600"
                            >
                                Mostrar precio CUP
                            </label>
                        </div>

                        {selectedOrders.length > 0 && (
                            <Button
                                variant="destructive"
                                onClick={() => {
                                    if (confirm(`¿Estás seguro de que deseas eliminar ${selectedOrders.length} compras seleccionadas?`)) {
                                        const { deleteOrders } = useOrdersStore.getState()
                                        deleteOrders(selectedOrders)
                                        setSelectedOrders([])
                                    }
                                }}
                                className="h-8 rounded-lg shadow-sm font-medium px-3 text-xs ml-2 bg-red-600 hover:bg-red-700 text-white"
                            >
                                <Trash2 className="w-3.5 h-3.5 mr-2" />
                                Eliminar ({selectedOrders.length})
                            </Button>
                        )}

                        {onCreate && (
                            <Button
                                onClick={onCreate}
                                className="hidden md:flex h-8 rounded-lg bg-slate-900 text-white hover:bg-slate-800 shadow-sm font-medium px-3 text-xs ml-2 shrink-0"
                            >
                                <Package className="w-3.5 h-3.5 mr-2" />
                                Nueva Compra
                            </Button>
                        )}
                    </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto px-4 md:px-0">
                    <table className="w-full text-left text-sm border-collapse border border-slate-100 rounded-lg overflow-hidden">
                        <thead className="text-xs font-medium text-slate-500 border-b border-slate-100 bg-slate-50/50">
                            <tr>
                                <th className="pl-4 w-10 py-1">
                                    <input
                                        type="checkbox"
                                        className="w-3.5 h-3.5 rounded border-slate-300 text-slate-500 focus:ring-slate-500 cursor-pointer accent-slate-500"
                                        checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                                <th className="px-4 py-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleSort('id')}
                                        className="-ml-3 h-8 hover:bg-slate-50 text-slate-500 font-medium text-xs gap-2 normal-case"
                                    >
                                        ID
                                        {sortConfig.key === 'id' ? (
                                            sortConfig.direction === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-slate-900" /> : <ArrowDown className="h-3.5 w-3.5 text-slate-900" />
                                        ) : <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />}
                                    </Button>
                                </th>
                                <th className="px-4 py-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleSort('supplier')}
                                        className="-ml-3 h-8 hover:bg-slate-50 text-slate-500 font-medium text-xs gap-2 normal-case"
                                    >
                                        Proveedor
                                        <ArrowUpDown className="h-3.5 w-3.5" />
                                    </Button>
                                </th>
                                <th className="px-4 py-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleSort('date')}
                                        className="-ml-3 h-8 hover:bg-slate-50 text-slate-500 font-medium text-xs gap-2 normal-case"
                                    >
                                        Fecha
                                        <CalendarIcon className="h-3.5 w-3.5 ml-1" />
                                    </Button>
                                </th>
                                <th className="px-4 py-1 text-center">Estado</th>
                                <th className="px-4 py-1 text-center">Pago</th>
                                <th className="px-4 py-1 text-right">
                                    <div className="flex items-center justify-end gap-2 text-slate-500 font-medium">
                                        Total
                                        <DollarSign className="w-3.5 h-3.5" />
                                    </div>
                                </th>
                                <th className="px-4 py-1 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {paginatedOrders.map((order) => {
                                const isSelected = selectedOrders.includes(order.id)
                                const isExpanded = expandedOrders.has(order.id)
                                const totalCup = order.totalAmount * usdRate

                                return (
                                    <Fragment key={order.id}>
                                        <tr
                                            onClick={() => toggleRow(order.id)}
                                            className={cn("hover:bg-slate-50 transition-colors group cursor-pointer", isSelected && "bg-slate-50", isExpanded && "bg-slate-50/80")}
                                        >
                                            <td className="pl-4 py-1 align-middle" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    className="w-3.5 h-3.5 rounded border-slate-300 text-slate-500 focus:ring-slate-500 cursor-pointer accent-slate-500"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelectOrder(order.id)}
                                                />
                                            </td>
                                            <td className="px-4 py-1 align-middle">
                                                <div className="flex items-center gap-2">
                                                    {isExpanded ? <ArrowUp className="w-3 h-3 text-slate-400" /> : <ArrowDown className="w-3 h-3 text-slate-400" />}
                                                    <span className="font-mono text-xs font-medium text-slate-700 block whitespace-nowrap" title={order.id}>
                                                        OC-{new Date(order.date).toLocaleDateString('en-GB', { year: '2-digit', month: '2-digit', day: '2-digit' }).split('/').reverse().join('')}-{getOrderDailySequence(order.id, order.date, orders)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-1 align-middle">
                                                <span className="text-sm text-slate-700">{order.supplier}</span>
                                            </td>
                                            <td className="px-4 py-1 align-middle">
                                                <span className="text-xs text-slate-500">
                                                    {new Date(order.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </span>
                                            </td>
                                            <td className="px-4 py-1 align-middle text-center">
                                                {getStatusBadge(order.status)}
                                            </td>
                                            <td className="px-4 py-1 align-middle text-center">
                                                {getPaymentBadge(order.paymentStatus)}
                                            </td>
                                            <td className="px-4 py-1 align-middle text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="font-bold text-slate-900 text-sm">${order.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                    {showCup && <span className="text-xs text-slate-500">{totalCup.toLocaleString('es-ES', { style: 'currency', currency: 'CUP', maximumFractionDigits: 0 })}</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-1 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors">
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48 bg-white border-slate-100 shadow-md">
                                                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => onView && onView(order)} className="cursor-pointer hover:bg-slate-50 focus:bg-slate-50">
                                                            <Eye className="mr-2 h-4 w-4 text-slate-500" />
                                                            <span>Ver detalles</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={(e) => handleDeleteClick(e, order)}
                                                            className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer hover:bg-red-50"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            <span>Eliminar</span>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr className="bg-slate-50/50 border-b border-slate-100 animate-in fade-in slide-in-from-top-1 duration-200">
                                                <td colSpan={7} className="p-0">
                                                    <div className="p-4 pl-12 pr-12 pb-6 border-l-2 border-slate-500 ml-8 mb-4 mr-4 bg-white rounded-r-lg shadow-sm ring-1 ring-slate-100">
                                                        <div className="grid grid-cols-12 gap-4 text-xs font-medium text-slate-500 border-b border-slate-100 pb-2 mb-2">
                                                            <div className="col-span-4">Producto</div>
                                                            <div className="col-span-2">Cód.</div>
                                                            <div className="col-span-2 text-center">Cant.</div>
                                                            <div className="col-span-2 text-right">Costo U.</div>
                                                            <div className="col-span-2 text-right">Total</div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            {order.items.map((item, idx) => {
                                                                const product = products.find(p => p.id === item.productId)
                                                                const unitCostCup = item.unitCost * usdRate
                                                                const totalCostCup = (item.quantity * item.unitCost) * usdRate

                                                                return (
                                                                    <div key={idx} className="grid grid-cols-12 gap-4 text-xs items-center hover:bg-slate-50 p-1 rounded transition-colors">
                                                                        <div className="col-span-4 font-medium text-slate-700">
                                                                            {product?.name || item.productId}
                                                                        </div>
                                                                        <div className="col-span-2 text-slate-400 font-mono text-[11px]">
                                                                            PRD-{item.productId.slice(-4).toUpperCase()}
                                                                        </div>
                                                                        <div className="col-span-2 text-center text-slate-600 font-medium">{item.quantity}</div>
                                                                        <div className="col-span-2 text-right">
                                                                            <div className="text-slate-600 text-slate-700">${item.unitCost.toFixed(2)}</div>
                                                                            {showCup && (
                                                                                <div className="text-[10px] text-slate-400">
                                                                                    {unitCostCup.toLocaleString('es-ES', { style: 'currency', currency: 'CUP' })}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="col-span-2 text-right">
                                                                            <div className="font-bold text-slate-900">${(item.quantity * item.unitCost).toFixed(2)}</div>
                                                                            {showCup && (
                                                                                <div className="text-[10px] text-emerald-600 font-medium">
                                                                                    {totalCostCup.toLocaleString('es-ES', { style: 'currency', currency: 'CUP' })}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end gap-8 text-sm">
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Total USD</span>
                                                                <span className="font-bold text-slate-900">${order.totalAmount.toFixed(2)}</span>
                                                            </div>
                                                            {showCup && (
                                                                <div className="flex flex-col items-end">
                                                                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Total CUP</span>
                                                                    <span className="font-bold text-emerald-600">{(order.totalAmount * usdRate).toLocaleString('es-ES', { style: 'currency', currency: 'CUP' })}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                )
                            })}
                        </tbody>
                    </table>
                    {paginatedOrders.length === 0 && (
                        <div className="py-12 text-center">
                            <Package className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                            <h3 className="text-slate-500 font-medium">No se encontraron compras</h3>
                            <p className="text-slate-400 text-xs mt-1">Intenta con otros filtros o crea una nueva compra.</p>
                        </div>
                    )}
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden">
                    {paginatedOrders.map((order) => {
                        const isSelected = selectedOrders.includes(order.id)
                        const totalCup = order.totalAmount * usdRate

                        return (
                            <div
                                key={order.id}
                                className={cn(
                                    "bg-white border-b border-slate-100 last:border-0 p-4 relative transition-colors cursor-pointer block space-y-3",
                                    isSelected ? "bg-slate-50" : "",
                                    expandedOrders.has(order.id) ? "bg-slate-50/50" : ""
                                )}
                                onClick={() => toggleRow(order.id)}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => toggleSelectOrder(order.id)}
                                                className="data-[state=checked]:bg-slate-900 data-[state=checked]:border-slate-900"
                                            />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-slate-700 text-sm">{order.supplier}</h4>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] text-slate-400 font-mono">
                                                    OC-{new Date(order.date).toLocaleDateString('en-GB', { year: '2-digit', month: '2-digit', day: '2-digit' }).split('/').reverse().join('')}-{getOrderDailySequence(order.id, order.date, orders)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 -mr-2">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48 bg-white border-slate-100 shadow-md">
                                                <DropdownMenuItem onClick={() => onView && onView(order)}>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    <span>Ver detalles</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={(e) => handleDeleteClick(e, order)}
                                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    <span>Eliminar</span>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>

                                <div className="flex justify-between items-end">
                                    <div className="space-y-1">
                                        <div className="text-xs text-slate-500">
                                            {new Date(order.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                            {getStatusBadge(order.status)}
                                            {getPaymentBadge(order.paymentStatus)}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1">Total</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="font-bold text-slate-900 text-lg">${order.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        {showCup && <span className="text-xs text-emerald-600 font-medium">{totalCup.toLocaleString('es-ES', { style: 'currency', currency: 'CUP', maximumFractionDigits: 0 })}</span>}
                                    </div>
                                </div>

                                {expandedOrders.has(order.id) && (
                                    <div className="pt-3 border-t border-slate-100 mt-2 animate-in fade-in slide-in-from-top-1">
                                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                                            <Package className="w-3 h-3" /> Productos
                                        </h4>
                                        <div className="space-y-3">
                                            {order.items.map((item, idx) => {
                                                const product = products.find(p => p.id === item.productId)
                                                const unitCostCup = item.unitCost * usdRate
                                                const totalCostCup = (item.quantity * item.unitCost) * usdRate

                                                return (
                                                    <div key={idx} className="text-sm bg-slate-50/50 p-2 rounded-lg border border-slate-100/50">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <div>
                                                                <span className="font-medium text-slate-700 block text-xs">{product?.name || item.productId}</span>
                                                                <span className="text-[10px] text-slate-400 font-mono">PRD-{item.productId.slice(-4).toUpperCase()}</span>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="font-bold text-slate-900 font-mono text-xs">${(item.quantity * item.unitCost).toFixed(2)}</div>
                                                                {showCup && <div className="text-[10px] text-emerald-600 font-medium">{totalCostCup.toLocaleString('es-ES', { style: 'currency', currency: 'CUP', maximumFractionDigits: 0 })}</div>}
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-slate-100 border-dashed mt-1">
                                                            <span>Cant: <span className="font-medium text-slate-700">{item.quantity}</span></span>
                                                            <span>Costo U: <span className="font-medium text-slate-700">${item.unitCost.toFixed(2)}</span></span>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

            </div>

            {/* Mobile FAB */}
            {onCreate && (
                <div className="md:hidden fixed bottom-6 right-6 z-40">
                    <Button
                        onClick={onCreate}
                        className="h-14 w-14 rounded-full bg-slate-900 text-white shadow-lg hover:bg-slate-800 flex items-center justify-center p-0"
                    >
                        <Package className="h-6 w-6" />
                    </Button>
                </div>
            )}
        </div>
    )
}
