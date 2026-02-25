"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
import { createExpenseTemplate, updateExpenseTemplate } from "@/app/actions/expenses"

// Zod Schema
const formSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    description: z.string().optional(),
    amount: z.coerce.number().min(0, "Amount must be positive"),
    accountId: z.string().min(1, "Account is required"),
    category: z.string().min(1, "Category is required"),
})

interface ExpenseTemplate {
    id: string
    name: string
    description?: string | null
    amount: number
    accountId: string
    category: string
}

interface Account {
    id: string
    name: string
}

interface ExpenseConfigDialogProps {
    template?: ExpenseTemplate
    accounts: Account[]
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
    onSuccess?: () => void
}

export function ExpenseConfigDialog({
    template,
    accounts,
    trigger,
    open,
    onOpenChange,
    onSuccess
}: ExpenseConfigDialogProps) {
    const [isOpen, setIsOpen] = useState(open || false)
    const [isLoading, setIsLoading] = useState(false)

    // Sync internal state with external control if provided
    useEffect(() => {
        if (open !== undefined) {
            setIsOpen(open)
        }
    }, [open])

    const handleOpenChange = (value: boolean) => {
        setIsOpen(value)
        onOpenChange?.(value)
    }

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: template?.name || "",
            description: template?.description || "",
            amount: template?.amount ? Number(template.amount) : 0,
            accountId: template?.accountId || "",
            category: template?.category || "OPERATIONAL",
        },
    })

    // Reset form when template changes
    useEffect(() => {
        if (template) {
            form.reset({
                name: template.name,
                description: template.description || "",
                amount: Number(template.amount),
                accountId: template.accountId,
                category: template.category,
            })
        } else {
            form.reset({
                name: "",
                description: "",
                amount: 0,
                accountId: "",
                category: "OPERATIONAL",
            })
        }
    }, [template, form])


    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true)
        try {
            if (template) {
                await updateExpenseTemplate(template.id, values)
            } else {
                await createExpenseTemplate(values)
            }
            handleOpenChange(false)
            form.reset()
            onSuccess?.()
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Nuevo Gasto Configurable
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{template ? "Editar Gasto Configurable" : "Nuevo Gasto Configurable"}</DialogTitle>
                    <DialogDescription>
                        Configura los detalles del gasto recurrente o variable.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control as any}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre del Gasto</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej. Salario Mensual" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control as any}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Monto Estimado</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control as any}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Categoría</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select category" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="OPERATIONAL">Operativo</SelectItem>
                                                <SelectItem value="SALARY">Salarios</SelectItem>
                                                <SelectItem value="TRANSPORT">Transporte</SelectItem>
                                                <SelectItem value="FOOD">Comidas</SelectItem>
                                                <SelectItem value="MARKETING">Marketing</SelectItem>
                                                <SelectItem value="OTHER">Otros</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control as any}
                            name="accountId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cuenta de Origen</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar cuenta" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {accounts.filter(acc => acc && acc.id && acc.id.trim() !== "").map((acc) => (
                                                <SelectItem key={acc.id} value={acc.id}>
                                                    {acc.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control as any}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descripción (Opcional)</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Detalles adicionales..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Guardar
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
