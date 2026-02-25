"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Save, Plus, Trash2, Search, Calendar as CalendarIcon, PackageOpen, User, FileText, Send, Phone, Mail, MapPin } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useInventoryStore } from "@/hooks/use-inventory-store"
import { useQuotesStore, Quote, QuoteItem } from "@/hooks/use-quotes-store"
import { useKitsStore } from "@/hooks/use-kits-store"
import { useCustomersStore } from "@/hooks/use-customers-store"
import { useSettingsStore } from "@/hooks/use-settings-store"
import { cn } from "@/lib/utils"

interface QuoteFormProps {
    isOpen: boolean
    onClose: () => void
    quoteToEdit?: Quote | null
}

export function QuoteForm({ isOpen, onClose, quoteToEdit }: QuoteFormProps) {
    const { products, fetchProducts } = useInventoryStore()
    const { addQuote, updateQuote } = useQuotesStore()
    const { customers, addCustomer, fetchCustomers } = useCustomersStore()
    const { kits } = useKitsStore()
    const { usdRate } = useSettingsStore()

    // Form State
    const [customerId, setCustomerId] = useState("")
    const [date, setDate] = useState<Date>(new Date())
    const [expirationDate, setExpirationDate] = useState<Date>(new Date(new Date().setDate(new Date().getDate() + 15))) // Default 15 days
    const [status, setStatus] = useState<Quote['status']>('draft')
    const [items, setItems] = useState<QuoteItem[]>([])
    const [notes, setNotes] = useState("")
    const [currency, setCurrency] = useState<'USD' | 'CUP'>('USD')
    const [discountType, setDiscountType] = useState<'amount' | 'percentage' | 'fixed_total'>('amount')
    const [discountValue, setDiscountValue] = useState(0)
    const [name, setName] = useState("")

    // Item Selection State
    const [searchTerm, setSearchTerm] = useState("")
    const [isProductDialogOpen, setIsProductDialogOpen] = useState(false)
    const [view, setView] = useState<'search' | 'details'>('search')
    const [selectedProduct, setSelectedProduct] = useState<any>(null)
    const [tempQuantity, setTempQuantity] = useState(1)
    const [tempUnitPrice, setTempUnitPrice] = useState(0)

    // Kit Selection State
    const [isKitDialogOpen, setIsKitDialogOpen] = useState(false)
    const [searchKitTerm, setSearchKitTerm] = useState("")
    const [showProfitability, setShowProfitability] = useState(false)

    // New Customer Modal State
    const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false)
    const [newCustomerName, setNewCustomerName] = useState("")
    const [newCustomerEmail, setNewCustomerEmail] = useState("")
    const [newCustomerPhone, setNewCustomerPhone] = useState("")

    useEffect(() => {
        if (quoteToEdit) {
            setCustomerId(quoteToEdit.customerId)
            setDate(new Date(quoteToEdit.date))
            setExpirationDate(quoteToEdit.expirationDate ? new Date(quoteToEdit.expirationDate) : new Date());
            setStatus(quoteToEdit.status)
            setItems(quoteToEdit.items)
            setNotes(quoteToEdit.notes || "")
            setDiscountType(quoteToEdit.discountType || 'amount')
            setDiscountValue(quoteToEdit.discountValue || 0)
            setName(quoteToEdit.name || "")
        } else {
            setCustomerId("")
            setDate(new Date())
            setExpirationDate(new Date(new Date().setDate(new Date().getDate() + 15)))
            setStatus('draft')
            setItems([])
            setNotes("")
            setDiscountType('amount')
            setDiscountValue(0)
            setName("")
        }
    }, [quoteToEdit, isOpen])

    // Load initial data
    useEffect(() => {
        if (!products || products.length === 0) {
            fetchProducts()
        }
        fetchCustomers()
    }, [products, fetchProducts, fetchCustomers])

    // Filter products for selection
    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleOpenAddProduct = () => {
        setView('search')
        setSearchTerm("")
        setSelectedProduct(null)
        setTempQuantity(1)
        setTempUnitPrice(0)
        setIsProductDialogOpen(true)
    }

    const handleSelectProduct = (product: any) => {
        const existingItem = items.find(i => i.productId === product.id)
        if (existingItem) {
            alert("Ya existe este producto")
            return
        }

        setSelectedProduct(product)
        setTempQuantity(1)
        setTempUnitPrice(product.saleUsd) // Default to Sale Price USD
        setView('details')
    }

    const handleConfirmItem = () => {
        if (!selectedProduct) return

        const newItem: QuoteItem = {
            productId: selectedProduct.id,
            quantity: tempQuantity,
            unitPrice: tempUnitPrice
        }

        const existingIndex = items.findIndex(i => i.productId === selectedProduct.id)
        if (existingIndex >= 0) {
            alert("Ya existe este producto")
            return
        } else {
            setItems([...items, newItem])
        }

        setIsProductDialogOpen(false)
        setSelectedProduct(null)
    }

    const handleRemoveItem = (productId: string) => {
        setItems(items.filter(i => i.productId !== productId))
    }

    const handleUpdateItem = (index: number, field: 'quantity' | 'unitPrice' | 'total', value: number) => {
        const newItems = [...items]
        const item = newItems[index]

        if (field === 'quantity') {
            newItems[index] = { ...item, quantity: value }
        } else if (field === 'unitPrice') {
            newItems[index] = { ...item, unitPrice: value }
        } else if (field === 'total') {
            // Reverse calculate unit price if total is changed
            // If quantity is 0, we can't really do this, but assuming quantity >= 1
            if (item.quantity > 0) {
                newItems[index] = { ...item, unitPrice: value / item.quantity }
            }
        }
        setItems(newItems)
    }



    const handleSelectKit = (kitId: string) => {
        const kit = kits.find(k => k.id === kitId)
        if (!kit) return
        let newItems = [...items]
        // Add base products from kit
        if (kit.products && kit.products.length > 0) {
            kit.products.forEach(kitProduct => {
                const productDetails = products.find(p => p.id === kitProduct.productId)
                if (!productDetails) return

                const existingItemIndex = newItems.findIndex(i => i.productId === kitProduct.productId)

                if (existingItemIndex >= 0) {
                    // Update quantity
                    newItems[existingItemIndex] = {
                        ...newItems[existingItemIndex],
                        quantity: newItems[existingItemIndex].quantity + kitProduct.quantity
                    }
                } else {
                    // Add new item
                    newItems.push({
                        productId: kitProduct.productId,
                        quantity: kitProduct.quantity,
                        unitPrice: productDetails.saleUsd // Default to current price
                    })
                }
            })
            setItems(newItems)
        }
        setIsKitDialogOpen(false)
    }

    const calculateTotal = () => {
        const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0)
        if (discountType === 'percentage') {
            return subtotal - (subtotal * (discountValue / 100))
        } else if (discountType === 'fixed_total') {
            // If fixed total, the total IS the discountValue (assuming discountValue holds the target total)
            // But usually we store the discount amount. 
            // Let's interpret discountValue as the TARGET TOTAL for 'fixed_total' type for simplicity in UI binding
            return discountValue
        } else {
            return Math.max(0, subtotal - discountValue)
        }
    }

    const handleSubmit = () => {
        const quoteData: Quote = {
            id: quoteToEdit?.id || `QT-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
            customerId,
            date: date.toISOString(),
            expirationDate: expirationDate.toISOString(),
            status,
            items,
            totalAmount: calculateTotal(),
            notes,
            discountType,
            discountValue,
            name
        }

        if (quoteToEdit) {
            updateQuote(quoteToEdit.id, quoteData)
        } else {
            addQuote(quoteData)
        }
        onClose()
    }

    const handleCreateCustomer = () => {
        if (!newCustomerName.trim()) return

        const newId = `CUST-${Date.now()}`
        addCustomer({
            id: newId,
            name: newCustomerName,
            email: newCustomerEmail,
            phone: newCustomerPhone,
            status: 'active',
            createdAt: new Date().toISOString()
        })
        setCustomerId(newId)
        setIsNewCustomerModalOpen(false)
        setNewCustomerName("")
        setNewCustomerEmail("")
        setNewCustomerPhone("")
    };







    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6" key="modal-overlay-container">
                    <motion.div
                        key="modal-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                    />

                    <motion.div
                        key="modal-content"
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="bg-white/95 backdrop-blur-3xl w-full md:max-w-6xl md:rounded-2xl rounded-none shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-white/20 flex flex-col h-full md:h-auto md:max-h-[90vh] relative z-10 overflow-hidden ring-1 ring-slate-900/5"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-4 md:px-8 md:py-6 border-b border-slate-100 bg-white/50 shrink-0">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{quoteToEdit ? `Editar Presupuesto #${quoteToEdit.id}` : "Nuevo Presupuesto"}</h2>
                                <p className="text-slate-500 text-sm mt-1 hidden md:block">Crea y gestiona presupuestos para tus clientes.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 bg-slate-50/30">

                            {/* General Info Card */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                <div className="space-y-2">
                                    <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Cliente</Label>
                                    <Select
                                        value={customerId}
                                        onValueChange={(val) => {
                                            if (val === 'new_customer') {
                                                setIsNewCustomerModalOpen(true)
                                            } else {
                                                setCustomerId(val)
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="bg-slate-50/50 border-slate-200 focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-slate-100 transition-all h-10 text-sm font-medium text-slate-700 rounded-xl">
                                            <SelectValue placeholder="Seleccionar cliente" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white border-slate-200 shadow-xl rounded-xl">
                                            {customers.filter(c => c.id && c.id.trim() !== "").map((c, idx) => (
                                                <SelectItem key={`cust-${c.id || idx}-${idx}`} value={c.id} className="text-sm cursor-pointer">{c.name}</SelectItem>
                                            ))}
                                            <SelectItem key="static-new-customer" value="new_customer" className="text-blue-600 font-bold focus:text-blue-700 focus:bg-blue-50 border-t border-slate-100 mt-1 cursor-pointer">
                                                <div className="flex items-center">
                                                    <Plus className="w-3.5 h-3.5 mr-2" />
                                                    Nuevo Cliente
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Nombre del Presupuesto</Label>
                                    <Input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Ej: Instalación Solar Residencial"
                                        className="bg-slate-50/50 border-slate-200 focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-slate-100 transition-all h-10 text-sm font-medium text-slate-700 rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Válido Hasta</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full justify-start text-left font-medium border-slate-200 h-10 bg-slate-50/50 hover:bg-slate-50 text-sm rounded-xl",
                                                    !expirationDate && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                                                {expirationDate ? expirationDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : <span>Seleccionar fecha</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 z-50 bg-white border-slate-100 shadow-xl rounded-xl" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={expirationDate}
                                                onSelect={(d: Date | undefined) => d && setExpirationDate(d)}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Estado</Label>
                                    <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                                        <SelectTrigger className="border-slate-200 focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-slate-100 transition-all h-10 text-sm font-bold rounded-xl">
                                            <SelectValue placeholder="Estado" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white border-slate-200 shadow-xl rounded-xl">
                                            <SelectItem value="draft" className="cursor-pointer">Borrador</SelectItem>
                                            <SelectItem value="sent" className="cursor-pointer">Enviado</SelectItem>
                                            <SelectItem value="accepted" className="cursor-pointer">Aceptado</SelectItem>
                                            <SelectItem value="rejected" className="cursor-pointer">Rechazado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Items Section */}
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                        <span className="bg-slate-100 p-1.5 rounded-md text-slate-500"><PackageOpen className="w-4 h-4" /></span>
                                        Items del Presupuesto
                                    </h3>

                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                                            <button
                                                onClick={() => setCurrency('USD')}
                                                className={cn("px-3 py-1.5 text-[10px] font-bold rounded-md transition-all", currency === 'USD' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                                            >USD</button>
                                            <button
                                                onClick={() => setCurrency('CUP')}
                                                className={cn("px-3 py-1.5 text-[10px] font-bold rounded-md transition-all", currency === 'CUP' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                                            >CUP</button>
                                        </div>

                                        {/* Profitability toggle */}
                                        <button
                                            onClick={() => setShowProfitability(p => !p)}
                                            className={cn(
                                                "flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all",
                                                showProfitability
                                                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                                    : "bg-slate-100 border-transparent text-slate-500 hover:text-slate-700"
                                            )}
                                        >
                                            <span>📊</span> Rentabilidad
                                        </button>

                                        <Button
                                            onClick={() => setIsKitDialogOpen(true)}
                                            variant="outline"
                                            className="bg-white hover:bg-slate-50 shadow-sm h-8 px-3 rounded-lg text-xs font-medium border-slate-200"
                                        >
                                            <PackageOpen className="w-3.5 h-3.5 mr-1.5" />
                                            Cargar Kit
                                        </Button>

                                        <Button
                                            onClick={handleOpenAddProduct}
                                            className="bg-slate-900 text-white hover:bg-slate-800 shadow-sm h-8 px-3 rounded-lg text-xs font-medium"
                                        >
                                            <Plus className="w-3.5 h-3.5 mr-1.5" />
                                            Añadir Producto
                                        </Button>
                                    </div>
                                </div>

                                <div className="border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto shadow-sm bg-white ring-1 ring-900/5">
                                    <Table>
                                        <TableHeader className="bg-slate-50 border-b border-slate-100">
                                            <TableRow className="hover:bg-transparent border-none">
                                                <TableHead className="py-3 pl-6 font-semibold text-[10px] text-slate-500 uppercase tracking-widest w-[40%]">Producto</TableHead>
                                                <TableHead className="py-3 text-center font-semibold text-[10px] text-slate-500 uppercase tracking-widest w-[15%]">Cant</TableHead>
                                                <TableHead className="py-3 text-right font-semibold text-[10px] text-slate-500 uppercase tracking-widest w-[20%]">Precio Unit. ({currency})</TableHead>
                                                <TableHead className="py-3 text-right font-semibold text-[10px] text-slate-500 uppercase tracking-widest w-[20%]">Total ({currency})</TableHead>
                                                <TableHead className="py-3 w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {items.map((item, index) => {
                                                const product = products.find(p => p.id === item.productId)
                                                // If currency is CUP, we display converted values, but main state is logic-agnostic (usually stored in USD or base currency).
                                                // Assuming items store unitPrice in USD effectively or whatever the base is.
                                                // If we want to edit in CUP, we need to convert back to USD for state if state is USD.
                                                // Let's assume state is always USD for now to keep sanity, or whatever the 'unitPrice' represents.

                                                const currentRate = currency === 'CUP' ? usdRate : 1

                                                return (
                                                    <TableRow key={`item-${item.productId || index}-${index}`} className="hover:bg-slate-50/60 border-b border-slate-50 transition-colors">
                                                        <TableCell className="pl-6 py-3">
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-slate-900 text-sm truncate max-w-[200px]" title={product?.name}>{product?.name || item.productId}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center py-3">
                                                            <Input
                                                                type="number"
                                                                min="1"
                                                                className="h-8 w-20 text-center mx-auto bg-slate-50 hover:bg-white focus:bg-white transition-all border-slate-200 font-bold text-slate-700"
                                                                value={item.quantity}
                                                                onChange={(e) => handleUpdateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-right py-3">
                                                            <div className="relative flex flex-col items-end gap-1">
                                                                <Input
                                                                    type="number"
                                                                    step="0.01"
                                                                    className="h-8 w-28 text-right bg-slate-50 hover:bg-white focus:bg-white transition-all border-slate-200 font-medium text-slate-600 params-input [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                    value={currency === 'USD' ? item.unitPrice : (item.unitPrice * usdRate).toFixed(2)}
                                                                    onChange={(e) => {
                                                                        const val = parseFloat(e.target.value) || 0
                                                                        // Convert back to base if needed, assuming base is USD
                                                                        const baseVal = currency === 'CUP' ? val / usdRate : val
                                                                        handleUpdateItem(index, 'unitPrice', baseVal)
                                                                    }}
                                                                />
                                                                {showProfitability && product && (() => {
                                                                    const costBase = (product.useWeightedCost && product.weightedCost) ? product.weightedCost : product.costUsd
                                                                    const priceUsd = item.unitPrice
                                                                    const profit = priceUsd - costBase
                                                                    const margin = priceUsd > 0 ? (profit / priceUsd) * 100 : 0
                                                                    return (
                                                                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold ring-1 ring-inset ${margin >= 20 ? 'bg-emerald-50 text-emerald-700 ring-emerald-500/20' : margin >= 0 ? 'bg-amber-50 text-amber-700 ring-amber-500/20' : 'bg-rose-50 text-rose-700 ring-rose-500/20'}`}>
                                                                            {margin.toFixed(0)}%
                                                                        </span>
                                                                    )
                                                                })()}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right py-3 font-bold text-slate-900 text-sm">
                                                            <div className="relative flex items-center justify-end">
                                                                <Input
                                                                    type="number"
                                                                    step="0.01"
                                                                    className="h-8 w-28 text-right bg-slate-50 hover:bg-white focus:bg-white transition-all border-slate-200 font-bold text-slate-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                    value={currency === 'USD' ? (item.unitPrice * item.quantity).toFixed(2) : ((item.unitPrice * item.quantity) * usdRate).toFixed(2)}
                                                                    onChange={(e) => {
                                                                        const val = parseFloat(e.target.value) || 0
                                                                        // Convert back to base total
                                                                        const baseVal = currency === 'CUP' ? val / usdRate : val
                                                                        handleUpdateItem(index, 'total', baseVal)
                                                                    }}
                                                                />
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-3 pr-4 text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleRemoveItem(item.productId)}
                                                                className="h-8 w-8 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                            {items.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="h-48 text-center">
                                                        <div className="flex flex-col items-center justify-center space-y-3 opacity-60">
                                                            <FileText className="w-8 h-8 text-slate-300" />
                                                            <div className="text-slate-500 font-medium">Presupuesto vacío</div>
                                                            <Button variant="link" onClick={handleOpenAddProduct} className="text-blue-600 font-bold">Añadir productos</Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                    {items.length > 0 && (
                                        <div className="bg-slate-50/50 p-4 border-t border-slate-100 flex flex-col items-end gap-3">
                                            <div className="flex items-center gap-12 text-sm text-slate-500">
                                                <span>Subtotal</span>
                                                <span>
                                                    {currency === 'USD' ? '$' : ''}
                                                    {(currency === 'USD'
                                                        ? items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0)
                                                        : items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0) * usdRate
                                                    ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <Select value={discountType} onValueChange={(v: any) => setDiscountType(v)}>
                                                    <SelectTrigger className="h-8 w-[130px] text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="amount">Descuento ($)</SelectItem>
                                                        <SelectItem value="percentage">Descuento (%)</SelectItem>
                                                        <SelectItem value="fixed_total">Precio Final</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    className="h-8 w-24 text-right"
                                                    value={discountValue}
                                                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                                                />
                                            </div>

                                            <div className="flex items-center gap-12 pt-2 border-t border-slate-200">
                                                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total</div>
                                                <div className="text-2xl font-bold text-slate-900 tracking-tight">
                                                    {currency === 'USD' ? '$' : ''}
                                                    {(currency === 'USD' ? calculateTotal() : calculateTotal() * usdRate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    <span className="text-sm font-medium text-slate-400 text-base ml-1">{currency}</span>
                                                </div>
                                            </div>

                                            {/* Internal Profitability Summary */}
                                            {showProfitability && (() => {
                                                const profitRows = items.map(item => {
                                                    const prod = products.find(p => p.id === item.productId)
                                                    if (!prod) return null
                                                    const costUsd = (prod.useWeightedCost && prod.weightedCost) ? prod.weightedCost : prod.costUsd
                                                    const lineRevUsd = item.unitPrice * item.quantity
                                                    const lineCostUsd = costUsd * item.quantity
                                                    const profit = lineRevUsd - lineCostUsd
                                                    const margin = lineRevUsd > 0 ? (profit / lineRevUsd) * 100 : 0
                                                    return { name: prod.name, profit, margin }
                                                }).filter(Boolean) as { name: string; profit: number; margin: number }[]

                                                const totalRevUsd = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
                                                const totalCostUsd = items.reduce((s, i) => {
                                                    const prod = products.find(p => p.id === i.productId)
                                                    const c = prod ? ((prod.useWeightedCost && prod.weightedCost) ? prod.weightedCost : prod.costUsd) : 0
                                                    return s + c * i.quantity
                                                }, 0)
                                                const totalProfit = totalRevUsd - totalCostUsd
                                                const totalMargin = totalRevUsd > 0 ? (totalProfit / totalRevUsd) * 100 : 0
                                                const sym = currency === 'CUP' ? '₱' : '$'
                                                const rate = currency === 'CUP' ? usdRate : 1

                                                return (
                                                    <div className="w-full border-t border-dashed border-emerald-100 pt-3 space-y-2">
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">📊 Rentabilidad Interna</p>
                                                        <div className="space-y-1.5 w-full">
                                                            {profitRows.map((row, i) => (
                                                                <div key={i} className="flex justify-between items-center text-xs">
                                                                    <span className="text-slate-500 truncate max-w-[200px]">{row.name}</span>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={row.profit >= 0 ? 'text-emerald-600 font-medium' : 'text-rose-500 font-medium'}>
                                                                            {sym}{(row.profit * rate).toFixed(2)}
                                                                        </span>
                                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${row.margin >= 20 ? 'bg-emerald-50 text-emerald-700' : row.margin >= 0 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
                                                                            {row.margin.toFixed(0)}%
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="flex justify-between items-center text-xs font-bold pt-2 border-t border-slate-100">
                                                            <span className="text-slate-600">Beneficio total</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className={totalProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                                                                    {sym}{(totalProfit * rate).toFixed(2)}
                                                                </span>
                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${totalMargin >= 20 ? 'bg-emerald-100 text-emerald-800' : totalMargin >= 0 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                                                                    {totalMargin.toFixed(1)}%
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 md:p-6 border-t border-slate-100 bg-white flex justify-between items-center shrink-0">
                            <Button variant="ghost" onClick={onClose} className="h-11 px-6 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 font-medium">
                                Cancelar
                            </Button>
                            <Button onClick={handleSubmit} className="h-11 px-8 bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20 rounded-xl font-bold tracking-wide">
                                <Save className="w-4 h-4 mr-2" />
                                Guardar Presupuesto
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Add Product Dialog */}
            <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0">
                    <DialogHeader className="p-4 bg-slate-50 border-b border-slate-100">
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            {view === 'search' ? (
                                <>
                                    <Search className="w-4 h-4 text-slate-500" />
                                    Seleccionar Producto
                                </>
                            ) : (
                                <>
                                    <PackageOpen className="w-4 h-4 text-slate-500" />
                                    Detalles del Ítem
                                </>
                            )}
                        </DialogTitle>
                    </DialogHeader>

                    {view === 'search' ? (
                        <div className="flex flex-col h-[400px]">
                            <div className="p-3 border-b border-slate-100 bg-white sticky top-0 z-10">
                                <Input
                                    placeholder="Buscar por nombre..."
                                    className="h-10 bg-slate-50 border-transparent focus:bg-white focus:border-slate-300 transition-all text-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-slate-50/30">
                                {filteredProducts.map((product, index) => (
                                    <button
                                        key={`prod-${product.id || index}-${index}`}
                                        onClick={() => handleSelectProduct(product)}
                                        className="w-full text-left p-3 rounded-xl bg-white border border-slate-100 hover:border-blue-200 hover:shadow-sm transition-all flex items-center justify-between group"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold text-slate-900 text-sm truncate">{product.name}</h4>
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <span className="font-bold text-slate-700">${product.saleUsd}</span>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 space-y-6">
                            <h3 className="font-bold text-slate-900 text-lg">{selectedProduct?.name}</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Cantidad</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={tempQuantity}
                                        onChange={(e) => setTempQuantity(parseInt(e.target.value) || 0)}
                                        className="h-11 text-lg font-bold text-center"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Precio Unit. (USD)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={tempUnitPrice}
                                        onChange={(e) => setTempUnitPrice(parseFloat(e.target.value) || 0)}
                                        className="h-11 text-lg font-bold text-right"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button variant="outline" onClick={() => setView('search')} className="flex-1 h-11">Atrás</Button>
                                <Button onClick={handleConfirmItem} className="flex-[2] bg-slate-900 text-white h-11">Añadir</Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Select Kit Dialog */}
            <Dialog open={isKitDialogOpen} onOpenChange={setIsKitDialogOpen}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0">
                    <DialogHeader className="p-4 bg-slate-50 border-b border-slate-100">
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <PackageOpen className="w-4 h-4 text-slate-500" />
                            Cargar Kit
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col h-[400px]">
                        <div className="p-3 border-b border-slate-100 bg-white sticky top-0 z-10">
                            <Input
                                placeholder="Buscar kit..."
                                className="h-10 bg-slate-50 border-transparent focus:bg-white focus:border-slate-300 transition-all text-sm"
                                value={searchKitTerm}
                                onChange={(e) => setSearchKitTerm(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-slate-50/30">
                            {kits.filter(k => k.name.toLowerCase().includes(searchKitTerm.toLowerCase())).map((kit, index) => (
                                <button
                                    key={`kit-${kit.id || index}-${index}`}
                                    onClick={() => handleSelectKit(kit.id)}
                                    className="w-full text-left p-3 rounded-xl bg-white border border-slate-100 hover:border-blue-200 hover:shadow-sm transition-all flex items-center justify-between group"
                                >
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-slate-900 text-sm truncate">{kit.name}</h4>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                            <span className="font-medium">{kit.products ? kit.products.length : 0} productos base</span>
                                        </div>
                                    </div>
                                    <Plus className="w-4 h-4 text-slate-300 group-hover:text-blue-600" />
                                </button>
                            ))}
                            {kits.length === 0 && (
                                <div className="p-8 text-center text-slate-500 text-sm">
                                    No hay kits creados.
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* New Customer Dialog */}
            <Dialog open={isNewCustomerModalOpen} onOpenChange={setIsNewCustomerModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Nuevo Cliente</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nombre</Label>
                            <Input value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} placeholder="Nombre del cliente" />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input value={newCustomerEmail} onChange={(e) => setNewCustomerEmail(e.target.value)} placeholder="cliente@email.com" />
                        </div>
                        <div className="space-y-2">
                            <Label>Teléfono</Label>
                            <Input value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} placeholder="+53 50000000" />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={handleCreateCustomer}>Crear Cliente</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </AnimatePresence>
    )
}
