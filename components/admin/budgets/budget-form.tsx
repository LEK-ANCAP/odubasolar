"use client"

import React, { useState, useEffect } from "react"
import { createBudget, updateBudget } from "@/app/actions/budgets"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
// import { BudgetReceiptDialog } from "./budget-receipt-dialog"
import dynamic from "next/dynamic"

const BudgetReceiptDialog = dynamic(
    () => import("./budget-receipt-dialog").then((mod) => mod.BudgetReceiptDialog),
    { ssr: false }
)
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useRouter, useSearchParams } from "next/navigation"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useBudgetsStore, Budget } from "@/hooks/use-budgets-store"
import { useKitsStore, Kit } from "@/hooks/use-kits-store"
import { useCustomersStore } from "@/hooks/use-customers-store"
import { useInventoryStore } from "@/hooks/use-inventory-store"
import { useSettingsStore } from "@/hooks/use-settings-store"
import { Loader2, Plus, Trash2, CalendarIcon, ArrowLeft, Save, Box, Download, ChevronDown, ChevronRight, Package } from "lucide-react"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"



const budgetItemSchema = z.object({
    productId: z.string().min(1, "Selecciona un producto"),
    name: z.string(), // Product Name snapshot
    quantity: z.number().min(1, "Cantidad mínima 1"),
    unitPrice: z.number().min(0, "Precio no puede ser negativo"),
    // Manufacture kit metadata (optional)
    kitComponents: z.array(z.object({
        productId: z.string(),
        quantity: z.number(),
    })).optional(),
    isManufactureKit: z.boolean().optional(),
})

const formSchema = z.object({
    // name: z.string().optional(), // Removed
    clientId: z.string().min(1, "Selecciona un cliente"),
    date: z.date(),
    validUntil: z.date().optional(),
    currency: z.enum(['USD', 'CUP']),
    status: z.enum(['DRAFT', 'SENT', 'APPROVED', 'PAID', 'CANCELLED']),
    items: z.array(budgetItemSchema).min(1, "Agrega al menos un ítem"),
    discountType: z.enum(['PERCENTAGE', 'FIXED', 'TARGET_PRICE']).optional(),
    discountValue: z.number().min(0).optional(),
    notes: z.string().optional(),
})

type BudgetFormValues = z.infer<typeof formSchema>

export function BudgetForm({ budgetToEdit, initialItems = [] }: { budgetToEdit?: Budget, initialItems?: any[] }) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const urlClientId = searchParams.get('clientId')

    const { fetchBudgets } = useBudgetsStore()
    const { customers, fetchCustomers } = useCustomersStore()
    const { products: inventoryItems, fetchProducts } = useInventoryStore()
    const { kits } = useKitsStore()
    const { usdRate, eurRate } = useSettingsStore()
    const [isLoading, setIsLoading] = useState(false)
    const [isKitDialogOpen, setIsKitDialogOpen] = useState(false)
    const [selectedKitId, setSelectedKitId] = useState<string>("")
    const [kitAnswers, setKitAnswers] = useState<Record<string, string>>({})
    const [calculatedKitItems, setCalculatedKitItems] = useState<any[]>([])
    const [showMultiCurrency, setShowMultiCurrency] = useState(false)
    const [showProfitability, setShowProfitability] = useState(false)
    const [isReceiptOpen, setIsReceiptOpen] = useState(false)
    const [savedBudget, setSavedBudget] = useState<Budget | undefined>(budgetToEdit)
    const [expandedKitRows, setExpandedKitRows] = useState<Set<number>>(new Set())

    const toggleKitRow = (index: number) => {
        setExpandedKitRows(prev => {
            const next = new Set(prev)
            if (next.has(index)) next.delete(index)
            else next.add(index)
            return next
        })
    }

    // Filter available products from inventory
    const products = inventoryItems || []
    const isEditing = !!budgetToEdit

    useEffect(() => {
        if (!inventoryItems || inventoryItems.length === 0) {
            fetchProducts()
        }
        fetchCustomers()
    }, [inventoryItems, fetchProducts, fetchCustomers])

    const form = useForm<BudgetFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            clientId: budgetToEdit?.clientId || urlClientId || "",
            date: budgetToEdit ? new Date(budgetToEdit.date) : new Date(),
            validUntil: budgetToEdit?.validUntil ? new Date(budgetToEdit.validUntil) : undefined,
            currency: (budgetToEdit?.currency as 'USD' | 'CUP') || 'USD',
            status: (budgetToEdit?.status as any) || 'DRAFT',
            items: budgetToEdit?.items.map(item => ({
                ...item,
                productId: item.productId || "custom",
                name: item.name,
                unitPrice: item.unitPrice,
                quantity: item.quantity
            })) || (initialItems.length > 0 ? initialItems.map(item => ({
                productId: item.productId,
                name: item.product?.name || "Producto",
                quantity: item.quantity,
                unitPrice: Number(item.product?.price || 0),
            })) : [{ productId: "", name: "", quantity: 1, unitPrice: 0 }]),
            discountType: budgetToEdit?.discountType,
            discountValue: budgetToEdit?.discountValue,
            notes: budgetToEdit?.notes || "",
        },
    })

    const { fields, append, remove, update, replace } = useFieldArray({
        control: form.control,
        name: "items",
    })


    // Update product details when product is selected
    const handleProductSelect = (index: number, productId: string) => {
        const product = products.find(p => p.id === productId)
        if (product) {
            update(index, {
                productId: product.id,
                name: product.name,
                unitPrice: product.saleUsd,
                quantity: form.getValues(`items.${index}.quantity`) || 1
            })
        }
    }


    // Conflict resolution state
    const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false)
    const [pendingKitItems, setPendingKitItems] = useState<any[]>([])


    // Reset answers when kit selection changes or dialog opens
    useEffect(() => {
        if (!isKitDialogOpen) {
            setSelectedKitId("")
            setKitAnswers({})
            setCalculatedKitItems([])
            return
        }
    }, [isKitDialogOpen])

    useEffect(() => {
        if (!selectedKitId) {
            setKitAnswers({})
            setCalculatedKitItems([])
            return
        }

        const selectedKit = kits.find(k => k.id === selectedKitId)
        if (!selectedKit) return

        // Initialize default answers (first option)
        const initialAnswers: Record<string, string> = {}
        if (selectedKit.attributes) {
            selectedKit.attributes.forEach(attr => {
                if (attr.options.length > 0) {
                    initialAnswers[attr.name] = attr.options[0].value
                }
            })
        }
        setKitAnswers(initialAnswers)

    }, [selectedKitId, kits])

    // Calculate items whenever answers change
    useEffect(() => {
        const selectedKit = kits.find(k => k.id === selectedKitId)
        if (!selectedKit) return

        // 1. Base Items
        const itemsMap = new Map<string, number>() // productId -> quantity

        selectedKit.products.forEach(p => {
            itemsMap.set(p.productId, (itemsMap.get(p.productId) || 0) + p.quantity)
        })

        // 2. Apply Variations
        if (selectedKit.attributes) {
            selectedKit.attributes.forEach(attr => {
                const answer = kitAnswers[attr.name]
                if (!answer) return

                const option = attr.options.find(o => o.value === answer)
                if (!option || !option.variations) return

                option.variations.forEach(v => {
                    const currentQty = itemsMap.get(v.productId) || 0
                    itemsMap.set(v.productId, currentQty + v.quantityAdjustment)
                })
            })
        }

        // 3. Convert back to array and enrich with Product details
        const calculated: any[] = []
        itemsMap.forEach((qty, productId) => {
            if (qty <= 0) return // Filter out removed items

            const product = products.find(p => p.id === productId)
            if (product) {
                calculated.push({
                    productId: product.id,
                    name: product.name,
                    quantity: qty,
                    unitPrice: product.saleUsd
                })
            }
        })

        setCalculatedKitItems(calculated)

    }, [selectedKitId, kitAnswers, kits, products])


    const handleLoadKit = () => {
        const selectedKit = kits.find(k => k.id === selectedKitId)
        if (!selectedKit) return

        const currentItems = form.getValues().items
        const isSingleEmptyItem = currentItems.length === 1 && !currentItems[0].productId

        // --- MANUFACTURE KIT: single line item ---
        if (selectedKit.type === 'manufacture') {
            const kitItem = {
                productId: `kit-${selectedKit.id}`,
                name: selectedKit.name,
                quantity: 1,
                unitPrice: Number((selectedKit.basePrice || 0).toFixed(2)),
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
            setKitAnswers({})
            return
        }

        // --- SALE / PURCHASE KIT: expand into individual lines ---
        if (calculatedKitItems.length === 0) return

        // Check for conflicts
        const hasConflicts = calculatedKitItems.some(newItem =>
            currentItems.some(existing => existing.productId === newItem.productId)
        )

        if (hasConflicts && !isSingleEmptyItem) {
            setPendingKitItems(calculatedKitItems)
            setIsConflictDialogOpen(true)
            setIsKitDialogOpen(false)
            return
        }

        if (isSingleEmptyItem) {
            replace(calculatedKitItems)
        } else {
            append(calculatedKitItems)
        }

        setIsKitDialogOpen(false)
        setSelectedKitId("")
        setKitAnswers({})
    }

    const resolveConflict = (action: 'replace' | 'skip') => {
        const currentItems = form.getValues().items
        // Check specifically for the placeholder empty item
        const isSingleEmptyItem = currentItems.length === 1 && !currentItems[0].productId && !currentItems[0].name

        if (action === 'replace') {
            // Replace strategy
            const pendingIds = new Set(pendingKitItems.map(i => i.productId))
            const nonConflictingExisting = currentItems.filter(i => !pendingIds.has(i.productId))

            const combined = [...nonConflictingExisting, ...pendingKitItems]
            replace(combined)
            toast.success("Kit cargado (productos duplicados reemplazados)")
        } else {
            // Skip strategy
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

    const handleCurrencyChange = (newCurrency: 'USD' | 'CUP') => {
        const oldCurrency = form.getValues('currency')
        if (newCurrency === oldCurrency) return

        // Update currency immediately
        form.setValue('currency', newCurrency)

        // Convert items
        const currentItems = form.getValues('items')
        const updatedItems = currentItems.map(item => {
            const product = products.find(p => p.id === item.productId)
            let newUnitPrice = item.unitPrice

            if (newCurrency === 'CUP') {
                // Switching to CUP
                if (product && product.saleCup > 0) {
                    newUnitPrice = product.saleCup
                } else {
                    newUnitPrice = item.unitPrice * usdRate
                }
            } else {
                // Switching to USD
                if (product && product.saleUsd > 0) {
                    newUnitPrice = product.saleUsd
                } else {
                    newUnitPrice = item.unitPrice / usdRate
                }
            }

            return {
                ...item,
                unitPrice: Number(newUnitPrice.toFixed(2))
            }
        })

        form.setValue('items', updatedItems)

        // Convert Fixed Discount or Target Price
        const discountType = form.getValues('discountType')
        const discountValue = form.getValues('discountValue')

        if (discountValue && (discountType === 'FIXED' || discountType === 'TARGET_PRICE')) {
            let newDiscountValue = discountValue
            if (newCurrency === 'CUP') {
                newDiscountValue = discountValue * usdRate
            } else {
                newDiscountValue = discountValue / usdRate
            }
            form.setValue('discountValue', Number(newDiscountValue.toFixed(2)))
        }
    }

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsLoading(true)
        try {
            const selectedCustomer = customers.find(c => c.id === values.clientId)

            const calculatedSubtotal = values.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
            let calculatedDiscount = 0
            if (values.discountType === 'PERCENTAGE' && values.discountValue) {
                calculatedDiscount = calculatedSubtotal * (values.discountValue / 100)
            } else if (values.discountType === 'FIXED' && values.discountValue) {
                calculatedDiscount = values.discountValue
            } else if (values.discountType === 'TARGET_PRICE' && values.discountValue) {
                calculatedDiscount = Math.max(0, calculatedSubtotal - values.discountValue)
            }
            const totalAmount = Math.max(0, calculatedSubtotal - calculatedDiscount)

            const budgetData = {
                clientId: values.clientId,
                clientName: selectedCustomer ? selectedCustomer.name : 'Unknown',
                date: values.date.toISOString(),
                validUntil: values.validUntil?.toISOString(),
                status: values.status,
                items: values.items.map(item => ({
                    productId: item.productId,
                    name: item.name,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    subtotal: item.quantity * item.unitPrice
                })),
                totalAmount: totalAmount,
                discountType: values.discountType,
                discountValue: values.discountValue,
                notes: values.notes
            }

            let result;
            if (isEditing && budgetToEdit) {
                result = await updateBudget(budgetToEdit.id, budgetData)
            } else {
                result = await createBudget(budgetData)
            }

            if (result.success && result.data) {
                // Map the server result to our Budget interface
                const serverBudget = result.data
                const mappedBudget: Budget = {
                    id: serverBudget.id,
                    displayId: `PRE-${new Date(serverBudget.createdAt).getFullYear()}-${String(serverBudget.number || 0).padStart(4, '0')}`,
                    name: serverBudget.name || "",
                    clientId: serverBudget.clientId || "",
                    clientName: selectedCustomer ? selectedCustomer.name : 'Unknown',
                    date: serverBudget.createdAt.toISOString(),
                    validUntil: serverBudget.validUntil ? serverBudget.validUntil.toISOString() : undefined,
                    status: serverBudget.status as any,
                    totalAmount: Number(serverBudget.totalAmount),
                    currency: serverBudget.currency || 'USD',
                    discountType: serverBudget.discountType as any,
                    discountValue: serverBudget.discountValue ? Number(serverBudget.discountValue) : undefined,
                    notes: serverBudget.notes || "",
                    items: serverBudget.items.map((i: any) => ({
                        id: i.id,
                        productId: i.productId || "",
                        name: i.name || "",
                        quantity: Number(i.quantity),
                        unitPrice: Number(i.unitPrice),
                        subtotal: Number(i.subtotal)
                    }))
                }

                setSavedBudget(mappedBudget)
                await fetchBudgets() // Sync store in background
                setIsReceiptOpen(true)
                toast.success(isEditing ? "Presupuesto actualizado" : "Presupuesto creado")
            } else {
                toast.error("Error al guardar el presupuesto")
            }
        } catch (error) {
            console.error("Error saving budget:", error)
            toast.error("Error inesperado al guardar")
        } finally {
            setIsLoading(false)
        }
    }

    // Watch items to calculate live total for display
    const watchedItems = form.watch("items")
    const watchedCurrency = form.watch("currency")
    const watchedDiscountType = form.watch("discountType")
    const watchedDiscountValue = form.watch("discountValue")

    const calculatedSubtotal = watchedItems?.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) || 0

    let calculatedDiscount = 0
    if (watchedDiscountType === 'PERCENTAGE' && watchedDiscountValue) {
        calculatedDiscount = calculatedSubtotal * (watchedDiscountValue / 100)
    } else if (watchedDiscountType === 'FIXED' && watchedDiscountValue) {
        calculatedDiscount = watchedDiscountValue
    } else if (watchedDiscountType === 'TARGET_PRICE' && watchedDiscountValue) {
        calculatedDiscount = Math.max(0, calculatedSubtotal - watchedDiscountValue)
    }

    const finalTotal = Math.max(0, calculatedSubtotal - calculatedDiscount)

    // Generate a preview budget object from current form values for the receipt dialog
    const getPreviewBudget = (): Budget => {
        // Use current form values for everything that is dynamic
        const currentValues = form.getValues()
        const selectedCustomer = customers.find(c => c.id === currentValues.clientId)

        // If we have a saved budget, prefer its ID and dates, but use form data for content
        const baseBudget = savedBudget || budgetToEdit

        return {
            id: baseBudget?.id || "preview-id",
            displayId: baseBudget?.displayId || `PRE-${new Date().getFullYear()}-XXXX`,
            clientId: currentValues.clientId,
            clientName: selectedCustomer ? selectedCustomer.name : 'Cliente Seleccionado',
            date: currentValues.date.toISOString(),
            validUntil: currentValues.validUntil?.toISOString(),
            status: currentValues.status,
            totalAmount: finalTotal,
            currency: currentValues.currency,
            discountType: currentValues.discountType,
            discountValue: currentValues.discountValue,
            notes: currentValues.notes || "",
            items: currentValues.items.map((item, index) => ({
                id: `preview-item-${index}`,
                productId: item.productId,
                name: item.name,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                subtotal: item.quantity * item.unitPrice
            }))
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                    {isEditing ? "Editar Presupuesto" : "Nuevo Presupuesto"}
                </h1>
            </div>

            <Form {...form}>
                <form onSubmit={(e) => {
                    e.preventDefault()
                    // Remove any empty rows before validation runs
                    const current = form.getValues('items')
                    const filled = current.filter((i: any) => i.productId && i.productId.trim() !== '')
                    if (filled.length !== current.length) form.setValue('items', filled)
                    form.handleSubmit(onSubmit, (errors) => {
                        console.error("Form validation errors:", JSON.stringify(errors, null, 2));
                        toast.error("Por favor corrige los errores en el formulario");
                    })(e)
                }} className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column: Form Details */}
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="border-0 shadow-none -mx-4 sm:mx-0 sm:border sm:shadow-sm">
                                <CardHeader className="px-4 sm:px-6">
                                    <CardTitle>Detalles Generales</CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4 sm:px-6">
                                    {/* Name field removed */}
                                    <FormField
                                        control={form.control}
                                        name="clientId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Cliente</FormLabel>
                                                <Select
                                                    onValueChange={field.onChange}
                                                    defaultValue={field.value}
                                                    value={field.value}
                                                    disabled={!!urlClientId || !!budgetToEdit}
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
                                                        <SelectItem value="DRAFT">Borrador</SelectItem>
                                                        <SelectItem value="SENT">Enviado</SelectItem>
                                                        <SelectItem value="APPROVED">Aprobado</SelectItem>
                                                        <SelectItem value="PAID">Pagado</SelectItem>
                                                        <SelectItem value="CANCELLED">Cancelado</SelectItem>
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
                                                <FormLabel>Fecha de presupuesto</FormLabel>
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
                                                                date > new Date() || date < new Date("1900-01-01")
                                                            }
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />


                                </CardContent>
                            </Card>

                            <Card className="border-0 shadow-none max-w-[100vw] overflow-hidden -mx-6 sm:mx-0 sm:border sm:shadow-sm sm:rounded-lg">
                                <CardHeader className="px-6 py-4 border-b border-slate-100 sm:px-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <CardTitle className="text-base font-semibold">Artículos del Presupuesto</CardTitle>

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
                                                                                {kit.name} — {kit.type === 'manufacture' ? '🏗️ Fabricación' : '📦 Venta'} ({kit.products ? kit.products.length : 0} productos)
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
                                                                    {isManufacture ? (
                                                                        <>
                                                                            <div className="flex items-start gap-2 text-xs bg-purple-50 border border-purple-200 text-purple-800 p-2.5 rounded-md">
                                                                                <span className="mt-0.5">🏗️</span>
                                                                                <span>Este kit de <strong>fabricación</strong> se añadirá como <strong>una sola línea</strong> en el presupuesto. Los sub-productos no aparecerán en el recibo.</span>
                                                                            </div>
                                                                            <div className="text-sm text-slate-500 bg-slate-50 p-3 rounded-md">
                                                                                <p className="font-medium mb-1 text-slate-700">Componentes internos:</p>
                                                                                <ul className="list-disc pl-4 space-y-1">
                                                                                    {selectedKit.products.map((p, i) => {
                                                                                        const product = products.find(prod => prod.id === p.productId)
                                                                                        return <li key={i}>{p.quantity}x {product?.name || 'Producto desconocido'}</li>
                                                                                    })}
                                                                                </ul>
                                                                            </div>
                                                                        </>
                                                                    ) : (
                                                                        <div className="space-y-4">
                                                                            {/* Conditional Logic / Attributes */}
                                                                            {selectedKit.attributes?.map((attr, idx) => (
                                                                                <div key={idx} className="space-y-2 border-t pt-2">
                                                                                    <Label className="text-sm font-semibold text-slate-700">{attr.name}</Label>
                                                                                    <RadioGroup
                                                                                        value={kitAnswers[attr.name] || ""}
                                                                                        onValueChange={(val) => setKitAnswers({ ...kitAnswers, [attr.name]: val })}
                                                                                        className="flex flex-col space-y-1"
                                                                                    >
                                                                                        {attr.options.map((opt, optIdx) => (
                                                                                            <div key={optIdx} className="flex items-center space-x-2">
                                                                                                <RadioGroupItem value={opt.value} id={`opt-${idx}-${optIdx}`} />
                                                                                                <Label htmlFor={`opt-${idx}-${optIdx}`} className="font-normal cursor-pointer">{opt.label}</Label>
                                                                                            </div>
                                                                                        ))}
                                                                                    </RadioGroup>
                                                                                </div>
                                                                            ))}
                                                                            <div className="text-sm text-slate-500 bg-slate-50 p-3 rounded-md">
                                                                                <p className="font-medium mb-1">Contenido Final:</p>
                                                                                {calculatedKitItems.length > 0 ? (
                                                                                    <ul className="list-disc pl-4 space-y-1">
                                                                                        {calculatedKitItems.map((item, i) => (
                                                                                            <li key={i}>{item.quantity}x {item.name}</li>
                                                                                        ))}
                                                                                    </ul>
                                                                                ) : (
                                                                                    <p className="italic text-slate-400">Selecciona un kit para ver contenido</p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )}
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
                                <CardContent className="p-0">

                                    {/* Mobile View (Cards) */}
                                    <div className="md:hidden space-y-0 px-4">
                                        {fields.map((field, index) => {
                                            const quantity = form.watch(`items.${index}.quantity`) || 0
                                            const unitPrice = form.watch(`items.${index}.unitPrice`) || 0
                                            const subtotal = quantity * unitPrice
                                            const currentCurrency = form.watch('currency')
                                            const secondaryPrice = currentCurrency === 'USD'
                                                ? unitPrice * usdRate
                                                : unitPrice / usdRate
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
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>

                                                    <div className="pr-10">
                                                        <FormField
                                                            control={form.control}
                                                            name={`items.${index}.productId`}
                                                            render={({ field: selectField }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Descripción</FormLabel>
                                                                    {form.watch(`items.${index}.isManufactureKit`) ? (
                                                                        <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-purple-200 bg-purple-50">
                                                                            <span className="text-sm font-medium text-purple-900 truncate">{form.watch(`items.${index}.name`)}</span>
                                                                            <span className="ml-auto text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full whitespace-nowrap">🏗️ Kit</span>
                                                                        </div>
                                                                    ) : (
                                                                        <Select
                                                                            onValueChange={(val) => {
                                                                                const currentItems = form.getValues().items
                                                                                const isDuplicate = currentItems.some((item, idx) => idx !== index && item.productId === val)

                                                                                if (isDuplicate) {
                                                                                    toast.error("Este producto ya está añadido al presupuesto")
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
                                                                    )}
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>

                                                    {/* Hidden Inputs for non-displayed fields */}
                                                    <input type="hidden" {...form.register(`items.${index}.name`)} />

                                                    <div className="grid grid-cols-2 gap-3">
                                                        <FormField
                                                            control={form.control}
                                                            name={`items.${index}.quantity`}
                                                            render={({ field: qtyField }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Cantidad</FormLabel>
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

                                                        <FormField
                                                            control={form.control}
                                                            name={`items.${index}.unitPrice`}
                                                            render={({ field: priceField }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Precio Unit.</FormLabel>
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
                                                                                <div className="flex justify-end">
                                                                                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
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

                                                    <div className="pt-2 flex justify-between items-center bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                                                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Total</span>
                                                        <div className="text-right flex items-center gap-2 justify-end">
                                                            {showMultiCurrency && (
                                                                <span className="text-xs text-slate-400">
                                                                    {currentCurrency === 'USD' ? 'CUP' : 'USD'} {secondarySubtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                </span>
                                                            )}
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                step="any"
                                                                className="h-8 w-24 text-right font-bold text-slate-900 border-none bg-transparent shadow-none focus-visible:ring-0 px-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                value={subtotal ? subtotal.toFixed(2) : ""}
                                                                onChange={(e) => {
                                                                    const newTotal = parseFloat(e.target.value) || 0
                                                                    const newUnitPrice = quantity > 0 ? newTotal / quantity : 0
                                                                    form.setValue(`items.${index}.unitPrice`, newUnitPrice)
                                                                }}
                                                            />
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
                                                    <TableHead className="w-[100px] text-center">Cantidad</TableHead>
                                                    <TableHead className="w-[150px] text-right">Precio Unit.</TableHead>
                                                    <TableHead className="w-[150px] text-right">Total</TableHead>
                                                    <TableHead className="w-[50px]"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {fields.map((field, index) => {
                                                    const quantity = form.watch(`items.${index}.quantity`) || 0
                                                    const unitPrice = form.watch(`items.${index}.unitPrice`) || 0
                                                    const subtotal = quantity * unitPrice
                                                    const currentCurrency = form.watch('currency')
                                                    const isKit = form.watch(`items.${index}.isManufactureKit`)
                                                    const kitComponents = form.watch(`items.${index}.kitComponents`) || []
                                                    const rowProductId = form.watch(`items.${index}.productId`)
                                                    const prod = products.find(p => p.id === rowProductId)

                                                    // Cost base: for kits = sum of component costs, for products = their own cost
                                                    const costBase = isKit
                                                        ? kitComponents.reduce((acc: number, comp: any) => {
                                                            const cp = products.find((p: any) => p.id === comp.productId)
                                                            const cpCost = cp ? ((cp.useWeightedCost && cp.weightedCost) ? cp.weightedCost : (cp.costUsd ?? 0)) : 0
                                                            return acc + cpCost * comp.quantity
                                                        }, 0)
                                                        : prod ? ((prod.useWeightedCost && prod.weightedCost) ? prod.weightedCost : (prod.costUsd ?? 0)) : 0

                                                    // Calculate secondary currency values
                                                    const exchangeRate = currentCurrency === 'USD' ? usdRate : (1 / usdRate)

                                                    const secondaryPrice = currentCurrency === 'USD'
                                                        ? unitPrice * usdRate
                                                        : unitPrice / usdRate

                                                    const secondarySubtotal = quantity * secondaryPrice

                                                    const priceUsd = currentCurrency === 'CUP' ? unitPrice / usdRate : unitPrice
                                                    const rowProfit = priceUsd - costBase
                                                    const rowMargin = priceUsd > 0 ? (rowProfit / priceUsd) * 100 : 0
                                                    const showMargin = showProfitability && (prod != null || isKit)

                                                    return (
                                                        <React.Fragment key={field.id}>
                                                            <TableRow className="border-b-0">
                                                                <TableCell className={(showMultiCurrency || showProfitability) ? "align-top" : ""}>
                                                                    <FormField
                                                                        control={form.control}
                                                                        name={`items.${index}.productId`}
                                                                        render={({ field: selectField }) => (
                                                                            <FormItem>
                                                                                {form.watch(`items.${index}.isManufactureKit`) ? (
                                                                                    <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-purple-200 bg-purple-50">
                                                                                        <span className="text-sm font-medium text-purple-900 truncate">{form.watch(`items.${index}.name`)}</span>
                                                                                        <span className="ml-auto text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full whitespace-nowrap">🏗️ Kit</span>
                                                                                    </div>
                                                                                ) : (
                                                                                    <Select
                                                                                        onValueChange={(val) => {
                                                                                            const currentItems = form.getValues().items
                                                                                            const isDuplicate = currentItems.some((item, idx) => idx !== index && item.productId === val)

                                                                                            if (isDuplicate) {
                                                                                                toast.error("Este producto ya está añadido al presupuesto")
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
                                                                                )}
                                                                            </FormItem>
                                                                        )}
                                                                    />
                                                                </TableCell>
                                                                <TableCell className={(showMultiCurrency || showProfitability) ? "align-top text-center" : "align-middle text-center"}>
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
                                                                                        className="h-9 text-center"
                                                                                    />
                                                                                </FormControl>
                                                                            </FormItem>
                                                                        )}
                                                                    />
                                                                </TableCell>
                                                                <TableCell className={(showMultiCurrency || showProfitability) ? "align-top" : "align-middle"}>
                                                                    <FormField
                                                                        control={form.control}
                                                                        name={`items.${index}.unitPrice`}
                                                                        render={({ field: priceField }) => {
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
                                                                                                className="h-9 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                                                                                            {showMargin && (
                                                                                                <div className="flex justify-end mt-1">
                                                                                                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${rowMargin >= 20 ? 'bg-emerald-50 text-emerald-700 ring-emerald-500/20' : rowMargin >= 0 ? 'bg-amber-50 text-amber-700 ring-amber-500/20' : 'bg-rose-50 text-rose-700 ring-rose-500/20'}`}>
                                                                                                        {rowMargin.toFixed(0)}% margen
                                                                                                    </span>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    </FormControl>
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
                                                                            onChange={(e) => {
                                                                                const newTotal = parseFloat(e.target.value) || 0
                                                                                const newUnitPrice = quantity > 0 ? newTotal / quantity : 0
                                                                                form.setValue(`items.${index}.unitPrice`, newUnitPrice)
                                                                            }}
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
                                                                <TableCell className={(showMultiCurrency || showProfitability) ? "align-top pt-1" : ""}>
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
                                                            {/* Expandable kit components panel (desktop) */}
                                                            {
                                                                form.watch(`items.${index}.isManufactureKit`) && (
                                                                    <>
                                                                        <TableRow className="border-b-0">
                                                                            <TableCell colSpan={5} className="py-0 px-4">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => toggleKitRow(index)}
                                                                                    className="flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-800 py-1.5 font-medium transition-colors"
                                                                                >
                                                                                    {expandedKitRows.has(index)
                                                                                        ? <ChevronDown className="w-3 h-3" />
                                                                                        : <ChevronRight className="w-3 h-3" />}
                                                                                    <Package className="w-3 h-3" />
                                                                                    Componentes del kit ({(form.watch(`items.${index}.kitComponents`) || []).length})
                                                                                </button>
                                                                            </TableCell>
                                                                        </TableRow>
                                                                        {expandedKitRows.has(index) && (
                                                                            <TableRow className="bg-purple-50/40 border-b border-purple-100">
                                                                                <TableCell colSpan={5} className="py-3 px-6">
                                                                                    <div className="space-y-2">
                                                                                        <p className="text-[11px] font-semibold text-purple-700 uppercase tracking-wide mb-2">Componentes — editar cantidades para inventario</p>
                                                                                        {/* Header */}
                                                                                        <div className="grid grid-cols-[1fr_80px_90px] gap-3 pb-1 border-b border-purple-100">
                                                                                            <span className="text-[10px] font-semibold text-slate-500 uppercase">Producto</span>
                                                                                            <span className="text-[10px] font-semibold text-slate-500 uppercase text-center">Cant.</span>
                                                                                            <span className="text-[10px] font-semibold text-slate-500 uppercase text-right">Costo unit.</span>
                                                                                        </div>
                                                                                        {(form.watch(`items.${index}.kitComponents`) || []).map((comp: any, ci: number) => {
                                                                                            const compProduct = products.find(p => p.id === comp.productId)
                                                                                            const costUsd = compProduct ? ((compProduct.useWeightedCost && compProduct.weightedCost) ? compProduct.weightedCost : compProduct.costUsd) : null
                                                                                            return (
                                                                                                <div key={ci} className="grid grid-cols-[1fr_auto_90px] gap-3 items-center">
                                                                                                    <span className="text-sm text-slate-700 truncate">{compProduct?.name || comp.productId}</span>
                                                                                                    <div className="flex items-center border border-slate-200 rounded-md overflow-hidden h-7">
                                                                                                        <button
                                                                                                            type="button"
                                                                                                            onClick={() => {
                                                                                                                const current = form.getValues(`items.${index}.kitComponents`) || []
                                                                                                                const updated = current.map((c: any, i: number) => i === ci ? { ...c, quantity: Math.max(0, c.quantity - 1) } : c)
                                                                                                                form.setValue(`items.${index}.kitComponents`, updated)
                                                                                                            }}
                                                                                                            className="px-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 h-full text-base leading-none transition-colors"
                                                                                                        >−</button>
                                                                                                        <Input
                                                                                                            type="number"
                                                                                                            min={0}
                                                                                                            step={1}
                                                                                                            value={comp.quantity}
                                                                                                            onChange={(e) => {
                                                                                                                const val = parseFloat(e.target.value) || 0
                                                                                                                const current = form.getValues(`items.${index}.kitComponents`) || []
                                                                                                                const updated = current.map((c: any, i: number) => i === ci ? { ...c, quantity: val } : c)
                                                                                                                form.setValue(`items.${index}.kitComponents`, updated)
                                                                                                            }}
                                                                                                            className="h-7 w-12 text-center text-sm border-0 border-x border-slate-200 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                                                        />
                                                                                                        <button
                                                                                                            type="button"
                                                                                                            onClick={() => {
                                                                                                                const current = form.getValues(`items.${index}.kitComponents`) || []
                                                                                                                const updated = current.map((c: any, i: number) => i === ci ? { ...c, quantity: c.quantity + 1 } : c)
                                                                                                                form.setValue(`items.${index}.kitComponents`, updated)
                                                                                                            }}
                                                                                                            className="px-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 h-full text-base leading-none transition-colors"
                                                                                                        >+</button>
                                                                                                    </div>
                                                                                                    <span className="text-sm text-right text-slate-600 font-medium">
                                                                                                        {costUsd != null ? `$${costUsd.toFixed(2)}` : <span className="text-slate-300 italic text-xs">—</span>}
                                                                                                    </span>
                                                                                                </div>
                                                                                            )
                                                                                        })}
                                                                                    </div>
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        )}
                                                                    </>
                                                                )
                                                            }
                                                        </React.Fragment>
                                                    )
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <div className="p-4 flex justify-center border-t border-slate-100 bg-slate-50/30">
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
                                                append({ productId: "", name: "", quantity: 1, unitPrice: 0 })
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
                                                        placeholder="Notas adicionales visibles en el presupuesto..."
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
                                        <div className="space-y-3 pt-3">
                                            <span className="text-xs font-medium text-slate-500">Descuento</span>
                                            <div className="flex items-center gap-2">
                                                <FormField
                                                    control={form.control}
                                                    name="discountType"
                                                    render={({ field }) => (
                                                        <FormItem className="flex-1">
                                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                                        {/* Internal Profitability Summary — totals only */}
                                        {showProfitability && (() => {
                                            const totalRevUsd = (watchedItems || []).reduce((s: number, i: any) => {
                                                const p = watchedCurrency === 'CUP' ? i.unitPrice / usdRate : i.unitPrice
                                                return s + p * i.quantity
                                            }, 0)
                                            const totalCostUsd = (watchedItems || []).reduce((s: number, i: any) => {
                                                if (i.isManufactureKit) {
                                                    const compCost = (i.kitComponents || []).reduce((cs: number, comp: any) => {
                                                        const cp = products.find((p: any) => p.id === comp.productId)
                                                        const cpCost = cp ? ((cp.useWeightedCost && cp.weightedCost) ? cp.weightedCost : (cp.costUsd ?? 0)) : 0
                                                        return cs + cpCost * comp.quantity
                                                    }, 0)
                                                    return s + compCost * (i.quantity || 1)
                                                }
                                                const prod = products.find((p: any) => p.id === i.productId)
                                                const c = prod ? ((prod.useWeightedCost && prod.weightedCost) ? prod.weightedCost : (prod.costUsd ?? 0)) : 0
                                                return s + c * i.quantity
                                            }, 0)
                                            const totalProfit = totalRevUsd - totalCostUsd
                                            const totalMargin = totalRevUsd > 0 ? (totalProfit / totalRevUsd) * 100 : 0
                                            const sym = watchedCurrency === 'CUP' ? '₱' : '$'
                                            const rate = watchedCurrency === 'CUP' ? usdRate : 1

                                            return (
                                                <div className="border-t border-dashed border-emerald-100 pt-3 mt-1">
                                                    <div className="flex justify-between items-center text-xs font-bold">
                                                        <span className="text-slate-500 uppercase tracking-wider text-[10px]">📊 Beneficio</span>
                                                        <div className="flex items-center gap-1.5">
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
                                    <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex flex-col gap-3 md:static md:mt-4 md:p-0 md:bg-transparent md:border-transparent md:shadow-none">
                                        <div className="flex gap-2">
                                            {(isEditing && budgetToEdit) && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="w-full border-slate-300 text-slate-700 hover:bg-slate-50"
                                                    onClick={() => router.push(`/admin/invoices/new?budgetId=${budgetToEdit.id}`)}
                                                >
                                                    <Box className="mr-2 h-4 w-4" />
                                                    Convertir
                                                </Button>
                                            )}
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="w-full bg-white text-slate-700 hover:bg-slate-50 border-slate-200"
                                                onClick={() => {
                                                    setSavedBudget(undefined)
                                                    setIsReceiptOpen(true)
                                                }}
                                            >
                                                <Download className="mr-2 h-4 w-4" />
                                                Recibo
                                            </Button>
                                        </div>

                                        <Button type="submit" disabled={isLoading} className="w-full bg-slate-900 text-white hover:bg-slate-800">
                                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            {isEditing ? "Guardar Cambios" : "Crear Presupuesto"}
                                        </Button>
                                    </div>

                                    {/* Dialog uses getPreviewBudget() to always show latest data */}
                                    {(isReceiptOpen) && (
                                        <BudgetReceiptDialog
                                            budget={getPreviewBudget()}
                                            open={isReceiptOpen}
                                            onOpenChange={(open) => {
                                                setIsReceiptOpen(open)
                                            }}
                                        />
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                    {/* Spacer for sticky mobile bottom menu */}
                    <div className="h-24 md:hidden"></div>
                </form>
            </Form>

            <AlertDialog open={isConflictDialogOpen} onOpenChange={setIsConflictDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Conflictos de Productos Detectados</AlertDialogTitle>
                        <AlertDialogDescription>
                            El kit que estás intentando cargar contiene productos que ya están en el presupuesto.
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
        </div >
    )
}
