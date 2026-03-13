"use client"

import { useState, useEffect, useMemo, Fragment } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Save, Plus, Trash2, Search, Calendar as CalendarIcon, PackageOpen, CheckCircle2, Circle, FileText, PackageCheck, Send, Wallet, Banknote, CreditCard, ArrowRight, MoreHorizontal, ChevronLeft, Printer, Download } from "lucide-react"

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
    DialogFooter,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useInventoryStore } from "@/hooks/use-inventory-store"
import { useOrdersStore, Order, OrderItem } from "@/hooks/use-orders-store"
import { useKitsStore, Kit } from "@/hooks/use-kits-store"
import { useProvidersStore } from "@/hooks/use-providers-store"
import { useSettingsStore } from "@/hooks/use-settings-store"
import { useAccountsStore } from "@/hooks/use-accounts-store"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { KitConfigurationWizard } from "./kit-configuration-wizard"
import { AddProductModal } from "@/components/admin/add-product-modal"
import { OrderReceipt } from "./order-receipt"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface OrderFormProps {
    orderToEdit?: Order | null
}

export function OrderForm({ orderToEdit }: OrderFormProps) {
    const router = useRouter()
    const { products, updateProduct, fetchProducts, isLoading: isInventoryLoading } = useInventoryStore()

    useEffect(() => {
        if (products.length === 0 && !isInventoryLoading) {
            fetchProducts();
        }
    }, [products.length, isInventoryLoading, fetchProducts]);

    const { addOrder, updateOrder, receiveOrder } = useOrdersStore()
    const { providers, addProvider, fetchProviders } = useProvidersStore()
    const { accounts, addMovement } = useAccountsStore()
    const { usdRate } = useSettingsStore()

    // Load initial providers
    useEffect(() => {
        if (!providers || providers.length === 0) {
            fetchProviders()
        }
    }, [providers, fetchProviders])

    // Form State
    const [providerId, setProviderId] = useState("")
    const [date, setDate] = useState<Date>(new Date())
    const [status, setStatus] = useState<Order['status']>('draft')
    const [items, setItems] = useState<OrderItem[]>([])
    const [notes, setNotes] = useState("")
    const [currency, setCurrency] = useState<'USD' | 'CUP'>('USD')

    // Payment State
    const [isPaymentEnabled, setIsPaymentEnabled] = useState(false)
    const [selectedAccountId, setSelectedAccountId] = useState<string>("")
    const [paymentAmount, setPaymentAmount] = useState<string>("")

    // Derived State
    const selectedAccount = useMemo(() => accounts.find(a => a.id === selectedAccountId), [accounts, selectedAccountId])

    // Auto-calculate payment amount when account changes
    useEffect(() => {
        if (!isPaymentEnabled || !selectedAccount) return

        // Calculate Total in USD
        const totalUsd = items.reduce((acc, item) => acc + (item.quantity * item.unitCost), 0)

        let amount = 0
        if (selectedAccount.currency === 'USD') {
            amount = totalUsd
        } else {
            // Convert to CUP
            amount = totalUsd * usdRate
        }

        setPaymentAmount(amount.toFixed(2))
    }, [isPaymentEnabled, selectedAccountId, items, usdRate])

    useEffect(() => {
        if (accounts.length > 0 && !selectedAccountId) {
            setSelectedAccountId(accounts[0].id)
        }
    }, [accounts])

    // Item Selection State
    const [searchTerm, setSearchTerm] = useState("")

    // New Add/Edit Product Dialog State
    const [isProductDialogOpen, setIsProductDialogOpen] = useState(false)
    const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false)
    const [savedOrder, setSavedOrder] = useState<Order | null>(null)
    const [isReceiptOpen, setIsReceiptOpen] = useState(false)
    const [view, setView] = useState<'search' | 'details'>('search')
    const [selectedProduct, setSelectedProduct] = useState<any>(null) // Using any or specific Product type
    const [tempQuantity, setTempQuantity] = useState(1)
    const [tempUnitCost, setTempUnitCost] = useState(0)

    // New Provider Modal State
    const [isNewProviderModalOpen, setIsNewProviderModalOpen] = useState(false)
    const [newProviderName, setNewProviderName] = useState("")
    const [newProviderEmail, setNewProviderEmail] = useState("")
    const [newProviderPhone, setNewProviderPhone] = useState("")

    useEffect(() => {
        if (orderToEdit) {
            setProviderId(orderToEdit.providerId || "")
            setDate(new Date(orderToEdit.date))
            setStatus(orderToEdit.status)
            setItems(orderToEdit.items)
            setNotes(orderToEdit.notes || "")
            if (orderToEdit.paymentStatus === 'paid') {
                setIsPaymentEnabled(false) // Or true if we want to show it's paid? logic was 'disabled' if paid.
            }
        } else {
            setProviderId("")
            setDate(new Date())
            setStatus('draft')
            setItems([])
            setNotes("")
            setIsPaymentEnabled(false)
        }
    }, [orderToEdit])

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
        setTempUnitCost(0)
        setIsProductDialogOpen(true)
    }

    const handleSelectProduct = (product: any) => {
        setSelectedProduct(product)
        const existingItem = items.find(i => i.productId === product.id)
        if (existingItem) {
            setTempQuantity(existingItem.quantity)
            setTempUnitCost(existingItem.unitCost)
        } else {
            setTempQuantity(1)
            setTempUnitCost(product.costUsd)
        }
        setView('details')
    }

    const handleEditItem = (item: OrderItem) => {
        const product = products.find(p => p.id === item.productId)
        if (product) {
            setSelectedProduct(product)
            setTempQuantity(item.quantity)
            setTempUnitCost(item.unitCost)
            setView('details')
            setIsProductDialogOpen(true)
        }
    }

    const handleConfirmItem = () => {
        if (!selectedProduct) return

        const newItem: OrderItem = {
            productId: selectedProduct.id,
            quantity: tempQuantity,
            unitCost: tempUnitCost
        }

        const existingIndex = items.findIndex(i => i.productId === selectedProduct.id)
        if (existingIndex >= 0) {
            const newItems = [...items]
            newItems[existingIndex] = newItem
            setItems(newItems)
        } else {
            setItems([...items, newItem])
        }

        setIsProductDialogOpen(false)
        setSelectedProduct(null)
    }

    const handleUpdateItem = (productId: string, field: 'quantity' | 'unitCost', value: number) => {
        setItems(items.map(i => i.productId === productId ? { ...i, [field]: value } : i))
    }

    const handleRemoveItem = (productId: string) => {
        setItems(items.filter(i => i.productId !== productId))
    }

    // Kit Selection Logic
    const { kits } = useKitsStore()
    const [selectedKitForConfig, setSelectedKitForConfig] = useState<Kit | null>(null)
    const [kitSearchTerm, setKitSearchTerm] = useState("")

    const handleSelectKit = (kit: Kit) => {
        if (kit.attributes && kit.attributes.length > 0) {
            setSelectedKitForConfig(kit)
        } else {
            // Direct add if no attributes
            addKitToOrder(kit.products.map(p => ({ productId: p.productId, quantity: p.quantity })))
        }
    }

    const handleConfirmKitConfig = (products: { productId: string; quantity: number }[]) => {
        addKitToOrder(products)
        setSelectedKitForConfig(null) // Close the kit config dialog
    }

    const addKitToOrder = (kitProducts: { productId: string; quantity: number }[]) => {
        // Iterate through kit products and add/update them in the order items
        const newItems = [...items]

        kitProducts.forEach((kitProduct) => {
            const product = products.find(p => p.id === kitProduct.productId)
            if (!product) return

            const existingIndex = newItems.findIndex(i => i.productId === kitProduct.productId)

            if (existingIndex >= 0) {
                // Update quantity of existing item
                newItems[existingIndex] = {
                    ...newItems[existingIndex],
                    quantity: newItems[existingIndex].quantity + kitProduct.quantity
                }
            } else {
                // Add new item
                newItems.push({
                    productId: kitProduct.productId,
                    quantity: kitProduct.quantity,
                    unitCost: product.costUsd // Use current product cost
                })
            }
        })

        setItems(newItems)
    }

    const calculateTotal = () => {
        return items.reduce((acc, item) => acc + (item.quantity * item.unitCost), 0)
    }

    const handleSubmit = async (targetStatus?: Order['status']) => {
        if (!providerId) {
            toast.error("Debes seleccionar un proveedor")
            return
        }

        const finalStatus = typeof targetStatus === 'string' ? targetStatus : status

        const orderPayload: Partial<Order> = {
            providerId, // Use the ID
            date: date.toISOString(),
            status: finalStatus,
            items,
            notes,
            paymentStatus: (isPaymentEnabled && selectedAccountId) ? 'paid' : orderToEdit?.paymentStatus || 'unpaid',
            paymentAccountId: (isPaymentEnabled && selectedAccountId) ? selectedAccountId : orderToEdit?.paymentAccountId,
            paymentDate: (isPaymentEnabled && selectedAccountId) ? new Date().toISOString() : orderToEdit?.paymentDate
        }

        if (isPaymentEnabled && selectedAccountId && (!orderToEdit || orderToEdit.paymentStatus !== 'paid')) {
            const acc = accounts.find(a => a.id === selectedAccountId)
            if (acc) {
                const amountVal = parseFloat(paymentAmount)
                addMovement({
                    id: `MOV-${Date.now()}`,
                    accountId: acc.id,
                    date: new Date().toISOString(),
                    description: `Pago Compra`,
                    amount: -Math.abs(amountVal),
                    type: 'expense',
                    category: 'Compra'
                })
            }
        }

        if (orderToEdit) {
            // IMPORTANT: call receiveOrder FIRST (before updateOrder changes the status),
            // otherwise receivePurchaseOrder's "already received" guard will block the stock update.
            if (finalStatus === 'received' && orderToEdit.status !== 'received') {
                await receiveOrder(orderToEdit.id, new Date().toISOString())
            }
            await updateOrder(orderToEdit.id, orderPayload)
            toast.success("Compra actualizada correctamente")
            const updatedOrder = { ...orderToEdit, ...orderPayload } as Order
            setSavedOrder(updatedOrder)
            setIsReceiptOpen(true)
        } else {
            const newId = await addOrder(orderPayload)
            toast.success("Compra creada correctamente")
            if (newId) {
                const newOrder: Order = { id: newId, ...orderPayload, supplier: providerId, totalAmount: calculateTotal() } as Order
                setSavedOrder(newOrder)
                setIsReceiptOpen(true)
            } else {
                router.push('/orders')
            }
        }
        router.refresh()
    }

    const handleReceiveOrder = async () => {
        if (!orderToEdit) return
        await receiveOrder(orderToEdit.id, new Date().toISOString())
        toast.success("Inventario actualizado")
        const updatedOrder = { ...orderToEdit, status: 'received' as const }
        setSavedOrder(updatedOrder)
        setIsReceiptOpen(true)
        router.refresh()
    }

    const handleCreateProvider = async () => {
        if (!newProviderName.trim()) return

        const newId = await addProvider({
            name: newProviderName,
            email: newProviderEmail,
            phone: newProviderPhone
        })

        if (newId) {
            setProviderId(newId)
            setIsNewProviderModalOpen(false)
            setNewProviderName("")
            setNewProviderEmail("")
            setNewProviderPhone("")
        }
    };

    const handleCancel = () => {
        router.push('/orders')
    }

    return (
        <div className="space-y-6 pb-24 relative">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                        {orderToEdit ? `Editar Compra #${orderToEdit.id}` : "Nueva Compra"}
                    </h1>
                    <p className="text-slate-500 text-sm hidden md:block">Gestiona los detalles y productos de la compra.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* General Info Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Detalles Generales</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Proveedor</Label>
                                <Select
                                    value={providerId}
                                    onValueChange={(val) => {
                                        if (val === 'new_provider') {
                                            setIsNewProviderModalOpen(true)
                                        } else {
                                            setProviderId(val)
                                        }
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar proveedor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {providers.filter(p => p.id && p.id.trim() !== "").map((p) => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                        <SelectItem value="new_provider" className="text-blue-600 font-medium border-t border-slate-100 mt-1">
                                            <Plus className="w-4 h-4 mr-2 inline" />
                                            Nuevo Proveedor
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Fecha</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !date && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date ? date.toLocaleDateString('es-ES') : <span>Seleccionar fecha</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={date}
                                            onSelect={(d: Date | undefined) => d && setDate(d)}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Items Section */}
                    <Card>
                        <CardHeader className="px-6 py-4 border-b border-slate-100">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <CardTitle className="text-base font-semibold">Productos</CardTitle>
                                <div className="flex items-center gap-3">
                                    {/* Currency Toggle */}
                                    <div className="flex items-center bg-slate-100 rounded-lg p-1">
                                        <button
                                            onClick={() => setCurrency('USD')}
                                            className={cn(
                                                "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                                currency === 'USD' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                            )}
                                        >
                                            USD
                                        </button>
                                        <button
                                            onClick={() => setCurrency('CUP')}
                                            className={cn(
                                                "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                                currency === 'CUP' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                            )}
                                        >
                                            CUP
                                        </button>
                                    </div>

                                    {status !== 'received' && (
                                        <div className="flex gap-2">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" size="sm" className="h-8 border-dashed border-slate-300 text-slate-600 hover:text-slate-900 bg-white">
                                                        <PackageOpen className="w-3.5 h-3.5 mr-2" />
                                                        Cargar Kit
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent align="end" className="w-[300px] p-0">
                                                    <div className="p-3 border-b bg-slate-50/50">
                                                        <div className="relative">
                                                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                                                            <Input
                                                                placeholder="Buscar kit..."
                                                                className="pl-9 h-9"
                                                                value={kitSearchTerm}
                                                                onChange={(e) => setKitSearchTerm(e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="max-h-[300px] overflow-y-auto p-1">
                                                        {kits.filter(k => k.name.toLowerCase().includes(kitSearchTerm.toLowerCase()) && (k.type === 'purchase' || !k.type)).length > 0 ? (
                                                            kits.filter(k => k.name.toLowerCase().includes(kitSearchTerm.toLowerCase()) && (k.type === 'purchase' || !k.type)).map((kit) => (
                                                                <button
                                                                    key={kit.id}
                                                                    onClick={() => handleSelectKit(kit)}
                                                                    className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-100 transition-colors flex flex-col gap-0.5 text-sm"
                                                                >
                                                                    <span className="font-medium text-slate-900">{kit.name}</span>
                                                                    <div className="flex justify-between items-center text-xs text-slate-500">
                                                                        <span>{kit.products.length} productos</span>
                                                                        <span>${kit.basePrice}</span>
                                                                    </div>
                                                                </button>
                                                            ))
                                                        ) : (
                                                            <div className="py-8 text-center text-slate-500 text-sm">
                                                                No se encontraron kits
                                                            </div>
                                                        )}
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="p-0">
                            <KitConfigurationWizard
                                kit={selectedKitForConfig}
                                isOpen={!!selectedKitForConfig}
                                onClose={() => setSelectedKitForConfig(null)}
                                onConfirm={handleConfirmKitConfig}
                            />

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
                                                    Detalles del Producto
                                                </>
                                            )}
                                        </DialogTitle>
                                    </DialogHeader>

                                    {view === 'search' ? (
                                        <div className="flex flex-col h-[60vh] sm:h-[400px]">
                                            <div className="p-3 border-b border-slate-100 bg-white sticky top-0 z-10">
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <Input
                                                        placeholder="Buscar por nombre o ID..."
                                                        className="pl-9 h-10 bg-slate-50 border-transparent focus:bg-white focus:border-slate-300 transition-all text-sm"
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        autoFocus
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-slate-50/30">
                                                {filteredProducts.length > 0 ? (
                                                    filteredProducts.map((product, prodIdx) => {
                                                        const hasStock = product.stock > 0
                                                        const currentItem = items.find(i => i.productId === product.id)

                                                        return (
                                                            <button
                                                                key={product.id || `prod-${prodIdx}`}
                                                                onClick={() => handleSelectProduct(product)}
                                                                className="w-full text-left p-3 rounded-xl bg-white border border-slate-100 hover:border-blue-200 hover:shadow-sm transition-all flex items-center justify-between group"
                                                            >
                                                                <div className="flex items-center gap-3 overflow-hidden">
                                                                    <div className={cn(
                                                                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border",
                                                                        hasStock ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-slate-50 border-slate-100 text-slate-300"
                                                                    )}>
                                                                        <PackageOpen className="w-5 h-5" />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <h4 className="font-semibold text-slate-900 text-sm truncate">{product.name}</h4>
                                                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                                                            <span className={cn("font-medium", hasStock ? "text-emerald-600" : "text-slate-400")}>
                                                                                {product.stock} disp.
                                                                            </span>
                                                                            <span>•</span>
                                                                            <span className="text-slate-400 truncate">{product.category || 'Sin categoría'}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {currentItem && (
                                                                    <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100 shrink-0 ml-2">
                                                                        En orden
                                                                    </span>
                                                                )}
                                                                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors ml-2" />
                                                            </button>
                                                        )
                                                    })
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
                                                        <Search className="w-8 h-8 mb-2 opacity-50" />
                                                        <p className="text-sm">No se encontraron productos</p>
                                                    </div>
                                                )}
                                            </div>
                                            {/* Create new product button */}
                                            <div className="p-3 border-t border-slate-100 bg-white">
                                                <button
                                                    onClick={() => {
                                                        setIsProductDialogOpen(false)
                                                        setIsAddProductModalOpen(true)
                                                    }}
                                                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 hover:border-slate-900 hover:text-slate-900 hover:bg-slate-50 transition-all text-sm font-medium"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                    Crear nuevo producto
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-6">
                                            <div className="flex flex-col items-center text-center mb-8">
                                                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-slate-100">
                                                    <PackageOpen className="w-8 h-8 text-slate-400" />
                                                </div>
                                                <h3 className="font-bold text-slate-900 text-xl mb-1">{selectedProduct?.name}</h3>
                                                <p className="text-xs text-slate-400 font-mono bg-slate-50 px-2 py-1 rounded-md">{selectedProduct?.id}</p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-6 mb-8">
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cantidad</Label>
                                                    <div className="relative group">
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            value={tempQuantity}
                                                            onChange={(e) => setTempQuantity(parseInt(e.target.value) || 0)}
                                                            className="h-14 text-2xl font-bold text-center border-slate-200 focus:border-slate-900 transition-all bg-transparent focus:ring-0"
                                                        />
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300 uppercase tracking-wider pointer-events-none group-focus-within:text-slate-400 transition-colors">
                                                            UNID
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Costo Unit.</Label>
                                                    <div className="relative group">
                                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-300 text-lg group-focus-within:text-slate-900 transition-colors">
                                                            {currency === 'USD' ? '$' : 'CUP'}
                                                        </div>
                                                        <Input
                                                            type="number"
                                                            step="1"
                                                            min="0"
                                                            value={currency === 'USD' ? tempUnitCost : tempUnitCost * usdRate}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value) || 0
                                                                setTempUnitCost(currency === 'USD' ? val : val / usdRate)
                                                            }}
                                                            className="h-14 text-2xl font-bold text-right pr-4 pl-10 border-slate-200 focus:border-slate-900 transition-all bg-transparent focus:ring-0"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                                                <span className="text-slate-500 font-medium text-sm">Total Estimado</span>
                                                <span className="text-3xl font-bold text-slate-900 tracking-tight">
                                                    {currency === 'USD' ? '$' : ''}
                                                    {(tempQuantity * (currency === 'USD' ? tempUnitCost : tempUnitCost * usdRate)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    {currency === 'CUP' ? <span className="text-sm font-bold text-slate-400 ml-1">CUP</span> : ''}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <Button variant="outline" onClick={() => setView('search')} className="h-12 rounded-xl text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all">
                                                    Atrás
                                                </Button>
                                                <div className="flex flex-col gap-1">
                                                    {tempUnitCost <= 0 && (
                                                        <p className="text-xs text-amber-600 text-center font-medium">El costo no puede ser 0</p>
                                                    )}
                                                    <Button
                                                        onClick={handleConfirmItem}
                                                        disabled={tempUnitCost <= 0 || tempQuantity <= 0}
                                                        className="h-12 rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/10 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                                                    >
                                                        {items.some(i => i.productId === selectedProduct?.id) ? 'Guardar Cambios' : 'Añadir Producto'}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </DialogContent>
                            </Dialog>

                            {/* Mobile View (Cards) */}
                            <div className="md:hidden space-y-0 px-4">
                                {items.map((item, itemIdx) => {
                                    const product = products.find(p => p.id === item.productId)
                                    // Calculate display values based on currency
                                    const displayUnitCost = currency === 'USD' ? item.unitCost : item.unitCost * usdRate
                                    const displayTotal = displayUnitCost * item.quantity

                                    return (
                                        <div key={item.productId || `item-${itemIdx}`} className="py-4 border-b border-slate-100 last:border-0 space-y-4 relative">
                                            <div className="absolute top-4 right-0">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-slate-400 hover:text-red-500 hover:bg-red-50 h-8 w-8"
                                                    onClick={() => handleRemoveItem(item.productId)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>

                                            <div className="space-y-1">
                                                <Label className="text-xs text-slate-500">Producto</Label>
                                                <div className="font-medium">{product?.name || item.productId}</div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label className="text-xs text-slate-500">Cantidad</Label>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value) || 0
                                                            handleUpdateItem(item.productId, 'quantity', val)
                                                        }}
                                                        className="h-9 mt-1"
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-xs text-slate-500">Costo Unit.</Label>
                                                    <Input
                                                        type="number"
                                                        step="1"
                                                        min="0"
                                                        value={displayUnitCost}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value) || 0
                                                            // If editing in CUP, convert back to USD for storage
                                                            const usdVal = currency === 'USD' ? val : val / usdRate
                                                            handleUpdateItem(item.productId, 'unitCost', usdVal)
                                                        }}
                                                        className="h-9 mt-1"
                                                    />
                                                </div>
                                            </div>
                                            <div className="pt-2 border-t flex justify-between items-center">
                                                <span className="text-sm font-medium text-slate-500">Total</span>
                                                <span className="font-bold">
                                                    {currency === 'USD' ? '$' : 'CUP'} {displayTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Desktop View (Table) */}
                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[40%]">Descripción</TableHead>
                                            <TableHead className="w-[15%] text-center">Cantidad</TableHead>
                                            <TableHead className="w-[15%] text-right">Costo ({currency})</TableHead>
                                            <TableHead className="w-[20%] text-right">Total ({currency})</TableHead>
                                            <TableHead className="w-[10%]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map((item, itemIdx) => {
                                            const product = products.find(p => p.id === item.productId)

                                            // Calculate display values based on currency
                                            const displayUnitCost = currency === 'USD' ? item.unitCost : item.unitCost * usdRate
                                            const displayTotal = displayUnitCost * item.quantity

                                            return (
                                                <TableRow
                                                    key={item.productId || `item-${itemIdx}`}
                                                    className="border-b-0"
                                                >
                                                    <TableCell className="pl-6 py-3 align-middle">
                                                        <div className="flex flex-col">
                                                            <span className="font-normal text-slate-900 text-sm">{product?.name || item.productId}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center py-3 align-middle">
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            value={item.quantity}
                                                            onChange={(e) => {
                                                                const val = parseInt(e.target.value) || 0
                                                                handleUpdateItem(item.productId, 'quantity', val)
                                                            }}
                                                            className="h-9 w-20 text-center mx-auto bg-transparent border-slate-200 hover:border-slate-300 focus:border-slate-900 text-sm font-normal"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right py-3 align-middle">
                                                        <div className="relative flex items-center justify-end gap-1">
                                                            <Input
                                                                type="number"
                                                                step="1"
                                                                min="0"
                                                                value={displayUnitCost}
                                                                onChange={(e) => {
                                                                    const val = parseFloat(e.target.value) || 0
                                                                    // If editing in CUP, convert back to USD for storage
                                                                    const usdVal = currency === 'USD' ? val : val / usdRate
                                                                    handleUpdateItem(item.productId, 'unitCost', usdVal)
                                                                }}
                                                                className="h-9 w-24 text-right bg-transparent border-slate-200 hover:border-slate-300 focus:border-slate-900 text-sm font-normal [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                            />
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right py-3 pr-8 align-middle">
                                                        <div className="relative flex items-center justify-end gap-1">
                                                            <Input
                                                                type="number"
                                                                step="any"
                                                                min="0"
                                                                value={displayTotal.toFixed(2)}
                                                                onChange={(e) => {
                                                                    const val = parseFloat(e.target.value) || 0
                                                                    const newUnitCostDisplay = item.quantity > 0 ? val / item.quantity : 0
                                                                    const newUnitCostUsd = currency === 'USD' ? newUnitCostDisplay : newUnitCostDisplay / usdRate
                                                                    handleUpdateItem(item.productId, 'unitCost', newUnitCostUsd)
                                                                }}
                                                                className="h-9 w-24 text-right bg-transparent border-slate-200 hover:border-slate-300 focus:border-slate-900 text-sm font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                            />
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="align-middle">
                                                        {status !== 'received' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleRemoveItem(item.productId)}
                                                                className="h-8 w-8 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                        {items.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-48 text-center">
                                                    <div className="flex flex-col items-center justify-center space-y-3 opacity-60">
                                                        <div className="bg-slate-50 p-4 rounded-full border border-slate-100">
                                                            <PackageOpen className="w-8 h-8 text-slate-300" />
                                                        </div>
                                                        <div className="text-slate-500 font-medium">Lista vacía</div>
                                                        <Button variant="link" onClick={handleOpenAddProduct} className="text-blue-600 font-bold">
                                                            Añadir el primer producto
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="p-4 flex justify-center border-t border-slate-100 bg-slate-50/30">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="w-full border-2 border-dashed border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 hover:bg-slate-50"
                                    onClick={handleOpenAddProduct}
                                >
                                    <Plus className="w-4 h-4 mr-2" /> Agregar Ítem
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Notas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <Input
                                    placeholder="Notas adicionales..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="min-h-[100px]"
                                // Note: OrderForm used Input for notes but BudgetForm uses Textarea? 
                                // Order form notes is string. Let's use Textarea to match BudgetForm style.
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-1">
                    <div className="space-y-6 sticky top-6">
                        {/* Summary Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Resumen</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-4 text-sm">
                                    <div className="flex justify-between text-slate-500">
                                        <span>Subtotal</span>
                                        <span>{currency === 'USD' ? '$' : 'CUP'} {(currency === 'USD' ? calculateTotal() : calculateTotal() * usdRate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-lg pt-4 border-t border-slate-100">
                                        <span>Total</span>
                                        <span>{currency === 'USD' ? '$' : 'CUP'} {(currency === 'USD' ? calculateTotal() : calculateTotal() * usdRate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 mt-4">
                                    {status === 'draft' && (
                                        <>
                                            <div className="grid grid-cols-2 gap-2">
                                                <Button variant="outline" onClick={() => handleSubmit('draft')} className="w-full border-slate-200 text-slate-700">
                                                    <Save className="w-3.5 h-3.5 mr-2" /> Borrador
                                                </Button>
                                                <Button variant="ghost" onClick={handleCancel} className="w-full text-slate-500 hover:bg-slate-50">
                                                    Cancelar
                                                </Button>
                                            </div>
                                            <Button onClick={() => handleSubmit('ordered')} className="w-full bg-slate-900 text-white hover:bg-slate-800">
                                                <Send className="w-3.5 h-3.5 mr-2" /> Confirmar Pedido
                                            </Button>
                                            <Button onClick={() => handleSubmit('received')} className="w-full bg-emerald-600 text-white hover:bg-emerald-700">
                                                <PackageCheck className="w-3.5 h-3.5 mr-2" /> Recibir Todo
                                            </Button>
                                            {orderToEdit && (
                                                <Button variant="outline" onClick={() => {
                                                    setSavedOrder(orderToEdit)
                                                    setIsReceiptOpen(true)
                                                }} className="w-full border-slate-200 text-slate-600">
                                                    <FileText className="w-3.5 h-3.5 mr-2" /> Ver Pedido
                                                </Button>
                                            )}
                                        </>
                                    )}

                                    {status === 'ordered' && (
                                        <>
                                            <Button variant="ghost" onClick={() => handleSubmit('draft')} className="w-full text-slate-400 hover:text-slate-600">
                                                Volver a Borrador
                                            </Button>
                                            <Button variant="outline" onClick={() => handleSubmit('ordered')} className="w-full">
                                                Guardar Cambios
                                            </Button>
                                            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleReceiveOrder}>
                                                <PackageOpen className="w-3.5 h-3.5 mr-2" /> Recibir Inventario
                                            </Button>
                                            {orderToEdit && (
                                                <Button variant="outline" onClick={() => {
                                                    setSavedOrder(orderToEdit)
                                                    setIsReceiptOpen(true)
                                                }} className="w-full border-slate-200 text-slate-600">
                                                    <FileText className="w-3.5 h-3.5 mr-2" /> Ver Pedido
                                                </Button>
                                            )}
                                        </>
                                    )}

                                    {status === 'received' && (
                                        <>
                                            <Button variant="ghost" onClick={() => handleSubmit('ordered')} className="w-full text-slate-400 hover:text-rose-600 hover:bg-rose-50">
                                                Revertir a Pedido
                                            </Button>
                                            <Button onClick={() => handleSubmit('received')} className="w-full bg-slate-900 text-white">
                                                <Save className="w-3.5 h-3.5 mr-2" /> Guardar Notas
                                            </Button>
                                            {orderToEdit && (
                                                <Button variant="outline" onClick={() => {
                                                    setSavedOrder(orderToEdit)
                                                    setIsReceiptOpen(true)
                                                }} className="w-full border-slate-200 text-slate-600">
                                                    <FileText className="w-3.5 h-3.5 mr-2" /> Ver Pedido
                                                </Button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Payment Section - Moved to Right Column */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                                <CardTitle className="text-base">Registrar Pago</CardTitle>
                                <Switch
                                    checked={isPaymentEnabled}
                                    onCheckedChange={setIsPaymentEnabled}
                                    disabled={status === 'received' || orderToEdit?.paymentStatus === 'paid'}
                                />
                            </CardHeader>
                            {isPaymentEnabled && (
                                <CardContent className="space-y-4 pt-0">
                                    <div className="space-y-2">
                                        <Label>Cuenta de Pago</Label>
                                        <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar cuenta" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {accounts.filter(acc => acc.id && acc.id.trim() !== "").map(acc => (
                                                    <SelectItem key={acc.id} value={acc.id}>
                                                        <span className="font-medium">{acc.name}</span>
                                                        <span className="ml-2 text-slate-500 text-xs">({acc.currency})</span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Monto ({selectedAccount?.currency || 'USD'})</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-slate-500 text-sm font-medium">
                                                {selectedAccount?.currency === 'USD' ? '$' : 'CUP'}
                                            </span>
                                            <Input
                                                type="number"
                                                value={paymentAmount}
                                                onChange={(e) => setPaymentAmount(e.target.value)}
                                                className="pl-12"
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    </div>
                </div>
            </div>

            <Dialog open={isNewProviderModalOpen} onOpenChange={setIsNewProviderModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Añadir Nuevo Proveedor</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nombre</Label>
                            <Input value={newProviderName} onChange={e => setNewProviderName(e.target.value)} placeholder="Nombre de la empresa" />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input value={newProviderEmail} onChange={e => setNewProviderEmail(e.target.value)} placeholder="contacto@empresa.com" />
                        </div>
                        <div className="space-y-2">
                            <Label>Teléfono</Label>
                            <Input value={newProviderPhone} onChange={e => setNewProviderPhone(e.target.value)} placeholder="+1 234 567 890" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsNewProviderModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleCreateProvider} disabled={!newProviderName}>Guardar Proveedor</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Product Modal — inline product creation from order form */}
            <AddProductModal
                isOpen={isAddProductModalOpen}
                onClose={() => {
                    setIsAddProductModalOpen(false)
                    // Re-open the product selector so user can pick the newly created product
                    setTimeout(() => setIsProductDialogOpen(true), 150)
                }}
            />

            {/* Receipt — shown automatically after confirming or receiving an order */}
            <OrderReceipt
                isOpen={isReceiptOpen}
                order={savedOrder}
                onClose={() => {
                    setIsReceiptOpen(false)
                    router.push('/orders')
                }}
                onEdit={() => {
                    setIsReceiptOpen(false)
                }}
                onReceive={savedOrder && savedOrder.status !== 'received' ? async () => {
                    if (!savedOrder?.id) return
                    await receiveOrder(savedOrder.id, new Date().toISOString())
                    setSavedOrder(prev => prev ? { ...prev, status: 'received' } : prev)
                    router.refresh()
                } : undefined}
                onRegisterPayment={savedOrder?.paymentStatus !== 'paid' ? async (accountId, amount) => {
                    const acc = accounts.find(a => a.id === accountId)
                    if (!acc) return
                    addMovement({
                        id: `MOV-${Date.now()}`,
                        accountId,
                        date: new Date().toISOString(),
                        description: `Pago Compra #${savedOrder?.id}`,
                        amount: -Math.abs(amount),
                        type: 'expense',
                        category: 'Compra'
                    })
                    // Persist payment status to DB
                    if (savedOrder?.id) {
                        await updateOrder(savedOrder.id, {
                            paymentStatus: 'paid',
                            paymentAccountId: accountId,
                            paymentDate: new Date().toISOString(),
                        })
                    }
                    setSavedOrder(prev => prev ? { ...prev, paymentStatus: 'paid' } : prev)
                } : undefined}
            />

        </div>
    )
}
