"use client"

import { useState, useEffect } from "react"
import { Filter, Plus, ChevronLeft, ChevronRight, Search, Download, MoreHorizontal, ArrowUpRight, Edit, Trash2, ClipboardEdit, ArrowUpDown, ArrowUp, ArrowDown, X, Check, Text, Tag, DollarSign, TrendingUp, Coins, Loader2, AlertCircle, Calculator, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
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
import { ProductStatusBadge } from "./product-status-badge"
import { AddProductModal } from "@/components/admin/add-product-modal"
import { DeleteConfirmationModal } from "@/components/admin/delete-confirmation-modal"
import { cn } from "@/lib/utils"
import { useInventoryStore, Product } from "@/hooks/use-inventory-store"
import { useSettingsStore } from "@/hooks/use-settings-store"

type SortConfig = {
    key: 'name' | 'category' | 'stock' | null
    direction: 'asc' | 'desc'
}

export function InventoryTable() {
    const [searchTerm, setSearchTerm] = useState("")
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [productToEdit, setProductToEdit] = useState<Product | null>(null)
    const [selectedProducts, setSelectedProducts] = useState<string[]>([])
    const [currentPage, setCurrentPage] = useState(1)
    const [titleFilter, setTitleFilter] = useState("")
    const [selectedCategory, setSelectedCategory] = useState("all")
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' })
    const [itemsPerPage, setItemsPerPage] = useState(25)
    const [showCup, setShowCup] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'out'>('all')
    const [productToDelete, setProductToDelete] = useState<Product | null>(null)
    const [searchFocused, setSearchFocused] = useState(false)
    const [showFilters, setShowFilters] = useState(false)
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
    const [isFabOpen, setIsFabOpen] = useState(false)
    const [isMassCategoryModalOpen, setIsMassCategoryModalOpen] = useState(false)
    const [isMassDeleteModalOpen, setIsMassDeleteModalOpen] = useState(false)
    const [massCategoryValue, setMassCategoryValue] = useState("")

    const { products, categories, fetchProducts, deleteProduct, updateProduct, isLoading, error } = useInventoryStore()
    const { usdRate } = useSettingsStore()

    const handleMassDelete = async () => {
        setIsMassDeleteModalOpen(false)
        const ids = [...selectedProducts]
        let hasError = false
        for (const id of ids) {
            const result = await deleteProduct(id)
            if (!result.success) {
                const name = products.find(p => p.id === id)?.name || id
                toast.error(`No se pudo eliminar "${name}": ${result.error}`)
                hasError = true
            }
        }
        if (!hasError) {
            toast.success(`${ids.length} productos eliminados correctamente.`)
        }
        setSelectedProducts([])
    }

    const handleMassCategorize = async () => {
        if (!massCategoryValue.trim()) return
        setIsMassCategoryModalOpen(false)
        const ids = [...selectedProducts]
        let hasError = false
        for (const id of ids) {
            const success = await updateProduct(id, { category: massCategoryValue })
            if (!success) hasError = true
        }

        if (!hasError) {
            toast.success(`Se categorizaron ${ids.length} productos como "${massCategoryValue}".`)
        } else {
            toast.error("Hubo un error al categorizar algunos productos.")
        }
        setSelectedProducts([])
        setMassCategoryValue("")
    }

    // Reset page when search changes
    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm])

    useEffect(() => {
        fetchProducts()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleEditProduct = (product: Product) => {
        setProductToEdit(product)
        setIsModalOpen(true)
    }

    const handleAddProduct = () => {
        setProductToEdit(null)
        setIsModalOpen(true)
    }

    const handleDeleteClick = (product: Product) => {
        setProductToDelete(product)
        setIsDeleteModalOpen(true)
    }

    const handleConfirmDelete = async () => {
        if (productToDelete) {
            const result = await deleteProduct(productToDelete.id)
            if (!result.success) {
                toast.error(result.error || 'No se pudo eliminar el producto')
            } else {
                toast.success(`"${productToDelete.name}" eliminado`)
            }
        }
        setIsDeleteModalOpen(false)
        setProductToDelete(null)
    }

    const handleSort = (key: 'name' | 'category' | 'stock') => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }))
    }

    const filteredProducts = products.filter(p => {
        const normalizeStr = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

        const searchTerms = normalizeStr(searchTerm).trim().split(/\s+/)
        const searchableText = normalizeStr(`${p.name} ${p.id} ${p.category}`)
        const matchesSearch = searchTerms.every(term => searchableText.includes(term))
        const matchesCategory = selectedCategory === "all" || p.category === selectedCategory

        let matchesStock = true
        if (stockStatusFilter === 'low') {
            matchesStock = p.stock > 0 && p.stock <= (p.lowStockThreshold || 10)
        } else if (stockStatusFilter === 'out') {
            matchesStock = p.stock === 0
        }

        return matchesSearch && matchesCategory && matchesStock
    })

    const sortedProducts = [...filteredProducts].sort((a, b) => {
        if (!sortConfig.key) return 0

        let comparison = 0
        if (sortConfig.key === 'name') {
            comparison = a.name.localeCompare(b.name)
        } else if (sortConfig.key === 'category') {
            comparison = a.category.localeCompare(b.category)
        } else if (sortConfig.key === 'stock') {
            comparison = a.stock - b.stock
        }

        return sortConfig.direction === 'asc' ? comparison : -comparison
    })

    const totalPages = Math.ceil(sortedProducts.length / itemsPerPage)
    const paginatedProducts = sortedProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    // Selection Logic
    const toggleSelectAll = () => {
        if (selectedProducts.length === filteredProducts.length) {
            setSelectedProducts([])
        } else {
            setSelectedProducts(filteredProducts.map(p => p.id))
        }
    }

    const toggleSelectProduct = (id: string) => {
        if (selectedProducts.includes(id)) {
            setSelectedProducts(selectedProducts.filter(pId => pId !== id))
        } else {
            setSelectedProducts([...selectedProducts, id])
        }
    }

    // Derived Metrics
    const totalProducts = products.length
    const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= (p.lowStockThreshold || 10)).length
    const outOfStockCount = products.filter(p => p.stock === 0).length
    const totalValueCup = products.reduce((acc, p) => acc + (p.costCup * p.stock), 0)
    const totalValueUsd = totalValueCup / usdRate

    // Mock trend data
    const lastMonthProducts = 295
    const lastMonthRevenue = 32

    return (
        <div className="space-y-6">
            <AddProductModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} productToEdit={productToEdit} />
            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                productName={productToDelete?.name || ""}
            />

            <Dialog open={isMassCategoryModalOpen} onOpenChange={setIsMassCategoryModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Categorizar {selectedProducts.length} productos</DialogTitle>
                        <DialogDescription>
                            Elige una categoría existente o crea una nueva para los productos seleccionados.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Categorías existentes</Label>
                            <Select value={massCategoryValue} onValueChange={setMassCategoryValue}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona una categoría..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((cat, idx) => (
                                        <SelectItem key={cat || `cat-${idx}`} value={cat || "Sin categoría"}>{cat || "Sin categoría"}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">O escribe una nueva categoría</Label>
                            <Input
                                placeholder="Ej. Accesorios..."
                                value={massCategoryValue}
                                onChange={(e) => setMassCategoryValue(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsMassCategoryModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleMassCategorize} disabled={!massCategoryValue.trim()}>Aplicar Categoría</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isMassDeleteModalOpen} onOpenChange={setIsMassDeleteModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Eliminar múltiples productos</DialogTitle>
                        <DialogDescription>
                            ¿Estás seguro de que deseas eliminar permanentemente {selectedProducts.length} productos? Esta acción removerá su stock e historial. No se puede deshacer.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsMassDeleteModalOpen(false)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleMassDelete}>Sí, eliminar todos</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Summary Cards */}
            {/* Summary Cards */}
            <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                <div className="grid grid-cols-2 gap-4 w-full md:w-auto md:flex md:gap-6">
                    {/* Card 1: Total Products */}
                    <div
                        className={cn(
                            "bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-auto md:h-32 w-full md:w-72 shrink-0 transition-all",
                            stockStatusFilter !== 'all' ? "cursor-pointer hover:border-slate-300" : "ring-1 ring-slate-900/5 bg-slate-50/50"
                        )}
                        onClick={() => setStockStatusFilter('all')}
                    >
                        <div className="flex justify-between items-start mb-2 md:mb-0">
                            <h3 className="text-slate-500 font-medium text-xs md:text-sm">Total Productos</h3>
                            <Tag className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400" />
                        </div>
                        <div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl md:text-3xl font-bold text-slate-900">{totalProducts.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2 md:mt-1">
                                <span className="text-[10px] md:text-xs text-slate-400 leading-tight">items registrados</span>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Inventory Value */}
                    <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-auto md:h-32 w-full md:w-72 shrink-0">
                        <div className="flex justify-between items-start mb-2 md:mb-0">
                            <h3 className="text-slate-500 font-medium text-xs md:text-sm">Valor Inventario</h3>
                            <DollarSign className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400" />
                        </div>
                        <div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl md:text-3xl font-bold text-slate-900">${totalValueUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                            </div>
                            <span className="text-[10px] md:text-xs text-slate-500 font-medium md:mt-1 block">{totalValueCup.toLocaleString('es-ES', { style: 'currency', currency: 'CUP', maximumFractionDigits: 0 })}</span>
                        </div>
                    </div>
                </div>

                {/* Card 3: Needs Attention & Filters */}
                <div className="flex flex-col w-full md:w-auto">
                    <div className={cn(
                        "p-4 md:p-6 rounded-2xl border shadow-sm flex flex-col justify-between h-auto md:h-32 w-full md:w-72 shrink-0 transition-all z-10 relative bg-white",
                        stockStatusFilter === 'low' ? "border-amber-400 bg-amber-50/50 ring-1 ring-amber-400/20" :
                            stockStatusFilter === 'out' ? "border-red-400 bg-red-50/50 ring-1 ring-red-400/20" :
                                "border-slate-100",
                        showFilters && "rounded-b-none border-b-0 shadow-none"
                    )}>
                        <div className="flex justify-between items-start mb-3 md:mb-0">
                            <div className="flex items-center gap-2">
                                <h3 className={cn(
                                    "font-medium text-xs md:text-sm transition-colors",
                                    stockStatusFilter === 'low' ? "text-amber-800 font-semibold" :
                                        stockStatusFilter === 'out' ? "text-red-800 font-semibold" :
                                            "text-slate-500"
                                )}>Requiere Atención</h3>
                                {stockStatusFilter !== 'all' && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => { e.stopPropagation(); setStockStatusFilter('all'); }}
                                        className="h-5 px-1.5 py-0 text-[10px] text-slate-500 hover:text-slate-900 bg-white border border-slate-200 shadow-sm rounded-md ml-1 inline-flex items-center"
                                    >
                                        <X className="w-2.5 h-2.5 mr-0.5" />
                                        Limpiar
                                    </Button>
                                )}
                            </div>
                            <Button
                                variant={showFilters ? "secondary" : "ghost"}
                                onClick={() => setShowFilters(!showFilters)}
                                className="h-7 w-7 shrink-0 p-0 rounded-lg hover:bg-slate-100 -mr-1 -mt-1 md:hidden"
                                title="Filtros"
                            >
                                <Filter className="w-4 h-4 text-slate-500" />
                            </Button>
                            <AlertCircle className={cn(
                                "w-3.5 h-3.5 md:w-4 md:h-4 transition-colors hidden md:block",
                                stockStatusFilter === 'low' ? "text-amber-600" :
                                    stockStatusFilter === 'out' ? "text-red-600" :
                                        "text-amber-500"
                            )} />
                        </div>
                        <div className="flex gap-4 md:gap-6">
                            <div
                                className={cn("cursor-pointer transition-all", stockStatusFilter === 'low' ? "opacity-100 scale-105" : stockStatusFilter !== 'all' ? "opacity-40" : "opacity-80 hover:opacity-100")}
                                onClick={() => setStockStatusFilter(stockStatusFilter === 'low' ? 'all' : 'low')}
                            >
                                <span className="text-xl md:text-2xl font-bold text-slate-900 block">{lowStockCount}</span>
                                <span className="text-[10px] md:text-xs text-amber-600 font-medium flex items-center gap-1">
                                    <span className={cn("w-1.5 h-1.5 rounded-full", stockStatusFilter === 'low' ? "bg-amber-500" : "bg-amber-400")}></span>
                                    Bajo Stock
                                </span>
                            </div>
                            <div className="w-px bg-slate-200 h-8 md:h-10 self-end mb-0.5 md:mb-1"></div>
                            <div
                                className={cn("cursor-pointer transition-all", stockStatusFilter === 'out' ? "opacity-100 scale-105" : stockStatusFilter !== 'all' ? "opacity-40" : "opacity-80 hover:opacity-100")}
                                onClick={() => setStockStatusFilter(stockStatusFilter === 'out' ? 'all' : 'out')}
                            >
                                <span className="text-xl md:text-2xl font-bold text-slate-900 block">{outOfStockCount}</span>
                                <span className="text-[10px] md:text-xs text-red-600 font-medium flex items-center gap-1">
                                    <span className={cn("w-1.5 h-1.5 rounded-full", stockStatusFilter === 'out' ? "bg-red-600" : "bg-red-400")}></span>
                                    Agotado
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Collapsible Mobile Filters */}
                    {showFilters && (
                        <div className="md:hidden bg-white border border-slate-200 border-t-0 rounded-b-2xl p-4 flex flex-col gap-4 animate-in slide-in-from-top-2 fade-in duration-200 shadow-sm -mt-2 pt-6 w-full md:w-72">
                            {/* Desktop equivalent moved to main toolbar search line */}
                            <div className="flex items-center gap-2">
                                <Search className="w-4 h-4 text-slate-400" />
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filtros</span>
                            </div>

                            <div className="grid gap-4">
                                {/* Sort Filter */}
                                <div className="space-y-1.5">
                                    <label className="text-xs text-slate-500 font-medium">Ordenar por</label>
                                    <div className="flex gap-1.5">
                                        <Button
                                            variant={sortConfig.key === 'name' ? "secondary" : "outline"}
                                            size="sm"
                                            onClick={() => handleSort('name')}
                                            className="h-8 text-xs flex-1 shadow-none"
                                        >
                                            Nombre
                                            {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />)}
                                            {sortConfig.key !== 'name' && <ArrowUpDown className="w-3 h-3 ml-1 text-slate-300" />}
                                        </Button>
                                        <Button
                                            variant={sortConfig.key === 'stock' ? "secondary" : "outline"}
                                            size="sm"
                                            onClick={() => handleSort('stock')}
                                            className="h-8 text-xs flex-1 shadow-none"
                                        >
                                            Inventario
                                            {sortConfig.key === 'stock' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />)}
                                            {sortConfig.key !== 'stock' && <ArrowUpDown className="w-3 h-3 ml-1 text-slate-300" />}
                                        </Button>
                                    </div>
                                </div>

                                {/* Category Filter */}
                                <div className="space-y-1.5">
                                    <label className="text-xs text-slate-500 font-medium">Categoría</label>
                                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                        <SelectTrigger className="h-8 w-full bg-white border-slate-200 text-xs shadow-none">
                                            <SelectValue placeholder="Todas" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todas las categorías</SelectItem>
                                            {categories.map((cat, idx) => (
                                                <SelectItem key={`cat-filter-mob-${cat || idx}-${idx}`} value={cat || `uncategorized-${idx}`}>
                                                    {cat || "Sin categoría"}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs text-slate-500 font-medium">Mostrar Precio Oculto</label>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="show-cup-mobile"
                                            checked={showCup}
                                            onCheckedChange={(checked) => setShowCup(checked as boolean)}
                                        />
                                        <label
                                            htmlFor="show-cup-mobile"
                                            className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-600"
                                        >
                                            Mostrar en CUP
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* Main Table Section */}
            <div className="space-y-4">
                {/* Advanced Search & Main Actions */}

                {/* Search Bar (Mobile & Desktop) */}
                <div className="flex gap-3 justify-between items-center mb-2">
                    <div className="flex flex-1 items-center gap-2 max-w-xl">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Buscar productos (nombre, categoría o código)..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                                className="pl-9 pr-14 h-10 bg-white border-slate-200 rounded-xl focus-visible:ring-slate-900 focus-visible:ring-1 focus-visible:border-slate-900 transition-all font-medium text-slate-600 placeholder:text-slate-400 text-sm shadow-sm"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm("")}
                                    className="absolute right-2 md:right-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center h-6 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-md transition-colors z-10 font-medium text-[10px]"
                                >
                                    <X className="w-3 h-3 mr-1" />
                                    Borrar
                                </button>
                            )}

                            {/* Autocomplete Dropdown */}
                            {searchFocused && searchTerm && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-[300px] overflow-y-auto animate-in fade-in slide-in-from-top-2">
                                    {filteredProducts.length > 0 ? (
                                        <div className="py-2">
                                            <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                                                Resultados de la búsqueda ({filteredProducts.length})
                                            </div>
                                            {filteredProducts.slice(0, 10).map((product) => (
                                                <div
                                                    key={`auto-${product.id}`}
                                                    className="px-3 py-2 hover:bg-slate-50 cursor-pointer flex justify-between items-center border-b border-slate-50 last:border-0"
                                                    onMouseDown={() => {
                                                        setSearchTerm(`${product.name}`)
                                                    }}
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-slate-900">{product.name}</span>
                                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                                            <span>{product.category || 'Sin categoría'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-xs font-semibold px-2 py-1 bg-slate-100 rounded-md text-slate-600">
                                                        {product.stock} u.
                                                    </div>
                                                </div>
                                            ))}
                                            {filteredProducts.length > 10 && (
                                                <div className="px-3 py-2 text-xs text-center text-slate-500 bg-slate-50 border-t border-slate-100">
                                                    Ver todos los {filteredProducts.length} resultados usando la tabla
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="p-4 text-center text-sm text-slate-500">
                                            No se encontraron productos para "{searchTerm}"
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {selectedProducts.length > 0 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="h-10 rounded-xl border-slate-200 shadow-sm font-medium shrink-0 text-slate-800 hover:bg-slate-50 gap-2 px-3">
                                    <span className="hidden sm:inline">Acciones</span> ({selectedProducts.length})
                                    <ChevronDown className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 z-[100]">
                                <DropdownMenuItem onClick={() => setIsMassCategoryModalOpen(true)}>
                                    <Tag className="w-4 h-4 mr-2" />
                                    Categorizar...
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="text-rose-600 focus:bg-rose-50 focus:text-rose-700"
                                    onClick={() => setIsMassDeleteModalOpen(true)}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Eliminar Seleccionados
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                    <Button
                        onClick={handleAddProduct}
                        className="hidden md:flex h-10 rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-sm font-medium shrink-0"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Añadir Producto
                    </Button>
                </div>

                {/* Collapsible Filters Toolbar */}
                <div className={cn("bg-white border border-slate-200 rounded-xl p-4 flex-col lg:flex-row gap-4 justify-between items-start lg:items-center shadow-sm mb-4", showFilters ? "flex" : "hidden md:flex")}>
                    <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
                        {/* Category Filter */}
                        <Select
                            value={selectedCategory}
                            onValueChange={(val) => {
                                setSelectedCategory(val)
                                setCurrentPage(1)
                            }}
                        >
                            <SelectTrigger className="h-9 w-[130px] md:w-[160px] bg-white border-slate-200 text-sm font-medium text-slate-600 shadow-sm focus:ring-slate-900 focus:ring-1 rounded-lg">
                                <div className="flex items-center gap-2 truncate">
                                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                                    <SelectValue placeholder="Categoría" />
                                </div>
                            </SelectTrigger>
                            <SelectContent align="end">
                                <SelectItem value="all" className="text-sm font-medium">Todas</SelectItem>
                                {categories.map((category, catIdx) => (
                                    <SelectItem key={category || `cat-${catIdx}`} value={category} className="text-sm">{category}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Sort Dropdown for Mobile (and Desktop) */}
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
                            <SelectTrigger className="h-9 w-[130px] md:w-[160px] bg-white border-slate-200 text-sm font-medium text-slate-600 shadow-sm focus:ring-slate-900 focus:ring-1 rounded-lg">
                                <div className="flex items-center gap-2 truncate">
                                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                                    <SelectValue placeholder="Ordenar" />
                                </div>
                            </SelectTrigger>
                            <SelectContent align="end">
                                <SelectItem value="none" className="text-sm font-medium text-slate-500">Sin ordenar</SelectItem>
                                <SelectItem value="name-asc" className="text-sm">Nombre (A-Z)</SelectItem>
                                <SelectItem value="name-desc" className="text-sm">Nombre (Z-A)</SelectItem>
                                <SelectItem value="stock-asc" className="text-sm">Menor Stock</SelectItem>
                                <SelectItem value="stock-desc" className="text-sm">Mayor Stock</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="flex items-center space-x-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 h-9">
                            <Checkbox
                                id="showCup"
                                checked={showCup}
                                onCheckedChange={(checked) => setShowCup(checked as boolean)}
                                className="w-4 h-4 border-slate-300 data-[state=checked]:bg-slate-900 data-[state=checked]:border-slate-900"
                            />
                            <label
                                htmlFor="showCup"
                                className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-600 cursor-pointer"
                            >
                                Mostrar precio CUP
                            </label>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto justify-between lg:justify-end">
                        {/* Rows Per Page */}
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

                        {/* Pagination */}
                        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100 h-9">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-md hover:bg-white hover:shadow-sm"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages || totalPages === 0}
                            >
                                <ChevronRight className="w-4 h-4 text-slate-600" />
                            </Button>
                        </div>

                        <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm bg-white" title="Exportar">
                            <Download className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse border border-slate-100 rounded-lg overflow-hidden">
                        <thead className="text-xs font-medium text-slate-500 border-b border-slate-100">
                            <tr>
                                <th className="pl-4 w-10 py-1">
                                    <input
                                        type="checkbox"
                                        className="w-3.5 h-3.5 rounded border-slate-300 text-slate-500 focus:ring-slate-500 cursor-pointer accent-slate-500"
                                        checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                                <th className="px-4 py-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleSort('name')}
                                        className="-ml-3 h-8 hover:bg-slate-50 text-slate-500 font-medium text-xs gap-2 normal-case"
                                    >
                                        Producto
                                        {sortConfig.key === 'name' ? (
                                            sortConfig.direction === 'asc' ? (
                                                <ArrowUp className="h-3.5 w-3.5 text-slate-900" />
                                            ) : (
                                                <ArrowDown className="h-3.5 w-3.5 text-slate-900" />
                                            )
                                        ) : (
                                            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                                        )}
                                    </Button>
                                </th>
                                <th className="px-4 py-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleSort('category')}
                                        className="-ml-3 h-8 hover:bg-slate-50 text-slate-500 font-medium text-xs gap-2 normal-case"
                                    >
                                        Categoría
                                        <ArrowUpDown className="h-3.5 w-3.5" />
                                    </Button>
                                </th>
                                <th className="px-4 py-1 text-center">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleSort('stock')}
                                        className="h-8 hover:bg-slate-50 text-slate-500 font-medium text-xs gap-2 normal-case"
                                    >
                                        Inventario
                                        <ArrowUpDown className="h-3.5 w-3.5" />
                                    </Button>
                                </th>
                                <th className="px-4 py-1 text-right">
                                    <div className="flex items-center justify-end gap-2 text-slate-500 font-medium">
                                        Coste
                                        <DollarSign className="w-3.5 h-3.5" />
                                    </div>
                                </th>
                                <th className="px-4 py-1 text-right">
                                    <div className="flex items-center justify-end gap-2 text-slate-500 font-medium">
                                        Precio de Venta
                                        <TrendingUp className="w-3.5 h-3.5" />
                                    </div>
                                </th>
                                <th className="px-4 py-1 text-right">
                                    <div className="flex items-center justify-end gap-2 text-slate-500 font-medium">
                                        Valor Inventario
                                        <Coins className="w-3.5 h-3.5" />
                                    </div>
                                </th>
                                <th className="px-4 py-1 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {paginatedProducts.map((product, index) => {
                                const isSelected = selectedProducts.includes(product.id)
                                const isWeighted = product.useWeightedCost && (product.weightedCost ?? 0) > 0
                                const displayCostUsd = isWeighted
                                    ? (product.weightedCost ?? 0)
                                    : product.costUsd || (product.costCup / usdRate)
                                const saleUsdDynamic = product.saleCup / usdRate
                                const valorCup = (isWeighted ? displayCostUsd * usdRate : product.costCup) * product.stock
                                const valorUsdDynamic = valorCup / usdRate

                                return (
                                    <tr
                                        key={`prod-row-${product.id || 'missing'}-${index}`}
                                        className={cn("hover:bg-slate-50 transition-colors group cursor-pointer", isSelected && "bg-slate-50")}
                                        onClick={() => handleEditProduct(product)}
                                    >
                                        <td className="pl-4 py-1 align-middle" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                className="w-3.5 h-3.5 rounded border-slate-300 text-slate-500 focus:ring-slate-500 cursor-pointer accent-slate-500"
                                                checked={isSelected}
                                                onChange={() => toggleSelectProduct(product.id)}
                                            />
                                        </td>
                                        <td className="px-4 py-1 align-middle">
                                            <span className="font-medium text-slate-900 text-sm">{product.name}</span>
                                        </td>
                                        <td className="px-4 py-1 align-middle">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-normal bg-slate-100 text-slate-800">
                                                {product.category}
                                            </span>
                                        </td>
                                        <td className="px-4 py-1 align-middle text-center">
                                            <div className="flex justify-center">
                                                <ProductStatusBadge
                                                    status={product.stock === 0 ? "out_of_stock" : product.stock <= (product.lowStockThreshold || 10) ? "low_stock" : "in_stock"}
                                                    quantity={product.stock}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-4 py-1 align-middle text-right">
                                            <div className="flex flex-col items-end">
                                                <div className="flex items-center gap-1.5" title={isWeighted ? 'Coste ponderado de compras históricas' : undefined}>
                                                    {isWeighted && (
                                                        <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-blue-100 text-blue-600" title="Coste ponderado">
                                                            <Calculator className="w-2 h-2" />
                                                        </span>
                                                    )}
                                                    <span className={cn("font-medium text-sm", isWeighted ? "text-blue-700" : "text-slate-800")}>${displayCostUsd.toFixed(2)}</span>
                                                </div>
                                                {showCup && <span className="text-xs text-slate-500">{(displayCostUsd * usdRate).toLocaleString('es-ES', { style: 'currency', currency: 'CUP', maximumFractionDigits: 0 })}</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-1 align-middle text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="font-medium text-emerald-600 text-sm">${saleUsdDynamic.toFixed(2)}</span>
                                                {showCup && <span className="text-xs text-slate-500">{product.saleCup.toLocaleString('es-ES', { style: 'currency', currency: 'CUP', maximumFractionDigits: 0 })}</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-1 align-middle text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="font-medium text-slate-800 text-sm">${valorUsdDynamic.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                {showCup && <span className="text-xs text-slate-500">{valorCup.toLocaleString('es-ES', { style: 'currency', currency: 'CUP', maximumFractionDigits: 0 })}</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-1 align-middle text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-lime-300 transition-colors">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 bg-white border-slate-100 shadow-md">
                                                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => handleEditProduct(product)} className="cursor-pointer hover:bg-slate-50 focus:bg-slate-50">
                                                        <Edit className="mr-2 h-4 w-4 text-slate-500" />
                                                        <span>Editar</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => handleDeleteClick(product)}
                                                        className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer hover:bg-red-50"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        <span>Eliminar</span>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                    {paginatedProducts.map((product, index) => {
                        const isSelected = selectedProducts.includes(product.id)
                        const isWeighted = product.useWeightedCost && (product.weightedCost ?? 0) > 0
                        const displayCostUsd = isWeighted
                            ? (product.weightedCost ?? 0)
                            : product.costUsd || (product.costCup / usdRate)
                        const saleUsdDynamic = product.saleCup / usdRate
                        const valorCup = (isWeighted ? displayCostUsd * usdRate : product.costCup) * product.stock
                        const valorUsdDynamic = valorCup / usdRate

                        return (
                            <div key={`prod-mob-${product.id || 'missing'}-${index}`} className={cn("bg-white border rounded-xl p-3 shadow-sm space-y-2", isSelected ? "border-slate-900 ring-1 ring-slate-900" : "border-slate-100")}>
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-slate-300 text-slate-500 focus:ring-slate-500 cursor-pointer accent-slate-500"
                                            checked={isSelected}
                                            onChange={() => toggleSelectProduct(product.id)}
                                        />
                                        <div>
                                            <h4 className="font-semibold text-slate-700 text-sm">{product.name}</h4>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-medium border border-slate-200">
                                                    {product.category}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 -mr-2">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                            <DropdownMenuItem onClick={() => handleEditProduct(product)}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                <span>Editar</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => handleDeleteClick(product)}
                                                className="text-red-600"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                <span>Eliminar</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <div className="pt-3">
                                    <div className="grid grid-cols-2 gap-3 mb-3 p-3 bg-slate-50 rounded-xl border border-slate-100 items-center text-center divide-x divide-slate-200">
                                        <div className="flex flex-col items-center">
                                            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1.5 flex items-center justify-center w-full">Stock</span>
                                            <div className="flex justify-center w-full">
                                                <ProductStatusBadge
                                                    status={product.stock === 0 ? "out_of_stock" : product.stock <= (product.lowStockThreshold || 10) ? "low_stock" : "in_stock"}
                                                    quantity={product.stock}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1 flex items-center justify-center w-full">Valor Total</span>
                                            <div className="flex flex-col items-center">
                                                <span className="font-bold text-slate-900 text-sm">${valorUsdDynamic.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                {showCup && <span className="text-[10px] text-slate-400">{valorCup.toLocaleString('es-ES', { style: 'currency', currency: 'CUP', maximumFractionDigits: 0 })}</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-1 px-1">
                                        <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Coste Unitario</span>
                                                {isWeighted && (
                                                    <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-blue-100 text-blue-600 shrink-0" title="Coste ponderado">
                                                        <Calculator className="w-2 h-2" />
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className={cn("font-semibold text-sm", isWeighted ? "text-blue-700" : "text-slate-700")}>${displayCostUsd.toFixed(2)}</span>
                                                {showCup && <span className="text-[10px] text-slate-400">{(displayCostUsd * usdRate).toLocaleString('es-ES', { style: 'currency', currency: 'CUP', maximumFractionDigits: 0 })}</span>}
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-slate-500 font-medium">Precio Venta</span>
                                            <div className="flex flex-col items-end">
                                                <span className="font-bold text-emerald-600 text-sm">${saleUsdDynamic.toFixed(2)}</span>
                                                {showCup && <span className="text-[10px] text-slate-400">{product.saleCup.toLocaleString('es-ES', { style: 'currency', currency: 'CUP', maximumFractionDigits: 0 })}</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

            </div>

            {/* Mobile Floating Action Button (FAB) - Add Product Only */}
            <div className="fixed bottom-6 right-6 md:hidden z-50">
                <Button
                    onClick={handleAddProduct}
                    className="h-14 w-14 rounded-full shadow-2xl bg-slate-900 hover:bg-slate-800 transition-transform duration-200 p-0"
                >
                    <Plus className="w-6 h-6 text-white" />
                </Button>
            </div>
        </div>
    )
}
