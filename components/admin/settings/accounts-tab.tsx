"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAccountsStore, Account, Currency } from "@/hooks/use-accounts-store"
// import { AccountMovementsTable } from "./account-movements-table" // No longer needed here
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Wallet, Banknote, Landmark, ArrowRight, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function AccountsTab() {
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [editingAccount, setEditingAccount] = useState<Account | null>(null)
    const { accounts, addAccount, deleteAccount, clearAccounts } = useAccountsStore()
    const router = useRouter()

    // Form State
    const [newName, setNewName] = useState("")
    const [newType, setNewType] = useState<Account['type']>('cash')
    const [newCurrency, setNewCurrency] = useState<Currency>('USD')
    const [initialBalance, setInitialBalance] = useState("")

    const handleAddAccount = () => {
        if (!newName) return

        const newAccount: Account = {
            id: `ACC-${Date.now()}`,
            name: newName,
            type: newType,
            currency: newCurrency,
            balance: parseFloat(initialBalance) || 0,
            description: ""
        }

        addAccount(newAccount)
        setIsAddOpen(false)
        setNewName("")
        setInitialBalance("")
        setNewType('cash')
    }

    const getIcon = (type: Account['type']) => {
        switch (type) {
            case 'bank': return Landmark
            case 'cash': return Banknote
            default: return Wallet
        }
    }

    const handleClearAll = () => {
        if (confirm("¿Estás seguro de eliminar TODAS las cuentas y movimientos? Esta acción no se puede deshacer.")) {
            clearAccounts()
        }
    }

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Cuentas y Fondos</h2>
                    <p className="text-slate-500">Administra tus cuentas bancarias, cajas chicas y otros fondos.</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={handleClearAll}
                        title="Eliminar Todo"
                        className="h-9 px-3 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                    >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Limpiar
                    </Button>

                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => { setEditingAccount(null); setIsAddOpen(true) }} className="bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20">
                                <Plus className="w-4 h-4 mr-2" />
                                Nueva Cuenta
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Crear Nueva Cuenta</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Nombre de la Cuenta</Label>
                                    <Input
                                        placeholder="Ej. Caja Principal, Banco Popular USD"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Tipo</Label>
                                        <Select value={newType} onValueChange={(val: any) => setNewType(val)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="cash">Efectivo / Caja</SelectItem>
                                                <SelectItem value="bank">Banco</SelectItem>
                                                <SelectItem value="other">Otro</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Moneda</Label>
                                        <Select value={newCurrency} onValueChange={(val: any) => setNewCurrency(val)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="USD">USD</SelectItem>
                                                <SelectItem value="CUP">CUP</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Saldo Inicial</Label>
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        value={initialBalance}
                                        onChange={(e) => setInitialBalance(e.target.value)}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
                                <Button onClick={handleAddAccount} className="bg-slate-900 text-white">Crear Cuenta</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {accounts.filter(acc => acc.id && acc.id.trim() !== "").map((account) => {
                    const Icon = getIcon(account.type)
                    return (
                        <div
                            key={account.id}
                            onClick={() => router.push(`/accounts/${account.id}`)}
                            className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ArrowRight className="w-5 h-5 text-slate-400" />
                            </div>

                            <div className="flex items-start justify-between mb-4">
                                <div className={cn(
                                    "p-3 rounded-xl",
                                    account.type === 'bank' ? "bg-blue-50 text-blue-600" :
                                        account.type === 'cash' ? "bg-emerald-50 text-emerald-600" :
                                            "bg-purple-50 text-purple-600"
                                )}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-full">{account.currency}</span>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-bold text-slate-800 text-lg mb-1 group-hover:text-blue-600 transition-colors">{account.name}</h3>
                                <p className="text-2xl font-bold text-slate-900 tracking-tight">
                                    {account.currency === 'USD' ? '$' : ''}
                                    {account.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    {account.currency === 'CUP' ? <span className="text-sm font-normal text-slate-400 ml-1">CUP</span> : ''}
                                </p>
                            </div>
                        </div>
                    )
                })}

                {accounts.length === 0 && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                        <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-slate-900">No tienes cuentas configuradas</h3>
                        <p className="text-slate-500 mb-6">Crea una cuenta para empezar a registrar pagos y gastos.</p>
                        <Button onClick={() => setIsAddOpen(true)} variant="outline">
                            Crear primera cuenta
                        </Button>
                    </div>
                )}
            </div>
        </div >
    )
}
