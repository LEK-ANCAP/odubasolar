
"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { CalendarIcon, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useInvoicesStore } from "@/hooks/use-invoices-store"
import { useAccountsStore } from "@/hooks/use-accounts-store"
import { generateId } from "@/lib/utils"

const formSchema = z.object({
    date: z.date(),
    amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
        message: "El monto debe ser mayor a 0",
    }),
    method: z.enum(['cash', 'transfer', 'card', 'other']),
    accountId: z.string().min(1, "Selecciona una cuenta"),
    notes: z.string().optional(),
})

interface PaymentDialogProps {
    invoiceId: string
    totalAmount: number
    remainingBalance: number
    currency: string
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
    onPaymentSuccess?: () => void
}

export function PaymentDialog({
    invoiceId,
    totalAmount,
    remainingBalance,
    currency,
    trigger,
    open,
    onOpenChange,
    onPaymentSuccess
}: PaymentDialogProps) {
    const [isOpen, setIsOpen] = useState(false)
    const { addPayment } = useInvoicesStore()
    const { accounts, addMovement } = useAccountsStore()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            date: new Date(),
            amount: remainingBalance.toString(),
            method: 'cash',
            accountId: '',
            notes: ''
        },
    })

    // Update default amount when dialog opens or remaining balance changes
    useEffect(() => {
        if (open || isOpen) {
            form.setValue('amount', remainingBalance.toFixed(2))
            form.clearErrors('amount')
        }
    }, [open, isOpen, remainingBalance, form])

    const handleSubmit = (values: z.infer<typeof formSchema>) => {
        try {
            const amount = Number(values.amount)

            if (amount > remainingBalance + 0.01) { // Small epsilon for float logic
                form.setError('amount', { message: `El monto no puede exceder el balance pendiente (${remainingBalance})` })
                return
            }

            const paymentId = generateId()

            // 1. Add Payment to Invoice
            addPayment(invoiceId, {
                id: paymentId,
                date: values.date.toISOString(),
                amount: amount,
                method: values.method as any,
                accountId: values.accountId,
                notes: values.notes
            })

            // 2. Add Movement to Account
            // We need to check if invoice currency matches account currency or handle conversion
            // strictly speaking. For now, we assume simple matching or ignore currency mismatch warnings
            // but ideally we should filter accounts by currency.

            addMovement({
                id: generateId(),
                accountId: values.accountId,
                date: values.date.toISOString(),
                description: `Pago Factura #${invoiceId}`,
                amount: amount, // Positive for income
                type: 'income',
                referenceId: invoiceId,
                category: 'Venta'
            })

            toast.success("Pago registrado correctamente")
            setIsOpen(false)
            onOpenChange?.(false)
            form.reset()
            onPaymentSuccess?.()
        } catch (error) {
            console.error(error)
            toast.error("Error al registrar el pago")
        }
    }

    // Filter accounts by currency if possible
    const availableAccounts = accounts.filter(a => a.currency === currency)

    return (
        <Dialog open={open !== undefined ? open : isOpen} onOpenChange={onOpenChange || setIsOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Registrar Pago</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Fecha</FormLabel>
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
                                                        <span>Selecciona una fecha</span>
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
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Monto ({currency})</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="any" {...field} />
                                    </FormControl>
                                    <p className="text-xs text-slate-500">Pendiente: {remainingBalance.toFixed(2)}</p>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="method"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Método de Pago</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona un método" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="cash">Efectivo</SelectItem>
                                            <SelectItem value="transfer">Transferencia</SelectItem>
                                            <SelectItem value="card">Tarjeta</SelectItem>
                                            <SelectItem value="other">Otro</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="accountId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cuenta de Destino</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona una cuenta" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {availableAccounts.length > 0 ? (
                                                availableAccounts.map(account => (
                                                    <SelectItem key={account.id} value={account.id}>
                                                        {account.name} ({account.currency})
                                                    </SelectItem>
                                                ))
                                            ) : (
                                                <SelectItem value="none" disabled>No hay cuentas en {currency}</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notas (Opcional)</FormLabel>
                                    <FormControl>
                                        <Textarea className="resize-none" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit">Registrar Pago</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
