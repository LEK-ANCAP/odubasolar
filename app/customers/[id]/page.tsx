"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { useCustomersStore, Customer } from "@/hooks/use-customers-store"
import { useInvoicesStore, InvoicePayment } from "@/hooks/use-invoices-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ChevronLeft, Mail, Phone, MapPin, Calendar, DollarSign, Package, CreditCard, Clock, CheckCircle2, XCircle, AlertCircle, FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { getBudgetsByClient } from "@/app/actions/budgets"

export default function CustomerDetailPage() {
    const params = useParams()
    const router = useRouter()
    const { customers, updateCustomer } = useCustomersStore()
    const { invoices } = useInvoicesStore()
    const [customer, setCustomer] = useState<Customer | null>(null)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [editForm, setEditForm] = useState<Partial<Customer>>({})
    const [budgets, setBudgets] = useState<any[]>([])
    const [loadingBudgets, setLoadingBudgets] = useState(false)

    useEffect(() => {
        if (params.id) {
            const foundCustomer = customers.find(c => c.id === params.id)
            if (foundCustomer) {
                setCustomer(foundCustomer)
                // Fetch real budgets
                setLoadingBudgets(true)
                getBudgetsByClient(foundCustomer.id)
                    .then(res => {
                        if (res.success && res.data) {
                            setBudgets(res.data)
                        }
                    })
                    .finally(() => setLoadingBudgets(false))
            } else {
                // If not found, redirect to list
                router.push("/customers")
            }
        }
    }, [params.id, customers, router])

    // Calculate metrics from real budgets
    // Only count APPROVED or PAID budgets as "Spent"? Or all?
    // Let's assume APPROVED and PAID are real "sales".
    const approvedBudgets = budgets.filter(b => b.status === 'APPROVED' || b.status === 'PAID')
    const totalSpent = approvedBudgets.reduce((sum, b) => sum + b.totalAmount, 0)
    const budgetsCount = budgets.length
    const lastBudget = budgets[0] // Sorted by date desc in action

    const clientInvoices = customer ? invoices.filter(i => i.customerId === customer.id) : []

    const clientPayments = useMemo(() => {
        if (!customer) return []
        const payments: (InvoicePayment & { invoiceId: string, invoiceNumber: string, currency: string })[] = []

        // Validate that clientInvoices exists and is an array
        if (Array.isArray(clientInvoices)) {
            clientInvoices.forEach(invoice => {
                if (invoice.payments && Array.isArray(invoice.payments)) {
                    invoice.payments.forEach(payment => {
                        payments.push({
                            ...payment,
                            invoiceId: invoice.id,
                            invoiceNumber: invoice.id,
                            currency: invoice.currency
                        })
                    })
                }
            })
        }

        // Sort by date desc
        return payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }, [clientInvoices, customer])

    if (!customer) {
        return <div className="p-8 text-center text-slate-500">Cargando cliente...</div>
    }

    const handleEditClick = () => {
        if (customer) {
            setEditForm({
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                address: customer.address,
                notes: customer.notes
            })
            setIsEditOpen(true)
        }
    }

    const handleSaveCustomer = async () => {
        if (customer && editForm) {
            await updateCustomer(customer.id, editForm)
            // Update local state strictly to reflect changes immediately ensuring UI sync
            setCustomer(prev => prev ? { ...prev, ...editForm } : null)
            setIsEditOpen(false)
        }
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-10">
            {/* Header / Navigation */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8 -ml-2">
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">{customer.name}</h1>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                            <Badge variant="outline" className={
                                customer.status === 'active'
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-slate-100 text-slate-600 border-slate-200"
                            }>
                                {customer.status === 'active' ? 'Activo' : 'Inactivo'}
                            </Badge>
                            <span>Registrado desde {new Date(customer.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" onClick={handleEditClick}>
                            Editar Cliente
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Editar Cliente</DialogTitle>
                            <DialogDescription>
                                Modifique los datos del cliente aquí. Haga clic en guardar cuando termine.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">
                                    Nombre
                                </Label>
                                <Input
                                    id="name"
                                    value={editForm.name || ''}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="email" className="text-right">
                                    Email
                                </Label>
                                <Input
                                    id="email"
                                    value={editForm.email || ''}
                                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="phone" className="text-right">
                                    Teléfono
                                </Label>
                                <Input
                                    id="phone"
                                    value={editForm.phone || ''}
                                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="address" className="text-right">
                                    Dirección
                                </Label>
                                <Input
                                    id="address"
                                    value={editForm.address || ''}
                                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="notes" className="text-right">
                                    Notas
                                </Label>
                                <Textarea
                                    id="notes"
                                    value={editForm.notes || ''}
                                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" onClick={handleSaveCustomer}>Guardar Cambios</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Profile Info */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Información de Contacto</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-start gap-3">
                                <Mail className="w-4 h-4 text-slate-400 mt-0.5" />
                                <div>
                                    <span className="text-xs text-slate-500 block">Email</span>
                                    <span className="text-sm font-medium text-slate-700">{customer.email || "No especificado"}</span>
                                </div>
                            </div>
                            <Separator />
                            <div className="flex items-start gap-3">
                                <Phone className="w-4 h-4 text-slate-400 mt-0.5" />
                                <div>
                                    <span className="text-xs text-slate-500 block">Teléfono</span>
                                    <span className="text-sm font-medium text-slate-700">{customer.phone || "No especificado"}</span>
                                </div>
                            </div>
                            <Separator />
                            <div className="flex items-start gap-3">
                                <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                                <div>
                                    <span className="text-xs text-slate-500 block">Dirección</span>
                                    <span className="text-sm font-medium text-slate-700">{customer.address || "No especificada"}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Notas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-slate-600 whitespace-pre-wrap">
                                {customer.notes || "Sin notas adicionales."}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Stats & History */}
                <div className="md:col-span-2 space-y-6">

                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <Card>
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                <DollarSign className="w-5 h-5 text-emerald-600 mb-2 p-1 bg-emerald-50 rounded-full w-8 h-8" />
                                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Aprobado</span>
                                <span className="text-xl font-bold text-slate-900 mt-1">
                                    ${(totalSpent).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                <FileText className="w-5 h-5 text-blue-600 mb-2 p-1 bg-blue-50 rounded-full w-8 h-8" />
                                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Presupuestos</span>
                                <span className="text-xl font-bold text-slate-900 mt-1">{budgetsCount}</span>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                <Clock className="w-5 h-5 text-amber-600 mb-2 p-1 bg-amber-50 rounded-full w-8 h-8" />
                                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Último Proyecto</span>
                                <span className="text-sm font-bold text-slate-900 mt-1">
                                    {lastBudget ? new Date(lastBudget.createdAt).toLocaleDateString() : '-'}
                                </span>
                            </CardContent>
                        </Card>
                    </div>

                    <Tabs defaultValue="budgets" className="w-full">
                        <TabsList className="bg-slate-100 p-0.5 h-10 w-full justify-start rounded-lg mb-4">
                            <TabsTrigger value="budgets" className="rounded-md px-4 py-2 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">Presupuestos</TabsTrigger>
                            <TabsTrigger value="invoices" className="rounded-md px-4 py-2 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">Facturas</TabsTrigger>
                            <TabsTrigger value="payments" className="rounded-md px-4 py-2 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">Pagos</TabsTrigger>
                        </TabsList>

                        <TabsContent value="budgets" className="mt-0">
                            <Card>
                                <CardHeader className="py-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-sm font-medium">Historial de Presupuestos</CardTitle>
                                            <CardDescription>Cotizaciones realizadas para este cliente.</CardDescription>
                                        </div>
                                        <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800" onClick={() => router.push(`/budgets/new?clientId=${customer.id}`)}>
                                            Nuevo Presupuesto
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {loadingBudgets ? (
                                        <div className="p-8 text-center text-slate-500 text-sm">Cargando presupuestos...</div>
                                    ) : budgets.length === 0 ? (
                                        <div className="p-8 text-center text-slate-500 text-sm">No hay presupuestos registrados para este cliente.</div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-xs text-slate-500 bg-slate-50/50 uppercase border-b border-slate-100">
                                                    <tr>
                                                        <th className="px-6 py-3 font-medium">Nº</th>
                                                        <th className="px-6 py-3 font-medium">Fecha</th>
                                                        <th className="px-6 py-3 font-medium text-center">Estado</th>
                                                        <th className="px-6 py-3 font-medium text-center">Moneda</th>
                                                        <th className="px-6 py-3 font-medium text-right">Total</th>
                                                        <th className="px-6 py-3 font-medium"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {budgets.map((budget) => (
                                                        <tr key={budget.id} className="hover:bg-slate-50/50">
                                                            <td className="px-6 py-3 font-mono text-xs text-slate-600">{budget.displayId}</td>
                                                            <td className="px-6 py-3 text-slate-600">{new Date(budget.createdAt).toLocaleDateString()}</td>
                                                            <td className="px-6 py-3 text-center">
                                                                <Badge variant="outline" className={
                                                                    budget.status === 'APPROVED' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                                                        budget.status === 'SENT' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                                            budget.status === 'PAID' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                                                                budget.status === 'REJECTED' ? "bg-red-50 text-red-700 border-red-200" :
                                                                                    "bg-slate-100 text-slate-600 border-slate-200"
                                                                }>
                                                                    {budget.status === 'APPROVED' ? 'Aprobado' :
                                                                        budget.status === 'SENT' ? 'Enviado' :
                                                                            budget.status === 'DRAFT' ? 'Borrador' :
                                                                                budget.status === 'PAID' ? 'Pagado' :
                                                                                    budget.status === 'REJECTED' ? 'Rechazado' :
                                                                                        budget.status}
                                                                </Badge>
                                                            </td>
                                                            <td className="px-6 py-3 text-slate-600 text-center text-xs">{budget.currency}</td>
                                                            <td className="px-6 py-3 text-right font-medium text-slate-900">
                                                                ${budget.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                            </td>
                                                            <td className="px-6 py-3 text-right">
                                                                <Button variant="ghost" size="sm" onClick={() => router.push(`/budgets/${budget.id}`)}>
                                                                    Ver
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>



                        <TabsContent value="invoices" className="mt-0">
                            <Card>
                                <CardHeader className="py-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-sm font-medium">Historial de Facturas</CardTitle>
                                            <CardDescription>Facturas emitidas a este cliente.</CardDescription>
                                        </div>
                                        <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800" onClick={() => router.push(`/invoices/new?clientId=${customer.id}`)}>
                                            Nueva Factura
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {clientInvoices.length === 0 ? (
                                        <div className="p-8 text-center text-slate-500 text-sm">No hay facturas registradas para este cliente.</div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-xs text-slate-500 bg-slate-50/50 uppercase border-b border-slate-100">
                                                    <tr>
                                                        <th className="px-6 py-3 font-medium">Nº</th>
                                                        <th className="px-6 py-3 font-medium">Fecha</th>
                                                        <th className="px-6 py-3 font-medium text-center">Estado</th>
                                                        <th className="px-6 py-3 font-medium text-center">Moneda</th>
                                                        <th className="px-6 py-3 font-medium text-right">Total</th>
                                                        <th className="px-6 py-3 font-medium"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {clientInvoices.map((invoice) => (
                                                        <tr key={invoice.id} className="hover:bg-slate-50/50">
                                                            <td className="px-6 py-3 font-mono text-xs text-slate-600">{invoice.id}</td>
                                                            <td className="px-6 py-3 text-slate-600">{new Date(invoice.date).toLocaleDateString()}</td>
                                                            <td className="px-6 py-3 text-center">
                                                                <Badge variant="outline" className={
                                                                    invoice.status === 'paid' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                                                        invoice.status === 'pending' ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                                            invoice.status === 'overdue' ? "bg-red-50 text-red-700 border-red-200" :
                                                                                "bg-slate-100 text-slate-600 border-slate-200"
                                                                }>
                                                                    {invoice.status === 'paid' ? 'Pagada' :
                                                                        invoice.status === 'pending' ? 'Pendiente' :
                                                                            invoice.status === 'draft' ? 'Borrador' :
                                                                                invoice.status === 'overdue' ? 'Vencida' :
                                                                                    invoice.status === 'cancelled' ? 'Cancelada' :
                                                                                        invoice.status}
                                                                </Badge>
                                                            </td>
                                                            <td className="px-6 py-3 text-slate-600 text-center text-xs">{invoice.currency}</td>
                                                            <td className="px-6 py-3 text-right font-medium text-slate-900">
                                                                ${invoice.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                            </td>
                                                            <td className="px-6 py-3 text-right">
                                                                <Button variant="ghost" size="sm" onClick={() => router.push(`/invoices/${invoice.id}`)}>
                                                                    Ver
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>


                        <TabsContent value="payments" className="mt-0">
                            <Card>
                                <CardHeader className="py-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-sm font-medium">Historial de Pagos</CardTitle>
                                            <CardDescription>Pagos recibidos de este cliente.</CardDescription>
                                        </div>
                                        <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800">
                                            Nuevo Pago
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {clientPayments.length === 0 ? (
                                        <div className="text-center py-12 border-dashed border-slate-200 bg-slate-50">
                                            <p className="text-slate-500 text-sm">No hay pagos registrados.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-xs text-slate-500 bg-slate-50/50 uppercase border-b border-slate-100">
                                                    <tr>
                                                        <th className="px-6 py-3 font-medium">Fecha</th>
                                                        <th className="px-6 py-3 font-medium">Factura</th>
                                                        <th className="px-6 py-3 font-medium">Método</th>
                                                        <th className="px-6 py-3 font-medium text-center">Moneda</th>
                                                        <th className="px-6 py-3 font-medium text-right">Monto</th>
                                                        <th className="px-6 py-3 font-medium"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {clientPayments.map((payment, index) => (
                                                        <tr key={`${payment.id}-${index}`} className="hover:bg-slate-50/50">
                                                            <td className="px-6 py-3 text-slate-600">{new Date(payment.date).toLocaleDateString()}</td>
                                                            <td className="px-6 py-3">
                                                                <Button
                                                                    variant="link"
                                                                    className="p-0 h-auto text-blue-600 font-mono text-xs"
                                                                    onClick={() => router.push(`/invoices/${payment.invoiceId}`)}
                                                                >
                                                                    {payment.invoiceNumber}
                                                                </Button>
                                                            </td>
                                                            <td className="px-6 py-3 text-slate-600 capitalize">
                                                                <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 capitalize font-normal">
                                                                    {payment.method === 'cash' ? 'Efectivo' :
                                                                        payment.method === 'transfer' ? 'Transferencia' :
                                                                            payment.method === 'card' ? 'Tarjeta' : payment.method}
                                                                </Badge>
                                                            </td>
                                                            <td className="px-6 py-3 text-slate-600 text-center text-xs">{payment.currency}</td>
                                                            <td className="px-6 py-3 text-right font-medium text-emerald-600">
                                                                ${payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                            </td>
                                                            <td className="px-6 py-3 text-right">
                                                                {payment.notes && (
                                                                    <div className="group relative flex justify-end">
                                                                        <FileText className="w-4 h-4 text-slate-400 cursor-help" />
                                                                        <div className="absolute right-0 top-6 w-48 p-2 bg-slate-800 text-white text-xs rounded z-10 hidden group-hover:block whitespace-normal text-left">
                                                                            {payment.notes}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div >
    )
}
