"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useCustomersStore, Customer } from "@/hooks/use-customers-store"
import { Loader2 } from "lucide-react"

const formSchema = z.object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    email: z.string().email("Email inválido").optional().or(z.literal("")),
    phone: z.string().optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
})

interface CustomerModalProps {
    isOpen: boolean
    onClose: () => void
    customerToEdit?: Customer | null
}

export function CustomerModal({ isOpen, onClose, customerToEdit }: CustomerModalProps) {
    const { addCustomer, updateCustomer } = useCustomersStore()
    const [isLoading, setIsLoading] = useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            email: "",
            phone: "",
            address: "",
            notes: "",
        },
    })

    useEffect(() => {
        if (customerToEdit) {
            form.reset({
                name: customerToEdit.name,
                email: customerToEdit.email || "",
                phone: customerToEdit.phone || "",
                address: customerToEdit.address || "",
                notes: customerToEdit.notes || "",
            })
        } else {
            form.reset({
                name: "",
                email: "",
                phone: "",
                address: "",
                notes: "",
            })
        }
    }, [customerToEdit, form, isOpen])

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsLoading(true)
        try {
            if (customerToEdit) {
                updateCustomer(customerToEdit.id, values)
            } else {
                const newCustomer: Customer = {
                    id: crypto.randomUUID(),
                    ...values,
                    status: 'active',
                    createdAt: new Date().toISOString(),
                    totalSpent: 0,
                    ordersCount: 0
                }
                addCustomer(newCustomer)
            }
            onClose()
        } catch (error) {
            console.error("Error saving customer:", error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>
                        {customerToEdit ? "Editar Cliente" : "Nuevo Cliente"}
                    </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Nombre del cliente" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input placeholder="email@ejemplo.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Teléfono</FormLabel>
                                        <FormControl>
                                            <Input placeholder="+53 52222222" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Dirección</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Dirección completa" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notas</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Notas adicionales..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isLoading} className="bg-slate-900 text-white hover:bg-slate-800">
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {customerToEdit ? "Guardar Cambios" : "Crear Cliente"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
