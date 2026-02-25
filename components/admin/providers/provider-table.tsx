"use client"

import { useState, useEffect } from "react"
import { useProvidersStore, Provider } from "@/hooks/use-providers-store"
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
    FileText,
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
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ProviderModal } from "./provider-modal"

type SortConfig = {
    key: "name" | "email" | "phone" | null
    direction: "asc" | "desc"
}

export function ProviderTable() {
    const { providers, deleteProvider, fetchProviders, isLoading, error, clearProviders } = useProvidersStore()
    const [editingProvider, setEditingProvider] = useState<Provider | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    // Local state for table
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedProviders, setSelectedProviders] = useState<string[]>([])
    const [currentPage, setCurrentPage] = useState(1)
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "name", direction: "asc" })
    const [itemsPerPage, setItemsPerPage] = useState(25)

    useEffect(() => {
        fetchProviders()
    }, [fetchProviders])

    // Reset page when search changes
    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm])

    const handleEdit = (provider: Provider) => {
        setEditingProvider(provider)
        setIsModalOpen(true)
    }

    const handleAdd = () => {
        setEditingProvider(null)
        setIsModalOpen(true)
    }

    const handleDelete = (id: string) => {
        if (confirm("¿Estás seguro de eliminar este proveedor?")) {
            deleteProvider(id)
        }
    }

    const handleSort = (key: "name" | "email" | "phone") => {
        setSortConfig((current) => ({
            key,
            direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
        }))
    }

    const normalizeText = (text: string) => {
        return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    };

    const searchNormalized = normalizeText(searchTerm);

    const filteredProviders = providers.filter((provider) =>
        normalizeText(provider.name).includes(searchNormalized) ||
        (provider.email && normalizeText(provider.email).includes(searchNormalized)) ||
        (provider.phone && normalizeText(provider.phone).includes(searchNormalized))
    )

    const sortedProviders = [...filteredProviders].sort((a, b) => {
        if (!sortConfig.key) return 0

        let comparison = 0
        if (sortConfig.key === "name") {
            comparison = a.name.localeCompare(b.name)
        } else if (sortConfig.key === "email") {
            comparison = (a.email || "").localeCompare(b.email || "")
        } else if (sortConfig.key === "phone") {
            comparison = (a.phone || "").localeCompare(b.phone || "")
        }

        return sortConfig.direction === "asc" ? comparison : -comparison
    })

    const totalPages = Math.ceil(sortedProviders.length / itemsPerPage)
    const paginatedProviders = sortedProviders.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    // Selection Logic
    const toggleSelectAll = () => {
        if (selectedProviders.length === filteredProviders.length) {
            setSelectedProviders([])
        } else {
            setSelectedProviders(filteredProviders.map((p) => p.id))
        }
    }

    const toggleSelectProvider = (id: string) => {
        if (selectedProviders.includes(id)) {
            setSelectedProviders(selectedProviders.filter((pId) => pId !== id))
        } else {
            setSelectedProviders([...selectedProviders, id])
        }
    }

    if (isLoading && providers.length === 0) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        )
    }

    if (providers.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg bg-slate-50/50 h-[300px]">
                <FileText className="w-10 h-10 text-slate-300 mb-2" />
                <h3 className="font-semibold text-lg text-slate-900">No hay proveedores</h3>
                <p className="text-slate-500 text-sm max-w-sm mt-1">Crea tu primer proveedor para gestionar tus compras.</p>
                <div className="flex gap-4 mt-4">
                    <Button onClick={() => setIsModalOpen(true)}>
                        Crear Proveedor
                    </Button>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-rose-50 text-rose-600 p-4 rounded-xl flex items-center gap-2 border border-rose-100">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <ProviderModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                providerToEdit={editingProvider}
            />

            <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
                {/* Search */}
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative w-full flex-1 md:flex-none md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Buscar proveedor..."
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
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 w-full md:w-auto items-center justify-end">
                    {selectedProviders.length > 0 && (
                        <Button
                            variant="destructive"
                            size="sm"
                            className="mr-2 h-8 text-xs font-medium"
                            onClick={() => {
                                if (confirm(`¿Estás seguro de que deseas eliminar ${selectedProviders.length} proveedores?`)) {
                                    selectedProviders.forEach(id => deleteProvider(id))
                                    setSelectedProviders([])
                                }
                            }}
                        >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Eliminar ({selectedProviders.length})
                        </Button>
                    )}
                    {/* Rows Per Page */}
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
                    <div className="flex items-center gap-2 ml-2 sm:ml-0 bg-slate-50 p-1 rounded-lg border border-slate-100">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-md shrink-0"
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
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
                            title="Exportar"
                        >
                            <Download className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                            onClick={handleAdd}
                            className="hidden md:flex h-8 rounded-lg bg-slate-900 text-white hover:bg-slate-800 shadow-sm font-medium px-3 text-xs ml-2"
                        >
                            <Plus className="w-3.5 h-3.5 mr-2 shrink-0" />
                            Añadir Proveedor
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
                                        selectedProviders.length === filteredProviders.length &&
                                        filteredProviders.length > 0
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
                                    Nombre
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
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSort("email")}
                                    className="-ml-3 h-8 hover:bg-slate-100 text-slate-500 font-medium text-xs gap-2 normal-case"
                                >
                                    Email
                                    <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                                </Button>
                            </th>
                            <th className="px-4 py-3">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSort("phone")}
                                    className="-ml-3 h-8 hover:bg-slate-100 text-slate-500 font-medium text-xs gap-2 normal-case"
                                >
                                    Teléfono
                                    <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                                </Button>
                            </th>
                            <th className="px-4 py-3 text-right">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 bg-white">
                        {paginatedProviders.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-12 text-center text-slate-500">
                                    No se encontraron proveedores.
                                </td>
                            </tr>
                        ) : (
                            paginatedProviders.map((provider, index) => {
                                const isSelected = selectedProviders.includes(provider.id)

                                return (
                                    <tr
                                        key={`provider-row-${provider.id}-${index}`}
                                        className={cn(
                                            "hover:bg-slate-50 transition-colors group cursor-pointer",
                                            isSelected && "bg-slate-50"
                                        )}
                                        onClick={() => handleEdit(provider)}
                                    >
                                        <td className="pl-4 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => toggleSelectProvider(provider.id)}
                                                className="border-slate-300 data-[state=checked]:bg-slate-900 data-[state=checked]:border-slate-900"
                                            />
                                        </td>
                                        <td className="px-4 py-3 align-middle">
                                            <span className="font-medium text-slate-900 text-sm">
                                                {provider.name}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 align-middle">
                                            <span className="text-sm text-slate-600">
                                                {provider.email || "-"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 align-middle">
                                            <span className="text-sm text-slate-600">
                                                {provider.phone || "-"}
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
                                                    onClick={() => handleEdit(provider)}
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
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => handleDelete(provider.id)}
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
                {paginatedProviders.map((provider, index) => {
                    const isSelected = selectedProviders.includes(provider.id)

                    return (
                        <div
                            key={`provider-mob-${provider.id}-${index}`}
                            className={cn(
                                "bg-white border rounded-xl p-4 shadow-sm space-y-3",
                                isSelected ? "border-slate-900 ring-1 ring-slate-900" : "border-slate-100"
                            )}
                            onClick={() => handleEdit(provider)}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => toggleSelectProvider(provider.id)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="border-slate-300 data-[state=checked]:bg-slate-900 data-[state=checked]:border-slate-900"
                                    />
                                    <div>
                                        <h4 className="font-semibold text-slate-900 text-sm">{provider.name}</h4>
                                        <div className="flex flex-col gap-0.5 mt-1">
                                            <span className="text-xs text-slate-500">
                                                {provider.email || "Sin email"}
                                            </span>
                                            <span className="text-xs text-slate-500">
                                                {provider.phone || "Sin teléfono"}
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
                                            <DropdownMenuItem onClick={() => handleEdit(provider)}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                <span>Editar</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => handleDelete(provider.id)}
                                                className="text-red-600 focus:text-red-700 focus:bg-red-50"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                <span>Eliminar</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Mobile FAB */}
            <div className="md:hidden fixed bottom-6 right-6 z-40">
                <Button
                    onClick={handleAdd}
                    className="h-14 w-14 rounded-full bg-slate-900 text-white shadow-lg hover:bg-slate-800 flex items-center justify-center p-0"
                >
                    <Plus className="h-6 w-6" />
                </Button>
            </div>
        </div >
    )
}
