"use client"

import { useState, useEffect } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter, useSearchParams } from "next/navigation"
import { useBudgetsStore } from "@/hooks/use-budgets-store"
import { updateBudgetStatus } from "@/app/actions/budgets"
import { generateId } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useInvoicesStore, Invoice } from "@/hooks/use-invoices-store"
import { useCustomersStore } from "@/hooks/use-customers-store"
import { useInventoryStore } from "@/hooks/use-inventory-store"
import { useSettingsStore } from "@/hooks/use-settings-store"
import { useKitsStore, Kit } from "@/hooks/use-kits-store"
import { Loader2, Plus, Trash2, CalendarIcon, ArrowLeft, ArrowUpRight, Box } from "lucide-react"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import Link from "next/link"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"

import { InvoiceReceiptDialog } from "./invoice-receipt-dialog"
import { PaymentDialog } from "./payment-dialog"


const invoiceItemSchema = z.object({
    productId: z.string().min(1, "Selecciona un producto"),
    productName: z.string(),
    quantity: z.number().min(1, "Cantidad mínima 1"),
    price: z.number().min(0, "Precio no puede ser negativo"),
    // Manufacture kit metadata (optional)
    kitComponents: z.array(z.object({
        productId: z.string(),
        quantity: z.number(),
    })).optional(),
    isManufactureKit: z.boolean().optional(),
})

const formSchema = z.object({
    customerId: z.string().min(1, "Selecciona un cliente"),
    date: z.date(),
    // dueDate removed
    status: z.enum(['draft', 'pending', 'partial', 'paid', 'overdue', 'cancelled']),
    currency: z.enum(['USD', 'CUP']),
    items: z.array(invoiceItemSchema).min(1, "Agrega al menos un ítem"),
    discountType: z.enum(['PERCENTAGE', 'FIXED', 'TARGET_PRICE']).nullish(),
    discountValue: z.number().min(0).nullish(),
    notes: z.string().optional(),
    budgetId: z.string().optional(),
})

interface InvoiceFormProps {
    invoiceToEdit?: Invoice | null
    isEditing?: boolean
}

export function InvoiceForm({ invoiceToEdit, isEditing = false }: InvoiceFormProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const budgetId = searchParams.get('budgetId')

    const { addInvoice, updateInvoice } = useInvoicesStore()
    const { budgets, fetchBudgets } = useBudgetsStore() // Get budgets to find the source
    const { customers, fetchCustomers } = useCustomersStore() // Fetch real customers from DB
    const { products: inventory, fetchProducts } = useInventoryStore()
    const { usdRate } = useSettingsStore() // Added usdRate for currency conversion logic
    const { kits } = useKitsStore()
    const [isLoading, setIsLoading] = useState(false)
    const [showMultiCurrency, setShowMultiCurrency] = useState(false) // Added for currency toggle
    const [showProfitability, setShowProfitability] = useState(false) // Toggle inline profitability per row
    const [isKitDialogOpen, setIsKitDialogOpen] = useState(false)
    const [selectedKitId, setSelectedKitId] = useState<string>("")
    const [isReceiptOpen, setIsReceiptOpen] = useState(false)
    const [savedInvoice, setSavedInvoice] = useState<Invoice | null>(null)

    // Lock state for paid invoices
    const [isLocked, setIsLocked] = useState(false)
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)

    // Filter available products from inventory
    const products = inventory || []

    useEffect(() => {
        if (!inventory || inventory.length === 0) {
            fetchProducts()
        }
        fetchCustomers()
        fetchBudgets() // Ensure budgets are loaded
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            customerId: "",
            date: new Date(),
            // dueDate removed
            status: "draft",
            currency: "USD",
            items: [{ productId: "", productName: "", quantity: 1, price: 0 }],
            discountType: null,
            discountValue: null,
            notes: "",
        },
    })

    const { fields, append, remove, update, replace } = useFieldArray({
        control: form.control,
        name: "items",
    })

    // Initialize form with data if editing OR if converting from budget
    useEffect(() => {
        const validDiscountTypes = ['PERCENTAGE', 'FIXED', 'TARGET_PRICE'] as const

        if (isEditing && invoiceToEdit) {
            // Safe discount type extraction
            const discountType = validDiscountTypes.includes(invoiceToEdit.discountType as any)
                ? invoiceToEdit.discountType
                : null

            form.reset({
                customerId: invoiceToEdit.customerId,
                date: new Date(invoiceToEdit.date),
                // dueDate removed
                status: invoiceToEdit.status,
                currency: (invoiceToEdit.currency as 'USD' | 'CUP') || 'USD',
                items: invoiceToEdit.items.map(item => ({
                    productId: item.productId,
                    productName: item.productName,
                    quantity: item.quantity,
                    price: item.price
                })),
                discountType: discountType as any,
                discountValue: invoiceToEdit.discountValue || null,
                notes: invoiceToEdit.notes || "",
            })

            // Lock if paid
            if (invoiceToEdit.status === 'paid') {
                setIsLocked(true)
            }
        } else if (budgetId && budgets.length > 0) {
            const sourceBudget = budgets.find(b => b.id === budgetId)
            if (sourceBudget) {
                // Safe discount type extraction
                const discountType = validDiscountTypes.includes(sourceBudget.discountType as any)
                    ? sourceBudget.discountType
                    : null

                // Ensure status is valid (Budgets use uppercase, Invoices use lowercase)
                // Default to 'draft' if looking at a budget to create a NEW invoice, 
                // but if we were strictly mapping, we'd need to lowercase it.
                // However, for a NEW invoice from a budget, it should probably start as 'draft' anyway.

                form.reset({
                    customerId: sourceBudget.clientId,
                    date: new Date(), // Today
                    // dueDate removed
                    status: "draft",
                    currency: (sourceBudget.currency as 'USD' | 'CUP') || 'USD',
                    items: sourceBudget.items.map(item => ({
                        productId: item.productId,
                        productName: item.name,
                        quantity: item.quantity,
                        price: item.unitPrice
                    })),
                    discountType: discountType as any,
                    discountValue: sourceBudget.discountValue ? Number(sourceBudget.discountValue) : null,
                    notes: "", // Removed auto-note
                    budgetId: sourceBudget.id,
                })
            }
        }
    }, [isEditing, invoiceToEdit, form, budgetId, budgets])


    // Conflict resolution state
    const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false)
    const [pendingKitItems, setPendingKitItems] = useState<any[]>([])

    const handleLoadKit = () => {
        const selectedKit = kits.find(k => k.id === selectedKitId)
        if (!selectedKit) return

        const currentItems = form.getValues().items
        const isSingleEmptyItem = currentItems.length === 1 && !currentItems[0].productId
        const currentCurrency = form.getValues('currency')

        // --- MANUFACTURE KIT: adds as a single line item ---
        if (selectedKit.type === 'manufacture') {
            const kitItem = {
                productId: `kit-${selectedKit.id}`,
                productName: selectedKit.name,
                quantity: 1,
                price: Number((selectedKit.basePrice || 0).toFixed(2)),
                isManufactureKit: true,
                kitComponents: selectedKit.products.map(p => ({
                    productId: p.productId,
                    quantity: p.quantity,
                }))
            }

            if (isSingleEmptyItem) {
                replace([kitItem])
            } else {
                append([kitItem])
            }

            toast.success(`Kit de fabricación "${selectedKit.name}" añadido`)
            setIsKitDialogOpen(false)
            setSelectedKitId("")
            return
        }

        // --- SALE KIT: expands into individual product lines ---
        const newItems = selectedKit.products.map(kitItem => {
            const product = products.find(p => p.id === kitItem.productId)
            if (!product) return null

            let price = product.saleUsd
            if (currentCurrency === 'CUP') {
                if (product.saleCup > 0) {
                    price = product.saleCup
                } else {
                    price = product.saleUsd * usdRate
                }
            } else {
                // USD
                if (product.saleUsd > 0) {
                    price = product.saleUsd
                } else {
                    price = product.saleCup / usdRate // Fallback
                }
            }

            return {
                productId: product.id,
                productName: product.name,
                quantity: kitItem.quantity,
                price: Number(price.toFixed(2))
            }
        }).filter((item): item is NonNullable<typeof item> => item !== null)

        if (newItems.length > 0) {
            // Check for conflicts
            const hasConflicts = newItems.some(newItem =>
                currentItems.some(existing => existing.productId === newItem.productId)
            )

            if (hasConflicts && !isSingleEmptyItem) {
                setPendingKitItems(newItems)
                setIsConflictDialogOpen(true)
                // Close kit dialog
                setIsKitDialogOpen(false)
                setSelectedKitId("")
                return
            }

            if (isSingleEmptyItem) {
                replace(newItems)
            } else {
                append(newItems)
            }
        }

        setIsKitDialogOpen(false)
        setSelectedKitId("")
    }

    const resolveConflict = (action: 'replace' | 'skip') => {
        const currentItems = form.getValues().items
        // Check specifically for the placeholder empty item
        const isSingleEmptyItem = currentItems.length === 1 && !currentItems[0].productId && !currentItems[0].productName

        if (action === 'replace') {
            // Replace strategy: Remove existing items that conflict with new ones, then add all new ones
            // Logic: Keep non-conflicting existing items, add ALL kit items (which serve as replacements)

            const pendingIds = new Set(pendingKitItems.map(i => i.productId))
            const nonConflictingExisting = currentItems.filter(i => !pendingIds.has(i.productId))

            const combined = [...nonConflictingExisting, ...pendingKitItems]
            replace(combined)
            toast.success("Kit cargado (productos duplicados reemplazados)")
        } else {
            // Skip strategy: Keep all existing items, add only non-conflicting new items
            const currentIds = new Set(currentItems.map(i => i.productId))
            const nonConflictingPending = pendingKitItems.filter(i => !currentIds.has(i.productId))

            if (nonConflictingPending.length > 0) {
                append(nonConflictingPending)
                toast.success(`Kit cargado (${nonConflictingPending.length} productos nuevos añadidos)`)
            } else {
                toast.info("No se añadieron productos nuevos (todos existían)")
            }
        }

        setIsConflictDialogOpen(false)
        setPendingKitItems([])
    }

    // Update product details when product is selected
    const handleProductSelect = (index: number, productId: string) => {
        const product = products.find(p => p.id === productId)
        if (product) {
            const currentCurrency = form.getValues('currency')
            let price = product.saleUsd
            if (currentCurrency === 'CUP') {
                if (product.saleCup > 0) {
                    price = product.saleCup
                } else {
                    price = product.saleUsd * usdRate
                }
            } else {
                // USD
                if (product.saleUsd > 0) {
                    price = product.saleUsd
                } else {
                    price = product.saleCup / usdRate // Fallback if only CUP exists (unlikely but good safety)
                }
            }

            update(index, {
                productId: product.id,
                productName: product.name,
                price: Number(price.toFixed(2)),
                quantity: form.getValues(`items.${index}.quantity`) || 1
            })
        }
    }

    const handleCurrencyChange = (newCurrency: 'USD' | 'CUP') => {
        const oldCurrency = form.getValues('currency')
        if (newCurrency === oldCurrency) return

        // Update currency immediately
        form.setValue('currency', newCurrency)

        // Convert items
        const currentItems = form.getValues('items')
        const updatedItems = currentItems.map(item => {
            const product = products.find(p => p.id === item.productId)
            let newPrice = item.price

            if (newCurrency === 'CUP') {
                // Switching to CUP
                if (product && product.saleCup > 0) {
                    newPrice = product.saleCup
                } else {
                    newPrice = item.price * usdRate
                }
            } else {
                // Switching to USD
                if (product && product.saleUsd > 0) {
                    newPrice = product.saleUsd
                } else {
                    newPrice = item.price / usdRate
                }
            }

            return {
                ...item,
                price: Number(newPrice.toFixed(2))
            }
        })

        replace(updatedItems)
    }

    // ... (previous code) ...

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsLoading(true)
        try {
            // Calculate totals (NO TAX)
            const itemsWithTotal = values.items.map(item => ({
                id: generateId(),
                ...item,
                total: item.quantity * item.price
            }))

            const subtotal = itemsWithTotal.reduce((sum, item) => sum + item.total, 0)
            const tax = 0 // Taxes removed
            const total = subtotal // Total is just subtotal now

            const selectedCustomer = customers.find(c => c.id === values.customerId)

            const invoiceData = {
                customerId: values.customerId,
                customerName: selectedCustomer ? selectedCustomer.name : 'Unknown',
                date: values.date.toISOString(),
                // dueDate removed from UI but kept in interface if needed, or just same as date
                dueDate: values.date.toISOString(),
                status: values.status,
                currency: values.currency,
                budgetId: values.budgetId,
                items: itemsWithTotal,
                subtotal,
                tax,
                total,
                notes: values.notes,
                discountType: values.discountType || undefined,
                discountValue: values.discountValue ? Number(values.discountValue) : undefined,
                payments: []
            }

            let savedInvoiceData: Invoice;

            if (isEditing && invoiceToEdit) {
                // Generate log entry if invoice was paid and edited
                let history = invoiceToEdit.history || []

                if (invoiceToEdit.status === 'paid') {
                    const changes: Record<string, { from: any, to: any }> = {}

                    // Simple check for key changes (could be more exhaustive)
                    if (invoiceToEdit.total !== total) changes.total = { from: invoiceToEdit.total, to: total }
                    if (invoiceToEdit.status !== values.status) changes.status = { from: invoiceToEdit.status, to: values.status }

                    history.push({
                        id: generateId(),
                        date: new Date().toISOString(),
                        action: 'updated',
                        description: 'Factura pagada editada',
                        changes
                    })
                }

                const updatedInvoice = { ...invoiceToEdit, ...invoiceData, history }
                updateInvoice(invoiceToEdit.id, updatedInvoice)
                savedInvoiceData = updatedInvoice
                toast.success('Factura actualizada correctamente')

                // Re-lock if status is still paid (optional, but good UX)
                if (values.status === 'paid') {
                    setIsLocked(true)
                }
            } else {
                const newInvoice: Invoice = {
                    id: `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
                    ...invoiceData,
                    payments: []
                }
                setSavedInvoice(newInvoice)
                addInvoice(newInvoice)
                savedInvoiceData = newInvoice
                toast.success('Factura creada correctamente')

                // Update budget status if linked
                if (values.budgetId) {
                    await updateBudgetStatus(values.budgetId, 'APPROVED')
                }
            }

            setSavedInvoice(savedInvoiceData)

            setIsReceiptOpen(true)

        } catch (error) {
            console.error(error)
            toast.error('Error al guardar la factura')
        } finally {
            setIsLoading(false)
        }
    }

    // Prepare budget info for display
    const formBudgetId = form.watch('budgetId')
    const linkedBudget = budgets.find(b => b.id === formBudgetId)


    // Watch items to calculate live total for display
    // Watch items to calculate live total for display
    const watchedItems = form.watch("items")
    const watchedCurrency = form.watch("currency")
    const watchedDiscountType = form.watch("discountType")
    const watchedDiscountValue = form.watch("discountValue")

    const calculatedSubtotal = watchedItems?.reduce((sum, item) => sum + (item.quantity * item.price), 0) || 0

    let calculatedDiscount = 0
    if (watchedDiscountType === 'PERCENTAGE' && watchedDiscountValue) {
        calculatedDiscount = calculatedSubtotal * (watchedDiscountValue / 100)
    } else if (watchedDiscountType === 'FIXED' && watchedDiscountValue) {
        calculatedDiscount = watchedDiscountValue
    } else if (watchedDiscountType === 'TARGET_PRICE' && watchedDiscountValue) {
        calculatedDiscount = Math.max(0, calculatedSubtotal - watchedDiscountValue)
    }

    const finalTotal = Math.max(0, calculatedSubtotal - calculatedDiscount)

    // Calculate Payment Info (for View Mode / Payments Section)
    const activeInvoice = isEditing ? invoiceToEdit : savedInvoice
    const payments = activeInvoice?.payments || []
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
    const balanceDue = (activeInvoice?.total || 0) - totalPaid

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                    {isEditing ? "Editar Factura" : "Nueva Factura"}
                </h1>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
                    console.error("Form validation errors (JSON):", JSON.stringify(errors, null, 2))
                    console.log("Current Form Values:", form.getValues())
                    toast.error("Por favor revisa los errores en el formulario")
                    if (Object.keys(errors).length > 0) {
                        toast.error(`Campos con error: ${Object.keys(errors).join(", ")}`)
                    } else {
                        toast.error("Error de validación desconocido (Objeto de errores vacío)")
                    }
                })} className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column: Form Details */}
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="border-0 shadow-none -mx-4 sm:mx-0 sm:border sm:shadow-sm">
                                <CardHeader className="px-4 sm:px-6">
                                    <CardTitle>Detalles Generales</CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4 sm:px-6">
                                    {/* Budget Link Present */}
                                    {linkedBudget && (
                                        <div className="md:col-span-2 bg-slate-50 p-3 rounded-md border border-slate-200 flex items-center gap-2 text-sm text-slate-600">
                                            <span className="font-semibold">Presupuesto Asociado:</span>
                                            <Link href={`/budgets/${linkedBudget.id}`} className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 hover:bg-slate-50 hover:text-blue-600 transition-colors cursor-pointer">
                                                {linkedBudget.displayId}
                                            </Link>
                                        </div>
                                    )}

                                    <FormField
                                        control={form.control}
                                        name="customerId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Cliente</FormLabel>
                                                <Select
                                                    onValueChange={field.onChange}
                                                    defaultValue={field.value}
                                                    value={field.value}
                                                    disabled={!!searchParams.get('budgetId') || isLocked}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Seleccionar cliente" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {customers.map((customer) => (
                                                            <SelectItem key={customer.id} value={customer.id}>
                                                                {customer.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="status"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Estado</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Estado" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="draft">Borrador</SelectItem>
                                                        <SelectItem value="pending">Pendiente</SelectItem>
                                                        <SelectItem value="paid">Pagada</SelectItem>
                                                        <SelectItem value="overdue">Vencida</SelectItem>
                                                        <SelectItem value="cancelled">Cancelada</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="date"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel>Fecha Emisión</FormLabel>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button
                                                                variant={"outline"}
                                                                className={cn(
                                                                    "w-full pl-3 text-left font-normal",
                                                                    !field.value && "text-muted-foreground"
                                                                )}
                                                            >
                                                                {field.value ? (
                                                                    format(field.value, "PPP")
                                                                ) : (
                                                                    <span>Elegir fecha</span>
                                                                )}
                                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start">
                                                        <Calendar
                                                            mode="single"
                                                            selected={field.value}
                                                            onSelect={field.onChange}
                                                            disabled={(date) =>
                                                                isLocked || date > new Date() || date < new Date("1900-01-01")
                                                            }
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="space-y-4">
                                        {/* Currency Configuration Removed */}
                                    </div>

                                    {/* dueDate removed as requested */}
                                </CardContent>
                            </Card>

                            <Card className="border-0 shadow-none max-w-[100vw] overflow-hidden -mx-6 sm:mx-0 sm:border sm:shadow-sm sm:rounded-lg">
                                <CardHeader className="px-6 py-4 border-b border-slate-100 sm:px-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <CardTitle className="text-base font-semibold">Artículos</CardTitle>

                                        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 -mx-6 px-6 sm:mx-0 sm:px-0 sm:pb-0 sm:overflow-visible [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                            <Dialog open={isKitDialogOpen} onOpenChange={setIsKitDialogOpen}>
                                                <DialogTrigger asChild>
                                                    <Button type="button" variant="outline" size="sm" className="h-8 rounded-full border-dashed border-slate-300 text-slate-600 hover:text-slate-900 bg-white shadow-sm flex-shrink-0 px-3">
                                                        <Box className="w-3.5 h-3.5 mr-1.5" /> Cargar Kit
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Cargar Kit de Productos</DialogTitle>
                                                    </DialogHeader>
                                                    <div className="py-4 space-y-4">
                                                        <div className="space-y-2">
                                                            <Label>Seleccionar Kit</Label>
                                                            <Select onValueChange={setSelectedKitId} value={selectedKitId}>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Selecciona un kit..." />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {kits && kits.length > 0 ? (
                                                                        kits.map(kit => (
                                                                            <SelectItem key={kit.id} value={kit.id}>
                                                                                {kit.name} — {kit.type === 'manufacture' ? '🏭 Fabricación' : '📦 Venta'} ({kit.products ? kit.products.length : 0} productos)
                                                                            </SelectItem>
                                                                        ))
                                                                    ) : (
                                                                        <SelectItem value="none" disabled>No hay kits disponibles</SelectItem>
                                                                    )}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        {selectedKitId && (() => {
                                                            const selectedKit = kits.find(k => k.id === selectedKitId)
                                                            if (!selectedKit) return null
                                                            const isManufacture = selectedKit.type === 'manufacture'
                                                            return (
                                                                <div className="space-y-3">
                                                                    {isManufacture && (
                                                                        <div className="flex items-start gap-2 text-xs bg-purple-50 border border-purple-200 text-purple-800 p-2.5 rounded-md">
                                                                            <span className="mt-0.5">🏭</span>
                                                                            <span>Este kit de <strong>fabricación</strong> se añadirá como <strong>una sola línea</strong> en la factura. Los sub-productos se descontarán del inventario pero no aparecerán en el recibo.</span>
                                                                        </div>
                                                                    )}
                                                                    <div className="text-sm text-slate-500 bg-slate-50 p-3 rounded-md">
                                                                        <p className="font-medium mb-1 text-slate-700">
                                                                            {isManufacture ? 'Componentes internos:' : 'Contenido:'}
                                                                        </p>
                                                                        <ul className="list-disc pl-4 space-y-1">
                                                                            {selectedKit.products.map((p, i) => {
                                                                                const product = products.find(prod => prod.id === p.productId)
                                                                                return (
                                                                                    <li key={i}>{p.quantity}x {product?.name || 'Producto desconocido'}</li>
                                                                                )
                                                                            })}
                                                                        </ul>
                                                                    </div>
                                                                </div>
                                                            )
                                                        })()}
                                                    </div>
                                                    <DialogFooter>
                                                        <Button variant="outline" onClick={() => setIsKitDialogOpen(false)}>Cancelar</Button>
                                                        <Button type="button" onClick={handleLoadKit} disabled={!selectedKitId}>Cargar Kit</Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>

                                            <div className={`flex items-center space-x-2 border rounded-full px-3 h-8 flex-shrink-0 transition-colors ${showMultiCurrency ? 'bg-slate-50 border-slate-300' : 'bg-white border-slate-200 shadow-sm'}`}>
                                                <Checkbox
                                                    id="showMultiCurrency"
                                                    checked={showMultiCurrency}
                                                    onCheckedChange={(checked) => setShowMultiCurrency(checked as boolean)}
                                                    className="data-[state=checked]:bg-slate-900 border-slate-300 w-3.5 h-3.5 rounded-[4px]"
                                                />
                                                <Label htmlFor="showMultiCurrency" className="text-xs font-medium leading-none text-slate-600 cursor-pointer">
                                                    Conversión
                                                </Label>
                                            </div>

                                            <div className={`flex items-center space-x-2 border rounded-full px-3 h-8 flex-shrink-0 transition-colors ${showProfitability ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200 shadow-sm'}`}>
                                                <Checkbox
                                                    id="showProfitability"
                                                    checked={showProfitability}
                                                    onCheckedChange={(checked) => setShowProfitability(checked as boolean)}
                                                    className="data-[state=checked]:bg-emerald-600 data-[state=checked]:text-white border-slate-300 w-3.5 h-3.5 rounded-[4px]"
                                                />
                                                <Label htmlFor="showProfitability" className="text-xs font-medium leading-none text-slate-600 cursor-pointer">
                                                    Rentabilidad
                                                </Label>
                                            </div>

                                            <FormField
                                                control={form.control}
                                                name="currency"
                                                render={({ field }) => (
                                                    <FormItem className="flex items-center space-y-0 gap-2 mb-0 flex-shrink-0">
                                                        <Select onValueChange={handleCurrencyChange} value={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger className="h-8 w-[80px] bg-white text-xs rounded-full border-slate-200 shadow-sm">
                                                                    <SelectValue placeholder="Moneda" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="USD">USD</SelectItem>
                                                                <SelectItem value="CUP">CUP</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0 md:p-6 space-y-0">
                                    {/* Mobile View (Cards) */}
                                    <div className="md:hidden space-y-0 px-4">
                                        {fields.map((field, index) => {
                                            const quantity = form.watch(`items.${index}.quantity`) || 0
                                            const price = form.watch(`items.${index}.price`) || 0
                                            const subtotal = quantity * price
                                            const currentCurrency = form.watch('currency')

                                            // Calculate secondary currency values
                                            const secondaryPrice = currentCurrency === 'USD'
                                                ? price * usdRate
                                                : price / usdRate

                                            const secondarySubtotal = quantity * secondaryPrice

                                            return (
                                                <div key={field.id} className="bg-white border-b border-slate-100 last:border-0 py-4 first:pt-0 space-y-3 relative">
                                                    <div className="absolute top-4 right-0">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-slate-400 hover:text-red-500 hover:bg-red-50 h-8 w-8"
                                                            onClick={() => remove(index)}
                                                            disabled={fields.length === 1}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>

                                                    <FormField
                                                        control={form.control}
                                                        name={`items.${index}.productId`}
                                                        render={({ field: selectField }) => (
                                                            <FormItem className="mr-8">
                                                                <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Descripción</FormLabel>
                                                                <Select
                                                                    onValueChange={(val) => {
                                                                        selectField.onChange(val)
                                                                        handleProductSelect(index, val)
                                                                    }}
                                                                    value={selectField.value}
                                                                >
                                                                    <FormControl>
                                                                        <SelectTrigger className="h-9 bg-white shadow-sm border-slate-200">
                                                                            <SelectValue placeholder="Seleccionar..." />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        {products.map((p) => (
                                                                            <SelectItem key={p.id} value={p.id}>
                                                                                {p.name}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />

                                                    <div className="grid grid-cols-2 gap-3">
                                                        <FormField
                                                            control={form.control}
                                                            name={`items.${index}.quantity`}
                                                            render={({ field: qtyField }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cantidad</FormLabel>
                                                                    <FormControl>
                                                                        <Input
                                                                            type="number"
                                                                            min="1"
                                                                            {...qtyField}
                                                                            onChange={e => qtyField.onChange(parseFloat(e.target.value))}
                                                                            className="h-9 bg-white shadow-sm border-slate-200"
                                                                        />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />

                                                        <FormField
                                                            control={form.control}
                                                            name={`items.${index}.price`}
                                                            render={({ field: priceField }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Precio Unit.</FormLabel>
                                                                    <FormControl>
                                                                        <div className="space-y-1">
                                                                            <Input
                                                                                type="number"
                                                                                min={0}
                                                                                step="any"
                                                                                {...priceField}
                                                                                readOnly={false}
                                                                                className="h-9 bg-white shadow-sm border-slate-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                                onChange={e => {
                                                                                    const val = parseFloat(e.target.value)
                                                                                    priceField.onChange(isNaN(val) ? undefined : val)
                                                                                }}
                                                                            />
                                                                            {showMultiCurrency && (
                                                                                <div className="flex justify-end mt-1">
                                                                                    <span className="inline-flex items-center rounded-md bg-slate-50 px-1.5 py-0.5 text-[9px] font-medium text-slate-500 border border-slate-200">
                                                                                        {currentCurrency === 'USD' ? 'CUP' : 'USD'} {secondaryPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>

                                                    <div className="pt-3 flex justify-between items-center bg-slate-50/50 -mx-6 px-6 sm:mx-0 sm:px-4 py-2 sm:rounded-lg">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Total</span>
                                                        <div className="text-right">
                                                            <div className="flex items-center gap-2 justify-end">
                                                                {showMultiCurrency && (
                                                                    <span className="text-[10px] text-slate-400 font-medium">
                                                                        {currentCurrency === 'USD' ? 'CUP' : 'USD'} {secondarySubtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                    </span>
                                                                )}
                                                                <div className="font-bold text-slate-900 text-sm">
                                                                    {subtotal ? subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                                                                </div>
                                                            </div>
                                                        </div>
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
                                                    <TableHead className="w-[350px]">Descripción</TableHead>
                                                    <TableHead className="w-[80px]">Cantidad</TableHead>
                                                    <TableHead className="w-[150px]">Precio Unit.</TableHead>
                                                    <TableHead className="w-[150px] text-right">Total</TableHead>
                                                    <TableHead className="w-[50px]"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {fields.map((field, index) => {
                                                    const quantity = form.watch(`items.${index}.quantity`) || 0
                                                    const price = form.watch(`items.${index}.price`) || 0
                                                    const subtotal = quantity * price
                                                    const currentCurrency = form.watch('currency')

                                                    // Calculate secondary currency values
                                                    const secondaryPrice = currentCurrency === 'USD'
                                                        ? price * usdRate
                                                        : price / usdRate

                                                    const secondarySubtotal = quantity * secondaryPrice

                                                    return (
                                                        <TableRow key={field.id}>
                                                            <TableCell className={showMultiCurrency ? "align-top" : ""}>
                                                                <FormField
                                                                    control={form.control}
                                                                    name={`items.${index}.productId`}
                                                                    render={({ field: selectField }) => (
                                                                        <FormItem>
                                                                            <Select
                                                                                onValueChange={(val) => {
                                                                                    // Check for duplicates
                                                                                    const currentItems = form.getValues().items
                                                                                    const isDuplicate = currentItems.some((item, idx) => idx !== index && item.productId === val)

                                                                                    if (isDuplicate) {
                                                                                        toast.error("Este producto ya está añadido")
                                                                                        return
                                                                                    }

                                                                                    selectField.onChange(val)
                                                                                    handleProductSelect(index, val)
                                                                                }}
                                                                                value={selectField.value}
                                                                            >
                                                                                <FormControl>
                                                                                    <SelectTrigger className="h-9">
                                                                                        <SelectValue placeholder="Seleccionar..." />
                                                                                    </SelectTrigger>
                                                                                </FormControl>
                                                                                <SelectContent>
                                                                                    {products.map((p) => (
                                                                                        <SelectItem key={p.id} value={p.id}>
                                                                                            {p.name}
                                                                                        </SelectItem>
                                                                                    ))}
                                                                                </SelectContent>
                                                                            </Select>
                                                                            <FormMessage />
                                                                        </FormItem>
                                                                    )}
                                                                />
                                                            </TableCell>
                                                            <TableCell className={showMultiCurrency ? "align-top" : ""}>
                                                                <FormField
                                                                    control={form.control}
                                                                    name={`items.${index}.quantity`}
                                                                    render={({ field: qtyField }) => (
                                                                        <FormItem>
                                                                            <FormControl>
                                                                                <Input
                                                                                    type="number"
                                                                                    min="1"
                                                                                    {...qtyField}
                                                                                    onChange={e => qtyField.onChange(parseFloat(e.target.value))}
                                                                                    className="h-9"
                                                                                />
                                                                            </FormControl>
                                                                            <FormMessage />
                                                                        </FormItem>
                                                                    )}
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <FormField
                                                                    control={form.control}
                                                                    name={`items.${index}.price`}
                                                                    render={({ field: priceField }) => {
                                                                        const prod = products.find(p => p.id === form.watch(`items.${index}.productId`))
                                                                        const costBase = prod ? ((prod.useWeightedCost && prod.weightedCost) ? prod.weightedCost : prod.costUsd) : 0
                                                                        const costDisplay = currentCurrency === 'CUP' ? costBase * usdRate : costBase
                                                                        const rowProfit = (priceField.value ?? 0) - costDisplay
                                                                        const rowMargin = (priceField.value ?? 0) > 0 ? (rowProfit / (priceField.value ?? 1)) * 100 : 0
                                                                        return (
                                                                            <FormItem>
                                                                                <FormControl>
                                                                                    <div className="space-y-1">
                                                                                        <Input
                                                                                            type="number"
                                                                                            min={0}
                                                                                            step="any"
                                                                                            {...priceField}
                                                                                            readOnly={false}
                                                                                            className="h-9 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                                            onChange={e => {
                                                                                                const val = parseFloat(e.target.value)
                                                                                                priceField.onChange(isNaN(val) ? undefined : val)
                                                                                            }}
                                                                                        />
                                                                                        {showMultiCurrency && (
                                                                                            <div className="flex justify-end mt-1">
                                                                                                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
                                                                                                    {currentCurrency === 'USD' ? 'CUP' : 'USD'} {secondaryPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                                                </span>
                                                                                            </div>
                                                                                        )}
                                                                                        {showProfitability && prod && (
                                                                                            <div className="flex justify-end mt-1 gap-1">
                                                                                                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${rowProfit >= 0 ? 'bg-emerald-50 text-emerald-700 ring-emerald-500/20' : 'bg-rose-50 text-rose-700 ring-rose-500/20'}`}>
                                                                                                    {rowMargin.toFixed(0)}%
                                                                                                </span>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </FormControl>
                                                                                <FormMessage />
                                                                            </FormItem>
                                                                        )
                                                                    }}
                                                                />
                                                            </TableCell>
                                                            <TableCell className={(showMultiCurrency || showProfitability) ? "align-top" : "align-middle"}>
                                                                <div className="space-y-1">
                                                                    <Input
                                                                        type="number"
                                                                        min={0}
                                                                        step="any"
                                                                        className="h-9 text-right font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                        value={subtotal ? subtotal.toFixed(2) : ""}
                                                                        readOnly // Subtotal is auto-calc
                                                                    />
                                                                </div>
                                                                {showMultiCurrency && (
                                                                    <div className="flex justify-end mt-1">
                                                                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
                                                                            {currentCurrency === 'USD' ? 'CUP' : 'USD'} {secondarySubtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="text-slate-400 hover:text-red-500 hover:bg-red-50 h-8 w-8"
                                                                    onClick={() => remove(index)}
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <div className="hidden md:flex p-4 justify-center border-t border-slate-100 bg-slate-50/30">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className="w-full border-2 border-dashed border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 hover:bg-slate-50"
                                            onClick={() => {
                                                const currentItems = form.getValues().items
                                                const hasEmpty = currentItems.some(item => !item.productId)

                                                if (hasEmpty) {
                                                    toast.warning("Completa el ítem vacío antes de agregar uno nuevo")
                                                    return
                                                }
                                                append({ productId: "", productName: "", quantity: 1, price: 0 })
                                            }}
                                        >
                                            <Plus className="w-4 h-4 mr-2" /> Agregar Ítem
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-0 shadow-none -mx-4 sm:mx-0 sm:border sm:shadow-sm">
                                <CardHeader className="px-4 sm:px-6 border-t border-slate-100 sm:border-t-0 mt-4 sm:mt-0 pt-6 sm:pt-6">
                                    <CardTitle>Notas</CardTitle>
                                </CardHeader>
                                <CardContent className="px-4 sm:px-6">
                                    <FormField
                                        control={form.control}
                                        name="notes"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Notas adicionales visibles en la factura..."
                                                        className="min-h-[100px]"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Column: Summary */}
                        <div className="lg:col-span-1">
                            <Card className="border-0 shadow-none -mx-4 sm:mx-0 sm:border sm:shadow-sm sticky top-6">
                                <CardHeader className="px-4 sm:px-6 border-t border-slate-100 sm:border-t-0 mt-4 sm:mt-0 pt-6 sm:pt-6">
                                    <CardTitle>Resumen</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 px-4 sm:px-6">
                                    <div className="space-y-4 text-sm">
                                        <div className="flex justify-between text-slate-500">
                                            <span>Subtotal</span>
                                            <span>{watchedCurrency === 'USD' ? '$' : 'CUP'} {calculatedSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>

                                        {/* Discount Section */}
                                        <div className="space-y-3 pt-3 border-t border-slate-100">
                                            <span className="text-xs font-medium text-slate-500">Descuento</span>
                                            <div className="flex items-center gap-2">
                                                <FormField
                                                    control={form.control}
                                                    name="discountType"
                                                    render={({ field }) => (
                                                        <FormItem className="flex-1">
                                                            <Select onValueChange={field.onChange} defaultValue={field.value || undefined} value={field.value || undefined}>
                                                                <FormControl>
                                                                    <SelectTrigger className="h-8 text-xs">
                                                                        <SelectValue placeholder="Descuento..." />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    <SelectItem value="PERCENTAGE">% Porcentaje</SelectItem>
                                                                    <SelectItem value="FIXED">$ Cantidad Fija</SelectItem>
                                                                    <SelectItem value="TARGET_PRICE">Precio Final</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="discountValue"
                                                    render={({ field }) => (
                                                        <FormItem className="w-20">
                                                            <FormControl>
                                                                <Input
                                                                    type="number"
                                                                    min={0}
                                                                    step="any"
                                                                    placeholder="0"
                                                                    className="h-8 text-xs text-right"
                                                                    {...field}
                                                                    value={field.value ?? ''}
                                                                    onChange={e => {
                                                                        const val = parseFloat(e.target.value)
                                                                        field.onChange(isNaN(val) ? undefined : val)
                                                                    }}
                                                                />
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            {calculatedDiscount > 0 && (
                                                <div className="flex justify-between text-emerald-600 font-medium">
                                                    <span>Descuento</span>
                                                    <span>- {watchedCurrency === 'USD' ? '$' : 'CUP'} {calculatedDiscount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex justify-between font-bold text-lg pt-4 border-t border-slate-100">
                                            <span>Total</span>
                                            <span>{watchedCurrency === 'USD' ? '$' : 'CUP'} {finalTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>

                                        {/* ─── Internal Profitability Panel ─── */}
                                        {showProfitability && (() => {
                                            const profitItems = (watchedItems || []).map(item => {
                                                const product = inventory.find(p => p.id === item.productId)
                                                if (!product) return null
                                                const costUsd = (product.useWeightedCost && product.weightedCost) ? product.weightedCost : product.costUsd
                                                const costDisplay = watchedCurrency === 'CUP' ? costUsd * usdRate : costUsd
                                                const lineRevenue = item.price * item.quantity
                                                const lineCost = costDisplay * item.quantity
                                                return lineRevenue - lineCost
                                            }).filter(n => n !== null) as number[]

                                            const totalProfit = profitItems.reduce((s, v) => s + v, 0)
                                            const totalRevenue = (watchedItems || []).reduce((s, item) => s + item.price * item.quantity, 0)
                                            const totalMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
                                            const sym = watchedCurrency === 'CUP' ? '₱' : '$'

                                            return (
                                                <div className="pt-3 border-t border-dashed border-emerald-100">
                                                    <div className="flex justify-between items-center text-xs font-bold">
                                                        <span className="text-slate-500 uppercase tracking-wider text-[10px]">📊 Beneficio</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className={totalProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                                                                {sym}{totalProfit.toFixed(2)}
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
                                    <div className="hidden md:flex flex-col gap-2 mt-6">
                                        {isLocked ? (
                                            <Button
                                                type="button"
                                                className="w-full bg-blue-600 hover:bg-blue-700"
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    setIsLocked(false)
                                                }}
                                            >
                                                Editar Factura
                                            </Button>
                                        ) : (
                                            <Button type="submit" disabled={isLoading} className="w-full bg-slate-900 text-white hover:bg-slate-800 shadow-sm">
                                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                {isEditing ? "Guardar Cambios" : "Crear Factura"}
                                            </Button>
                                        )}

                                        {/* View Receipt Button - Only for existing invoices */}
                                        {(isEditing || savedInvoice) && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="w-full"
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    // Ensure we have an invoice to show
                                                    if (isEditing && invoiceToEdit) {
                                                        setSavedInvoice(invoiceToEdit)
                                                        setIsReceiptOpen(true)
                                                    } else if (savedInvoice) {
                                                        setIsReceiptOpen(true)
                                                    }
                                                }}
                                            >
                                                Ver Recibo
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Spacer to prevent content from hiding behind the sticky footer */}
                    <div className="h-24 md:hidden"></div>

                    {/* Mobile Sticky Footer */}
                    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] md:hidden z-50">
                        <div className="flex flex-col gap-2 max-w-sm mx-auto">
                            {isLocked ? (
                                <Button
                                    type="button"
                                    className="w-full bg-blue-600 hover:bg-blue-700 h-11"
                                    onClick={(e) => {
                                        e.preventDefault()
                                        setIsLocked(false)
                                    }}
                                >
                                    Editar Factura
                                </Button>
                            ) : (
                                <Button type="submit" disabled={isLoading} className="w-full bg-slate-900 text-white hover:bg-slate-800 h-11 shadow-sm font-medium">
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {isEditing ? "Guardar Cambios" : "Crear Factura"}
                                </Button>
                            )}

                            {(isEditing || savedInvoice) && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full h-11 font-medium"
                                    onClick={(e) => {
                                        e.preventDefault()
                                        if (isEditing && invoiceToEdit) {
                                            setSavedInvoice(invoiceToEdit)
                                            setIsReceiptOpen(true)
                                        } else if (savedInvoice) {
                                            setIsReceiptOpen(true)
                                        }
                                    }}
                                >
                                    Ver Recibo
                                </Button>
                            )}
                        </div>
                    </div>
                </form>
            </Form>

            {/* Payments Section - Only visible when editing an existing invoice */}
            {(isEditing && invoiceToEdit) && (
                <Card className="border-0 shadow-none -mx-4 sm:mx-0 sm:border sm:shadow-sm mt-6 sm:mt-0">
                    <CardHeader className="flex flex-row items-center justify-between px-4 sm:px-6 border-t border-slate-100 sm:border-t-0 pt-6 sm:pt-6">
                        <CardTitle>Pagos</CardTitle>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsPaymentDialogOpen(true)}
                            disabled={invoiceToEdit.status === 'paid' || invoiceToEdit.status === 'cancelled'}
                        >
                            <Plus className="mr-2 h-4 w-4" /> Registrar Pago
                        </Button>
                    </CardHeader>
                    <CardContent className="px-4 sm:px-6">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="p-4 bg-slate-50 rounded-lg">
                                    <p className="text-xs font-medium text-slate-500 uppercase">Total Factura</p>
                                    <p className="text-xl font-bold text-slate-900">
                                        {invoiceToEdit.currency === 'USD' ? '$' : 'CUP'} {invoiceToEdit.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <div className="p-4 bg-emerald-50 rounded-lg">
                                    <p className="text-xs font-medium text-emerald-600 uppercase">Pagado</p>
                                    <p className="text-xl font-bold text-emerald-700">
                                        {invoiceToEdit.currency === 'USD' ? '$' : 'CUP'} {totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <div className="p-4 bg-amber-50 rounded-lg">
                                    <p className="text-xs font-medium text-amber-600 uppercase">Pendiente</p>
                                    <p className="text-xl font-bold text-amber-700">
                                        {invoiceToEdit.currency === 'USD' ? '$' : 'CUP'} {balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>

                            {payments.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead>Método</TableHead>
                                            <TableHead>Notas</TableHead>
                                            <TableHead className="text-right">Monto</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {payments.map((payment) => (
                                            <TableRow key={payment.id}>
                                                <TableCell>{format(new Date(payment.date), "dd/MM/yyyy")}</TableCell>
                                                <TableCell className="capitalize">
                                                    {payment.method === 'cash' ? 'Efectivo' :
                                                        payment.method === 'transfer' ? 'Transferencia' :
                                                            payment.method === 'card' ? 'Tarjeta' : 'Otro'}
                                                </TableCell>
                                                <TableCell className="text-slate-500 text-sm max-w-[200px] truncate">
                                                    {payment.notes || "-"}
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {invoiceToEdit.currency === 'USD' ? '$' : 'CUP'} {payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-8 text-slate-500 border border-dashed rounded-lg">
                                    No hay pagos registrados
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {savedInvoice && (
                <InvoiceReceiptDialog
                    open={isReceiptOpen}
                    onOpenChange={setIsReceiptOpen}
                    invoice={savedInvoice}
                />
            )}

            {(isEditing && invoiceToEdit) && (
                <PaymentDialog
                    open={isPaymentDialogOpen}
                    onOpenChange={setIsPaymentDialogOpen}
                    invoiceId={invoiceToEdit.id}
                    totalAmount={invoiceToEdit.total}
                    remainingBalance={balanceDue}
                    currency={invoiceToEdit.currency}
                    onPaymentSuccess={() => { router.refresh(); setSavedInvoice(prev => prev ? { ...prev, payments: [...(prev.payments || [])] } : null) }} // Simple refresh for now
                />
            )}

            <AlertDialog open={isConflictDialogOpen} onOpenChange={setIsConflictDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Conflictos de Productos Detectados</AlertDialogTitle>
                        <AlertDialogDescription>
                            El kit que estás intentando cargar contiene productos que ya están en la factura.
                            ¿Cómo deseas proceder?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-2 text-sm text-slate-500 bg-slate-50 p-3 rounded-md">
                        <ul className="list-disc pl-4 space-y-1">
                            <li><strong>Reemplazar:</strong> Actualiza los productos existentes con la cantidad y precio del kit.</li>
                            <li><strong>Saltar:</strong> Mantiene los productos existentes y solo añade los nuevos del kit.</li>
                        </ul>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => {
                            setIsConflictDialogOpen(false)
                            setPendingKitItems([])
                        }}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => resolveConflict('skip')} className="bg-slate-600 hover:bg-slate-700">
                            Saltar Existentes
                        </AlertDialogAction>
                        <AlertDialogAction onClick={() => resolveConflict('replace')}>
                            Reemplazar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
