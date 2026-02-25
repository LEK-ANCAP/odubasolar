"use client"

import { useState } from "react"
import { formatCurrency } from "@/lib/utils" // Assuming this exists, otherwise standard logic
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, Pencil, Trash2, CalendarIcon, Loader2, FileText } from "lucide-react"
import { ExpenseConfigDialog } from "./expense-config-dialog"
import { deleteExpenseTemplate, registerExpense } from "@/app/actions/expenses"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ExpenseTemplate {
    id: string
    name: string
    description?: string | null
    amount: number
    accountId: string
    category: string
    account: {
        id: string
        name: string
    }
}

interface ExpensesListProps {
    templates: ExpenseTemplate[]
    accounts: { id: string; name: string }[]
}

export function ExpensesList({ templates, accounts }: ExpensesListProps) {
    const [editingTemplate, setEditingTemplate] = useState<ExpenseTemplate | null>(null)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

    // Registration State
    const [registeringId, setRegisteringId] = useState<string | null>(null)
    const [registerDialogOpen, setRegisterDialogOpen] = useState(false)
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())
    const [overrideAmount, setOverrideAmount] = useState<string>("")
    const [activeTemplateForRegister, setActiveTemplateForRegister] = useState<ExpenseTemplate | null>(null)

    const handleEdit = (template: ExpenseTemplate) => {
        setEditingTemplate(template)
        setIsEditDialogOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (confirm("¿Estás seguro de eliminar este gasto configurado?")) {
            await deleteExpenseTemplate(id)
        }
    }

    const openRegisterDialog = (template: ExpenseTemplate) => {
        setActiveTemplateForRegister(template)
        setOverrideAmount(template.amount.toString())
        setSelectedDate(new Date())
        setRegisterDialogOpen(true)
    }

    const handleRegister = async () => {
        if (!activeTemplateForRegister) return

        setRegisteringId(activeTemplateForRegister.id)
        try {
            await registerExpense(activeTemplateForRegister.id, {
                amount: Number(overrideAmount),
                date: selectedDate,
                description: activeTemplateForRegister.name // Could add date info here
            })
            setRegisterDialogOpen(false)
        } catch (error) {
            console.error(error)
        } finally {
            setRegisteringId(null)
        }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
                <Card key={template.id} className="flex flex-col">
                    <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <CardTitle className="text-base font-semibold">{template.name}</CardTitle>
                                <CardDescription className="text-xs">{template.account.name}</CardDescription>
                            </div>
                            <Badge variant="secondary" className="text-[10px] uppercase">{template.category}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 pb-3">
                        <div className="text-2xl font-bold">
                            ${Number(template.amount).toFixed(2)}
                        </div>
                        {template.description && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                {template.description}
                            </p>
                        )}
                    </CardContent>
                    <CardFooter className="pt-0 flex gap-2 justify-between">
                        <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleEdit(template)}>
                                <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(template.id)}>
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                        <Button size="sm" onClick={() => openRegisterDialog(template)} disabled={registeringId === template.id}>
                            {registeringId === template.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                            Registrar
                        </Button>
                    </CardFooter>
                </Card>
            ))}

            {templates.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center p-8 text-center border rounded-lg bg-slate-50/50 min-h-[300px]">
                    <FileText className="w-10 h-10 text-slate-300 mb-2" />
                    <h3 className="font-semibold text-lg text-slate-900">No hay gastos configurados</h3>
                    <p className="text-slate-500 text-sm max-w-sm mt-1">Usa el botón flotante (+) para crear tu primer gasto configurable y empezar a registrar operaciones.</p>
                </div>
            )}

            {/* Edit Dialog */}
            <ExpenseConfigDialog
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                template={editingTemplate || undefined}
                accounts={accounts}
                onSuccess={() => setEditingTemplate(null)}
            />

            {/* Register Confirmation Dialog */}
            <AlertDialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Registrar Gasto: {activeTemplateForRegister?.name}</AlertDialogTitle>
                        <AlertDialogDescription>
                            Confirma los detalles del gasto a registrar. Esto afectará el saldo de la cuenta seleccionada.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="date" className="text-right">Fecha</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "col-span-3 justify-start text-left font-normal",
                                            !selectedDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {selectedDate ? format(selectedDate, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={(d) => d && setSelectedDate(d)}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="amount" className="text-right">Monto</Label>
                            <Input
                                id="amount"
                                type="number"
                                value={overrideAmount}
                                onChange={(e) => setOverrideAmount(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRegister}>Confirmar Registro</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </div>
    )
}
