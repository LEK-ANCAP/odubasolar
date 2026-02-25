"use client"

import { useState, useEffect } from "react"
import { useCustomersStore, Customer } from "@/hooks/use-customers-store"
import {
    Edit,
    Trash2,
    Loader2,
    AlertCircle,
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
    User,
    Eye
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
// import { CustomerModal } from "./customer-modal" // Assume it is in the same folder or adjust path
import { useRouter } from "next/navigation"

type SortConfig = {
    key: "name" | "email" | "totalSpent" | "lastOrderDate" | null
    direction: "asc" | "desc"
}

interface CustomerTableProps {
    onEdit: (customer: Customer) => void
    onCreate: () => void
}

export function CustomerTable({ onEdit, onCreate }: CustomerTableProps) {
    const { customers, deleteCustomer, generateTestData, clearCustomers, fetchCustomers } = useCustomersStore()
    const router = useRouter()

    // Local state for table
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedCustomers, setSelectedCustomers] = useState<string[]>([])
    const [currentPage, setCurrentPage] = useState(1)
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "name", direction: "asc" })
    const [itemsPerPage, setItemsPerPage] = useState(25)

    // Reset page when search changes
    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm])

    useEffect(() => {
        fetchCustomers()
    }, [fetchCustomers])

    const handleDelete = (id: string) => {
        if (confirm("¿Estás seguro de eliminar este cliente?")) {
            deleteCustomer(id)
        }
    }

    const handleClearAll = () => {
        if (confirm("¿Estás seguro de eliminar TODOS los clientes? Esta acción no se puede deshacer.")) {
            clearCustomers()
        }
    }

    const handleSort = (key: "name" | "email" | "totalSpent" | "lastOrderDate") => {
        setSortConfig((current) => ({
            key,
            direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
        }))
    }

    const normalizeText = (text: string) => {
        return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    };

    const searchNormalized = normalizeText(searchTerm);

    const filteredCustomers = customers.filter((customer) =>
        normalizeText(customer.name).includes(searchNormalized) ||
        normalizeText(customer.email || "").includes(searchNormalized) ||
        normalizeText(customer.phone || "").includes(searchNormalized)
    )

    const sortedCustomers = [...filteredCustomers].sort((a, b) => {
        if (!sortConfig.key) return 0

        let comparison = 0
        if (sortConfig.key === "name") {
            comparison = a.name.localeCompare(b.name)
        } else if (sortConfig.key === "email") {
            comparison = (a.email || "").localeCompare(b.email || "")
        } else if (sortConfig.key === "totalSpent") {
            comparison = (a.totalSpent || 0) - (b.totalSpent || 0)
        } else if (sortConfig.key === "lastOrderDate") {
            comparison = new Date(a.lastOrderDate || 0).getTime() - new Date(b.lastOrderDate || 0).getTime()
        }

        return sortConfig.direction === "asc" ? comparison : -comparison
    })

    const totalPages = Math.ceil(sortedCustomers.length / itemsPerPage)
    const paginatedCustomers = sortedCustomers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    // Selection Logic
    const toggleSelectAll = () => {
        if (selectedCustomers.length === filteredCustomers.length) {
            setSelectedCustomers([])
        } else {
            setSelectedCustomers(filteredCustomers.map((c) => c.id))
        }
    }

    const toggleSelectCustomer = (id: string) => {
        if (selectedCustomers.includes(id)) {
            setSelectedCustomers(selectedCustomers.filter((cId) => cId !== id))
        } else {
            setSelectedCustomers([...selectedCustomers, id])
        }
    }

    if (customers.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <User className="h-12 w-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900">No hay clientes</h3>
                <p className="text-slate-500 mb-6 text-sm">Comienza agregando tu primer cliente o genera datos de prueba.</p>
                <div className="flex gap-4">
                    <Button onClick={onCreate} className="bg-slate-900 text-white hover:bg-slate-800">
                        <Plus className="w-4 h-4 mr-2" />
                        Nuevo Cliente
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
                {/* Search */}
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Buscar cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-20 h-9 bg-white border-slate-200 rounded-lg focus-visible:ring-slate-900 focus-visible:ring-1 focus-visible:border-slate-900 transition-all font-medium text-slate-600 placeholder:text-slate-400 text-xs shadow-sm"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm("")}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 px-2 py-1 rounded-md transition-colors"
                        >
                            Borrar
                        </button>
                    )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
                    {selectedCustomers.length > 0 && (
                        <Button
                            variant="destructive"
                            size="sm"
                            className="mr-2 h-8 text-xs font-medium"
                            onClick={() => {
                                if (confirm(`¿Estás seguro de que deseas eliminar ${selectedCustomers.length} clientes?`)) {
                                    selectedCustomers.forEach(id => deleteCustomer(id))
                                    setSelectedCustomers([])
                                }
                            }}
                        >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Eliminar ({selectedCustomers.length})
                        </Button>
                    )}

                    {/* Rows Per Page */}
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
                            <SelectTrigger className="h-8 w-[90px] text-xs bg-white border-slate-200 shadow-sm focus:ring-slate-900 focus:ring-1 text-slate-600 font-medium">
                                <SelectValue placeholder="25" />
                            </SelectTrigger>
                            <SelectContent align="end">
                                <SelectItem value="10" className="text-xs">
                                    10
                                </SelectItem>
                                <SelectItem value="25" className="text-xs">
                                    25
                                </SelectItem>
                                <SelectItem value="50" className="text-xs">
                                    50
                                </SelectItem>
                                <SelectItem value="9999" className="text-xs">
                                    Todos
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

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
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
                            title="Exportar"
                        >
                            <Download className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                            onClick={onCreate}
                            className="hidden md:flex h-8 rounded-lg bg-slate-900 text-white hover:bg-slate-800 shadow-sm font-medium px-3 text-xs ml-2"
                        >
                            <Plus className="w-3.5 h-3.5 mr-2" />
                            Nuevo Cliente
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
                                    checked={
                                        selectedCustomers.length === filteredCustomers.length &&
                                        filteredCustomers.length > 0
                                    }
                                    onCheckedChange={toggleSelectAll}
                                    className="border-slate-300 data-[state=checked]:bg-slate-900 data-[state=checked]:border-slate-900"
                                />
                            </th>
                            <th className="px-4 py-3">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSort("name")}
                                    className="-ml-3 h-8 hover:bg-slate-100 text-slate-500 font-medium text-xs gap-2 normal-case"
                                >
                                    Cliente
                                    {sortConfig.key === "name" ? (
                                        sortConfig.direction === "asc" ? (
                                            <ArrowUp className="h-3.5 w-3.5 text-slate-900" />
                                        ) : (
                                            <ArrowDown className="h-3.5 w-3.5 text-slate-900" />
                                        )
                                    ) : (
                                        <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                                    )}
                                </Button>
                            </th>
                            <th className="px-4 py-3">
                                Contacto
                            </th>
                            <th className="px-4 py-3 text-center">
                                Pedidos
                            </th>
                            <th className="px-4 py-3 text-right">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSort("totalSpent")}
                                    className="-mr-3 h-8 hover:bg-slate-100 text-slate-500 font-medium text-xs gap-2 normal-case"
                                >
                                    Total Gastado
                                    <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                                </Button>
                            </th>
                            <th className="px-4 py-3 text-right">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSort("lastOrderDate")}
                                    className="-mr-3 h-8 hover:bg-slate-100 text-slate-500 font-medium text-xs gap-2 normal-case"
                                >
                                    Último Pedido
                                    <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                                </Button>
                            </th>
                            <th className="px-4 py-3 text-right">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 bg-white">
                        {paginatedCustomers.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="py-12 text-center text-slate-500">
                                    No se encontraron clientes.
                                </td>
                            </tr>
                        ) : (
                            paginatedCustomers.map((customer, index) => {
                                const isSelected = selectedCustomers.includes(customer.id)

                                return (
                                    <tr
                                        key={`customer-row-${customer.id}-${index}`}
                                        className={cn(
                                            "hover:bg-slate-50 transition-colors group cursor-pointer",
                                            isSelected && "bg-slate-50"
                                        )}
                                        onClick={() => router.push(`/customers/${customer.id}`)}
                                    >
                                        <td className="pl-4 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => toggleSelectCustomer(customer.id)}
                                                className="border-slate-300 data-[state=checked]:bg-slate-900 data-[state=checked]:border-slate-900"
                                            />
                                        </td>
                                        <td className="px-4 py-3 align-middle">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-semibold text-xs border border-slate-200">
                                                    {customer.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <span className="font-medium text-slate-900 text-sm block">
                                                        {customer.name}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400 block max-w-[150px] truncate">
                                                        {customer.address}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 align-middle">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-xs text-slate-600">
                                                    {customer.email || "-"}
                                                </span>
                                                <span className="text-[11px] text-slate-400">
                                                    {customer.phone || "-"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 align-middle text-center">
                                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 min-w-[1.5rem]">
                                                {customer.ordersCount || 0}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 align-middle text-right">
                                            <span className="font-medium text-slate-900 text-sm">
                                                ${(customer.totalSpent || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 align-middle text-right">
                                            <span className="text-xs text-slate-500">
                                                {customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString() : '-'}
                                            </span>
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
                                                    onClick={() => onEdit(customer)}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                                                        >
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48">
                                                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => router.push(`/customers/${customer.id}`)}>
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            <span>Ver Detalles</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => handleDelete(customer.id)}
                                                            className="text-red-600 focus:text-red-700 focus:bg-red-50"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            <span>Eliminar</span>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {paginatedCustomers.map((customer, index) => {
                    const isSelected = selectedCustomers.includes(customer.id)

                    return (
                        <div
                            key={`customer-mob-${customer.id}-${index}`}
                            className={cn(
                                "bg-white border rounded-xl p-4 shadow-sm space-y-3",
                                isSelected ? "border-slate-900 ring-1 ring-slate-900" : "border-slate-100"
                            )}
                            onClick={() => router.push(`/customers/${customer.id}`)}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-semibold text-xs border border-slate-200 shrink-0">
                                        {customer.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-900 text-sm">{customer.name}</h4>
                                        <div className="flex flex-col gap-0.5 mt-1">
                                            <span className="text-xs text-slate-500">
                                                {customer.email || "Sin email"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 -mr-2"
                                            >
                                                <MoreHorizontal className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                            <DropdownMenuItem onClick={() => onEdit(customer)}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                <span>Editar</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => router.push(`/customers/${customer.id}`)}>
                                                <Eye className="mr-2 h-4 w-4" />
                                                <span>Ver Detalles</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => handleDelete(customer.id)}
                                                className="text-red-600 focus:text-red-700 focus:bg-red-50"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                <span>Eliminar</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50">
                                <div>
                                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-0.5">Pedidos</span>
                                    <span className="text-sm font-medium text-slate-700">{customer.ordersCount || 0}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-0.5">Total Gastado</span>
                                    <span className="text-sm font-bold text-slate-900">${(customer.totalSpent || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Mobile FAB */}
            <div className="md:hidden fixed bottom-6 right-6 z-50">
                <Button
                    onClick={onCreate}
                    size="icon"
                    className="h-14 w-14 rounded-full bg-slate-900 text-white shadow-xl hover:bg-slate-800 hover:scale-105 transition-all"
                >
                    <Plus className="h-6 w-6" />
                </Button>
            </div>
        </div>
    )
}
