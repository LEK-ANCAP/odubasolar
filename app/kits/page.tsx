"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
    Filter,
    Plus,
    ChevronLeft,
    ChevronRight,
    Search,
    Download,
    MoreHorizontal,
    Edit,
    Copy,
    Trash2,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    X,
    Package,
    Settings,
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
import { useKitsStore, Kit } from "@/hooks/use-kits-store"

type SortConfig = {
    key: "name" | "basePrice" | "type" | null
    direction: "asc" | "desc"
}

export default function KitsPage() {
    const { kits, duplicateKit, deleteKit } = useKitsStore()
    const [mounted, setMounted] = useState(false)

    // Local state for table
    const [searchTerm, setSearchTerm] = useState("")
    const [searchFocused, setSearchFocused] = useState(false)
    const [showFilters, setShowFilters] = useState(false)
    const [selectedKits, setSelectedKits] = useState<string[]>([])
    const [currentPage, setCurrentPage] = useState(1)
    const [typeFilter, setTypeFilter] = useState<"all" | "sale" | "purchase" | "manufacture">("all")
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: "asc" })
    const [itemsPerPage, setItemsPerPage] = useState(25)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Reset page when search or filter changes
    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm, typeFilter])

    if (!mounted) {
        return null
    }

    const handleSort = (key: "name" | "basePrice" | "type") => {
        setSortConfig((current) => ({
            key,
            direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
        }))
    }

    const handleDeleteKit = (id: string) => {
        if (confirm("¿Estás seguro de que deseas eliminar este kit?")) {
            deleteKit(id)
        }
    }

    const filteredKits = kits.filter((kit) => {
        const normalizeStr = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const searchTerms = normalizeStr(searchTerm).trim().split(/\s+/)
        const searchableText = normalizeStr(`${kit.name} ${kit.description || ""}`)

        const matchesSearch = searchTerms.every(term => searchableText.includes(term))
        const matchesType = typeFilter === "all" || (kit.type || "sale") === typeFilter

        return matchesSearch && matchesType
    })

    const sortedKits = [...filteredKits].sort((a, b) => {
        if (!sortConfig.key) return 0

        let comparison = 0
        if (sortConfig.key === "name") {
            comparison = a.name.localeCompare(b.name)
        } else if (sortConfig.key === "basePrice") {
            comparison = (a.basePrice || 0) - (b.basePrice || 0)
        } else if (sortConfig.key === "type") {
            const typeA = a.type || "sale"
            const typeB = b.type || "sale"
            comparison = typeA.localeCompare(typeB)
        }

        return sortConfig.direction === "asc" ? comparison : -comparison
    })

    const totalPages = Math.ceil(sortedKits.length / itemsPerPage)
    const paginatedKits = sortedKits.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    // Selection Logic
    const toggleSelectAll = () => {
        if (selectedKits.length === filteredKits.length) {
            setSelectedKits([])
        } else {
            setSelectedKits(filteredKits.map((k) => k.id))
        }
    }

    const toggleSelectKit = (id: string) => {
        if (selectedKits.includes(id)) {
            setSelectedKits(selectedKits.filter((kId) => kId !== id))
        } else {
            setSelectedKits([...selectedKits, id])
        }
    }

    // Derived Metrics
    const totalKits = kits.length
    const saleKitsCount = kits.filter((k) => (k.type || "sale") === "sale").length
    const purchaseKitsCount = kits.filter((k) => k.type === "purchase").length
    const manufactureKitsCount = kits.filter((k) => k.type === "manufacture").length

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Kits</h1>
                    <p className="text-slate-500 text-sm mt-1">Gestiona los kits de productos preconfigurados.</p>
                </div>
                <Link href="/kits/builder" className="hidden md:block">
                    <Button className="bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20">
                        <Plus className="mr-2 h-4 w-4" />
                        Crear Kit
                    </Button>
                </Link>
            </div>

            {/* Metrics Cards - Simplified version of Inventory */}
            <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                <div className="grid grid-cols-2 gap-4 w-full md:w-auto md:flex md:gap-6">
                    <div
                        className={cn(
                            "bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-auto md:h-32 w-full md:w-56 shrink-0 transition-all cursor-pointer",
                            typeFilter === "all" ? "ring-1 ring-slate-900 border-slate-900 bg-slate-50/50" : "hover:border-slate-300"
                        )}
                        onClick={() => setTypeFilter("all")}
                    >
                        <div className="flex justify-between items-start mb-2 md:mb-0">
                            <h3 className="text-slate-500 font-medium text-xs md:text-sm uppercase tracking-wider md:normal-case md:tracking-normal">Total Kits</h3>
                            <Package className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400" />
                        </div>
                        <span className="text-xl md:text-3xl font-bold text-slate-900">{totalKits}</span>
                    </div>

                    <div
                        className={cn(
                            "bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-auto md:h-32 w-full md:w-48 shrink-0 transition-all cursor-pointer",
                            typeFilter === "sale" ? "ring-1 ring-emerald-600 border-emerald-600 bg-emerald-50/50" : "hover:border-emerald-200"
                        )}
                        onClick={() => setTypeFilter("sale")}
                    >
                        <div className="flex justify-between items-start mb-2 md:mb-0">
                            <h3 className="text-emerald-600 font-medium text-xs md:text-sm uppercase tracking-wider md:normal-case md:tracking-normal w-[80%]">Venta</h3>
                            <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1" />
                        </div>
                        <span className="text-xl md:text-3xl font-bold text-slate-900">{saleKitsCount}</span>
                    </div>

                    <div
                        className={cn(
                            "bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-auto md:h-32 w-full md:w-48 shrink-0 transition-all cursor-pointer",
                            typeFilter === "purchase" ? "ring-1 ring-blue-600 border-blue-600 bg-blue-50/50" : "hover:border-blue-200"
                        )}
                        onClick={() => setTypeFilter("purchase")}
                    >
                        <div className="flex justify-between items-start mb-2 md:mb-0">
                            <h3 className="text-blue-600 font-medium text-xs md:text-sm uppercase tracking-wider md:normal-case md:tracking-normal w-[80%]">Compra</h3>
                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-1" />
                        </div>
                        <span className="text-xl md:text-3xl font-bold text-slate-900">{purchaseKitsCount}</span>
                    </div>

                    <div
                        className={cn(
                            "bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-auto md:h-32 w-full md:w-48 shrink-0 transition-all cursor-pointer",
                            typeFilter === "manufacture" ? "ring-1 ring-purple-600 border-purple-600 bg-purple-50/50" : "hover:border-purple-200"
                        )}
                        onClick={() => setTypeFilter("manufacture")}
                    >
                        <div className="flex justify-between items-start mb-2 md:mb-0">
                            <h3 className="text-purple-600 font-medium text-xs md:text-sm uppercase tracking-wider md:normal-case md:tracking-normal w-[80%]">Fabricación</h3>
                            <div className="w-2 h-2 rounded-full bg-purple-500 mt-1" />
                        </div>
                        <span className="text-xl md:text-3xl font-bold text-slate-900">{manufactureKitsCount}</span>
                    </div>
                </div>
            </div>

            {/* Main Table Section */}
            <div className="space-y-4">
                {/* Search Bar (Mobile & Desktop) */}
                <div className="flex gap-3 justify-between items-center mb-2">
                    <div className="flex flex-1 items-center gap-2 max-w-xl">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Buscar kit..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                                className="pl-9 pr-14 h-10 bg-white border-slate-200 rounded-xl focus-visible:ring-slate-900 focus-visible:ring-1 focus-visible:border-slate-900 transition-all font-medium text-slate-600 placeholder:text-slate-400 text-sm shadow-sm"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm("")}
                                    className="absolute right-2 md:right-10 top-1/2 -translate-y-1/2 flex items-center justify-center h-6 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-md transition-colors z-10 font-medium text-[10px]"
                                >
                                    <X className="w-3 h-3 mr-1" />
                                    Borrar
                                </button>
                            )}
                            <Button
                                variant={showFilters ? "secondary" : "ghost"}
                                onClick={() => setShowFilters(!showFilters)}
                                className="hidden md:flex absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 shrink-0 p-0 rounded-lg z-10 hover:bg-slate-100"
                                title="Filtros"
                            >
                                <Filter className="w-3.5 h-3.5 text-slate-500" />
                            </Button>
                        </div>
                    </div>

                    <Link href="/kits/builder" className="hidden md:block">
                        <Button className="h-10 px-4 rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-sm font-medium shrink-0">
                            <Plus className="w-4 h-4 mr-2" />
                            Añadir Kit
                        </Button>
                    </Link>
                </div>

                {/* Collapsible Mobile Filters */}
                {showFilters && (
                    <div className="md:hidden bg-white border border-slate-200 border-t-0 rounded-b-2xl p-4 flex flex-col gap-4 animate-in slide-in-from-top-2 fade-in duration-200 shadow-sm -mt-2 pt-6 w-full md:w-72">
                        <div className="flex items-center gap-2">
                            <Search className="w-4 h-4 text-slate-400" />
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filtros</span>
                        </div>

                        <div className="grid gap-4">
                            {/* Sort Filter */}
                            <div className="space-y-1.5">
                                <label className="text-xs text-slate-500 font-medium">Ordenar por</label>
                                <Select
                                    value={sortConfig.key ? `${sortConfig.key}-${sortConfig.direction}` : "none"}
                                    onValueChange={(val) => {
                                        if (val === "none") {
                                            setSortConfig({ key: null, direction: 'asc' })
                                            return
                                        }
                                        const [key, direction] = val.split('-') as [SortConfig['key'], SortConfig['direction']]
                                        setSortConfig({ key, direction })
                                    }}
                                >
                                    <SelectTrigger className="h-8 w-full bg-white border-slate-200 text-xs shadow-none">
                                        <div className="flex items-center gap-2 truncate">
                                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                                            <SelectValue placeholder="Ordenar" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent align="end">
                                        <SelectItem value="none" className="text-xs font-medium text-slate-500">Sin ordenar</SelectItem>
                                        <SelectItem value="name-asc" className="text-xs">Nombre (A-Z)</SelectItem>
                                        <SelectItem value="name-desc" className="text-xs">Nombre (Z-A)</SelectItem>
                                        <SelectItem value="basePrice-asc" className="text-xs">Menor Precio</SelectItem>
                                        <SelectItem value="basePrice-desc" className="text-xs">Mayor Precio</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Type Filter */}
                            <div className="space-y-1.5">
                                <label className="text-xs text-slate-500 font-medium">Tipo</label>
                                <Select
                                    value={typeFilter}
                                    onValueChange={(val) => {
                                        setTypeFilter(val as any)
                                        setCurrentPage(1)
                                    }}
                                >
                                    <SelectTrigger className="h-8 w-full bg-white border-slate-200 text-xs shadow-none">
                                        <SelectValue placeholder="Todos los tipos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all" className="text-xs font-medium">Todos</SelectItem>
                                        <SelectItem value="sale" className="text-xs">Venta</SelectItem>
                                        <SelectItem value="purchase" className="text-xs">Compra</SelectItem>
                                        <SelectItem value="manufacture" className="text-xs">Fabricación</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                )}

                {/* Desktop Collapsible Filters Toolbar */}
                {showFilters && (
                    <div className="hidden md:flex bg-white border border-slate-200 rounded-xl p-4 flex-col lg:flex-row gap-4 justify-between items-start lg:items-center animate-in slide-in-from-top-2 fade-in duration-200 shadow-sm -mt-2 pt-6 w-full md:w-72">
                        <div className="flex flex-col sm:flex-row gap-4 w-full flex-wrap">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-600">Tipo</span>
                                <Select
                                    value={typeFilter}
                                    onValueChange={(val) => {
                                        setTypeFilter(val as any)
                                        setCurrentPage(1)
                                    }}
                                >
                                    <SelectTrigger className="h-9 w-[150px] bg-white border-slate-200 text-sm shadow-sm focus:ring-slate-900">
                                        <div className="flex items-center gap-2 truncate">
                                            <Filter className="w-3.5 h-3.5 text-slate-400" />
                                            <SelectValue placeholder="Tipo" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent align="end">
                                        <SelectItem value="all" className="text-sm font-medium">Todos</SelectItem>
                                        <SelectItem value="sale" className="text-sm">Venta</SelectItem>
                                        <SelectItem value="purchase" className="text-sm">Compra</SelectItem>
                                        <SelectItem value="manufacture" className="text-sm">Fabricación</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500 font-bold whitespace-nowrap uppercase tracking-wider">Filas</span>
                                <Select
                                    value={itemsPerPage.toString()}
                                    onValueChange={(val) => {
                                        setItemsPerPage(Number(val))
                                        setCurrentPage(1)
                                    }}
                                >
                                    <SelectTrigger className="h-9 w-[80px] text-sm bg-white border-slate-200 shadow-sm focus:ring-slate-900 focus:ring-1 text-slate-600 font-medium rounded-lg">
                                        <SelectValue placeholder="25" />
                                    </SelectTrigger>
                                    <SelectContent align="end">
                                        <SelectItem value="10" className="text-sm">10</SelectItem>
                                        <SelectItem value="25" className="text-sm">25</SelectItem>
                                        <SelectItem value="50" className="text-sm">50</SelectItem>
                                        <SelectItem value="9999" className="text-sm">Todos</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100 h-9">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-md hover:bg-white hover:shadow-sm"
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="w-4 h-4 text-slate-600" />
                                </Button>
                                <span className="text-xs font-semibold text-slate-600 min-w-[4rem] text-center">
                                    {currentPage} de {totalPages || 1}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-md hover:bg-white hover:shadow-sm"
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                >
                                    <ChevronRight className="w-4 h-4 text-slate-600" />
                                </Button>
                            </div>

                            <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm bg-white ml-auto" title="Exportar">
                                <Download className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse border border-slate-100 rounded-lg overflow-hidden">
                        <thead className="text-xs font-medium text-slate-500 border-b border-slate-100 bg-slate-50/50">
                            <tr>
                                <th className="pl-4 w-10 py-3">
                                    <Checkbox
                                        checked={selectedKits.length === filteredKits.length && filteredKits.length > 0}
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
                                        onClick={() => handleSort("type")}
                                        className="-ml-3 h-8 hover:bg-slate-100 text-slate-500 font-medium text-xs gap-2 normal-case"
                                    >
                                        Tipo
                                        <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                                    </Button>
                                </th>
                                <th className="px-4 py-3 text-center">Atributos</th>
                                <th className="px-4 py-3 text-center">Productos</th>
                                <th className="px-4 py-3 text-right">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleSort("basePrice")}
                                        className="h-8 hover:bg-slate-100 text-slate-500 font-medium text-xs gap-2 normal-case ml-auto"
                                    >
                                        Precio Base
                                        <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                                    </Button>
                                </th>
                                <th className="px-4 py-3 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 bg-white">
                            {paginatedKits.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-slate-500">
                                        No se encontraron kits.
                                    </td>
                                </tr>
                            ) : (
                                paginatedKits.map((kit, index) => {
                                    const isSelected = selectedKits.includes(kit.id)
                                    const isPurchase = kit.type === "purchase"
                                    const isManufacture = kit.type === "manufacture"

                                    return (
                                        <tr
                                            key={`kit-row-${kit.id}-${index}`}
                                            className={cn(
                                                "hover:bg-slate-50 transition-colors group cursor-pointer",
                                                isSelected && "bg-slate-50"
                                            )}
                                        >
                                            <td className="pl-4 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() => toggleSelectKit(kit.id)}
                                                    className="border-slate-300 data-[state=checked]:bg-slate-900 data-[state=checked]:border-slate-900"
                                                />
                                            </td>
                                            <td className="px-4 py-3 align-middle">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-slate-900 text-sm">{kit.name}</span>
                                                    <span className="text-xs text-slate-500 truncate max-w-[200px]">
                                                        {kit.description || "Sin descripción"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 align-middle">
                                                <Badge
                                                    variant="secondary"
                                                    className={cn(
                                                        "bg-opacity-10 border border-opacity-20",
                                                        isPurchase
                                                            ? "bg-blue-100 text-blue-700 border-blue-200"
                                                            : isManufacture
                                                                ? "bg-purple-100 text-purple-700 border-purple-200"
                                                                : "bg-emerald-100 text-emerald-700 border-emerald-200"
                                                    )}
                                                >
                                                    {isPurchase ? "Compra" : isManufacture ? "Fabricación" : "Venta"}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 align-middle text-center">
                                                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                                    <Settings className="w-3 h-3 mr-1" />
                                                    {kit.attributes?.length || 0}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 align-middle text-center">
                                                <span className="text-xs text-slate-600 font-medium">
                                                    {kit.products?.length || 0} items
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 align-middle text-right">
                                                <span className="font-bold text-slate-900">
                                                    ${Number(kit.basePrice || 0).toFixed(2)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 align-middle text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Link href={`/kits/builder?edit=${kit.id}`}>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                    </Link>
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
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    duplicateKit(kit.id)
                                                                }}
                                                            >
                                                                <Copy className="mr-2 h-4 w-4 text-slate-500" />
                                                                <span>Duplicar</span>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handleDeleteKit(kit.id)
                                                                }}
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
                    {paginatedKits.map((kit, index) => {
                        const isSelected = selectedKits.includes(kit.id)
                        const isPurchase = kit.type === "purchase"

                        return (
                            <div
                                key={`kit-mob-${kit.id}-${index}`}
                                className={cn(
                                    "bg-white border rounded-xl p-4 shadow-sm space-y-3",
                                    isSelected ? "border-slate-900 ring-1 ring-slate-900" : "border-slate-100"
                                )}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() => toggleSelectKit(kit.id)}
                                            className="border-slate-300 data-[state=checked]:bg-slate-900 data-[state=checked]:border-slate-900"
                                        />
                                        <div>
                                            <h4 className="font-semibold text-slate-900 text-sm">{kit.name}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge
                                                    variant="secondary"
                                                    className={cn(
                                                        "text-[10px] px-1.5 py-0.5",
                                                        isPurchase
                                                            ? "bg-blue-50 text-blue-700 border-blue-100"
                                                            : "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                    )}
                                                >
                                                    {isPurchase ? "Compra" : "Venta"}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
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
                                            <DropdownMenuItem asChild>
                                                <Link href={`/kits/builder?edit=${kit.id}`}>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    <span>Editar</span>
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => duplicateKit(kit.id)}>
                                                <Copy className="mr-2 h-4 w-4" />
                                                <span>Duplicar</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => handleDeleteKit(kit.id)}
                                                className="text-red-600 focus:text-red-700 focus:bg-red-50"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                <span>Eliminar</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <div className="pt-2 border-t border-slate-50 grid grid-cols-2 gap-4">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1">
                                            Configuración
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                                                {kit.attributes?.length || 0} Atributos
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                {kit.products?.length || 0} Prod.
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1">
                                            Precio Base
                                        </span>
                                        <span className="font-bold text-slate-900">
                                            ${Number(kit.basePrice || 0).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Mobile Floating Action Button (FAB) */}
            <div className="fixed bottom-6 right-6 md:hidden z-50">
                <Link href="/kits/builder">
                    <Button
                        className="h-14 w-14 rounded-full shadow-2xl bg-slate-900 hover:bg-slate-800 transition-transform duration-200 p-0"
                    >
                        <Plus className="w-6 h-6 text-white" />
                    </Button>
                </Link>
            </div>
        </div>
    )
}
