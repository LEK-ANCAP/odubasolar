"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAccountsStore } from "@/hooks/use-accounts-store"
import { useOrdersStore, Order } from "@/hooks/use-orders-store"
import { AccountMovementsTable } from "@/components/admin/settings/account-movements-table"
import { OrderReceipt } from "@/components/admin/orders/order-receipt"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Wallet, Landmark, Banknote, PenLine, Save, History, Scale, ArrowRightLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

export default function AccountDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const { accounts, updateAccount, addMovement } = useAccountsStore()
    const accountId = decodeURIComponent(params.id as string)

    const account = accounts.find(a => a.id === accountId)

    // Edit Name State
    const [isEditingName, setIsEditingName] = useState(false)
    const [newName, setNewName] = useState("")

    // Adjust Balance State
    const [isAdjustBalanceOpen, setIsAdjustBalanceOpen] = useState(false)
    const [newBalance, setNewBalance] = useState("")
    const [adjustmentReason, setAdjustmentReason] = useState("")

    // Order Receipt State
    const { orders } = useOrdersStore()
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

    // Transfer State
    const [isTransferOpen, setIsTransferOpen] = useState(false)
    const [targetAccountId, setTargetAccountId] = useState("")
    const [transferAmount, setTransferAmount] = useState("")
    const [transferCommissionPercent, setTransferCommissionPercent] = useState("")
    const [exchangeRate, setExchangeRate] = useState("")
    const [targetAmount, setTargetAmount] = useState("")
    const [transferDescription, setTransferDescription] = useState("")

    useEffect(() => {
        if (isTransferOpen) {
            setTransferAmount("")
            setTransferCommissionPercent("")
            setTargetAccountId("")
            setExchangeRate("")
            setTargetAmount("")
        }
    }, [isTransferOpen])

    const targetAccount = accounts.find(a => a.id === targetAccountId)
    const isCrossCurrency = account && targetAccount && account.currency !== targetAccount.currency

    // Auto-calculate suggested rate (very basic, usually configured elsewhere but for now 1 or placeholder)
    useEffect(() => {
        if (isCrossCurrency) {
            // Default rates could be fetched from settings if available
            // For now, let's default to 1 and let user edit
            if (!exchangeRate) setExchangeRate("1")
        } else {
            setExchangeRate("1")
        }
    }, [isCrossCurrency, targetAccountId])

    const handleViewOrder = (orderId: string) => {
        const order = orders.find(o => o.id === orderId)
        if (order) {
            setSelectedOrder(order)
        }
    }

    useEffect(() => {
        if (!account) {
            // Check if it's just loading or actually not found? 
            // For now, if not found in store, redirect or show 404
            // But hooks might load async (update: zustand persist ensures it loads, but might vary)
            // We'll handle "Not Found" render
        } else {
            setNewName(account.name)
            setNewBalance(account.balance.toString())
        }
    }, [account])

    if (!account) {
        return (
            <div className="p-8 text-center text-slate-500">
                <p>Cuenta no encontrada.</p>
                <Link href="/accounts" className="text-blue-600 hover:underline mt-2 inline-block">
                    Volver a Cuentas
                </Link>
            </div>
        )
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'bank': return Landmark
            case 'cash': return Banknote
            default: return Wallet
        }
    }

    const Icon = getIcon(account.type)

    const handleSaveName = () => {
        if (newName && newName !== account.name) {
            updateAccount(account.id, { name: newName })
        }
        setIsEditingName(false)
    }

    // Bidirectional Calc Logic
    const calculateTargetAmount = (amountStr: string, commissionStr: string, rateStr: string) => {
        const amount = parseFloat(amountStr) || 0
        const commission = parseFloat(commissionStr) || 0
        const rate = parseFloat(rateStr) || 1
        const net = amount - (amount * (commission / 100))
        return (net * rate).toFixed(2) // Keep 2 decimals for display
    }

    const calculateRate = (amountStr: string, commissionStr: string, targetAmountStr: string) => {
        const amount = parseFloat(amountStr) || 0
        const commission = parseFloat(commissionStr) || 0
        const target = parseFloat(targetAmountStr) || 0
        const net = amount - (amount * (commission / 100))
        if (net === 0) return "0"
        return (target / net).toFixed(4) // More precision for rate
    }

    const handleAdjustBalance = () => {
        const targetBalance = parseFloat(newBalance)
        if (isNaN(targetBalance)) return

        const currentBalance = account.balance
        const difference = targetBalance - currentBalance

        if (difference === 0) {
            setIsAdjustBalanceOpen(false)
            return
        }

        // Create Adjustment Movement
        addMovement({
            id: `MOV-${Date.now()}`,
            accountId: account.id,
            date: new Date().toISOString(),
            description: adjustmentReason || "Ajuste manual de saldo",
            amount: difference,
            type: difference > 0 ? 'income' : 'expense',
            category: 'Ajuste de Saldo'
        })

        // NOTE: updateAccount for balance is handled automatically by addMovement in the store!
        // But wait, the store logic updates balance when adding movement. So we just add movement.

        setIsAdjustBalanceOpen(false)
        setAdjustmentReason("")
    }

    const handleTransfer = () => {
        if (!targetAccount || !transferAmount) return

        const amount = parseFloat(transferAmount)
        const commissionPercent = parseFloat(transferCommissionPercent) || 0


        if (isNaN(amount) || amount <= 0) return

        const commissionValue = amount * (commissionPercent / 100)
        const netAmount = amount - commissionValue

        let finalAmount = 0
        let rate = 1

        if (isCrossCurrency) {
            rate = parseFloat(exchangeRate) || 1
            finalAmount = parseFloat(targetAmount)
            if (isNaN(finalAmount)) finalAmount = netAmount * rate
        } else {
            finalAmount = netAmount // Same currency, rate = 1
        }

        const movementId = `MOV-${Date.now()}`

        // 1. Expense from Source Account
        addMovement({
            id: movementId,
            accountId: account.id,
            date: new Date().toISOString(),
            description: `Transferencia a ${targetAccount.name} ${transferDescription ? `(${transferDescription})` : ''} (Comisión: ${commissionPercent}%)`,
            amount: -amount, // Full amount leaves source
            type: 'transfer',
            category: 'Transferencia Enviada',
            referenceId: targetAccount.id
        })

        // 2. Income to Target Account
        addMovement({
            id: `${movementId}-IN`,
            accountId: targetAccount.id,
            date: new Date().toISOString(),
            description: `Transferencia de ${account.name} ${transferDescription ? `(${transferDescription})` : ''}`,
            amount: finalAmount, // Net amount * rate enters target
            type: 'transfer',
            category: 'Transferencia Recibida',
            referenceId: account.id
        })

        setIsTransferOpen(false)
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/accounts')} className="shrink-0 text-slate-400 hover:text-slate-800">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>

                    <div className={cn(
                        "p-3 rounded-xl shrink-0",
                        account.type === 'bank' ? "bg-blue-50 text-blue-600" :
                            account.type === 'cash' ? "bg-emerald-50 text-emerald-600" :
                                "bg-purple-50 text-purple-600"
                    )}>
                        <Icon className="w-8 h-8" />
                    </div>

                    <div>
                        <div className="flex items-center gap-2">
                            {isEditingName ? (
                                <div className="flex items-center gap-2">
                                    <Input
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        className="h-8 w-64 font-bold text-xl bg-white"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveName()
                                            if (e.key === 'Escape') setIsEditingName(false)
                                        }}
                                    />
                                    <Button size="icon" className="h-8 w-8 bg-green-600 hover:bg-green-700 text-white" onClick={handleSaveName}>
                                        <Save className="w-4 h-4" />
                                    </Button>
                                </div>
                            ) : (
                                <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2 group">
                                    {account.name}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setIsEditingName(true)}
                                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-blue-600"
                                    >
                                        <PenLine className="w-4 h-4" />
                                    </Button>
                                </h1>
                            )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                {account.type === 'bank' ? 'Banco' : account.type === 'cash' ? 'Efectivo' : 'Otro'}
                            </span>
                            <span className="text-sm font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                                {account.currency}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="text-right">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Saldo Actual</p>
                        <p className="text-3xl font-bold text-slate-900 tracking-tighter">
                            {account.currency === 'USD' ? '$' : ''}
                            {account.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            {account.currency === 'CUP' ? <span className="text-sm font-normal text-slate-400 ml-1">CUP</span> : ''}
                        </p>
                    </div>
                    <div className="h-10 w-px bg-slate-100 mx-2" />
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsTransferOpen(true)} className="border-slate-200 hover:bg-slate-50 text-slate-600">
                            <ArrowRightLeft className="w-4 h-4 mr-2" />
                            Transferir
                        </Button>
                        <Button variant="outline" onClick={() => setIsAdjustBalanceOpen(true)} className="border-slate-200 hover:bg-slate-50 text-slate-600">
                            <Scale className="w-4 h-4 mr-2" />
                            Ajustar
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content Body */}
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <History className="w-5 h-5 text-slate-400" />
                        Historial de Movimientos
                    </h3>
                    {/* Add Filter controls here in future? reuse Table's internal filters */}
                </div>

                <div className="-mx-4 md:mx-0 bg-white md:rounded-xl border-y md:border border-slate-100 md:shadow-sm overflow-hidden">
                    <AccountMovementsTable accountId={account.id} onViewOrder={handleViewOrder} />
                </div>
            </div>

            {/* Adjust Balance Modal */}
            <Dialog open={isAdjustBalanceOpen} onOpenChange={setIsAdjustBalanceOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ajustar Saldo Manualmente</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="bg-amber-50 border border-amber-100 text-amber-800 p-3 rounded-lg text-sm mb-4">
                            Sies ajustas el saldo, se creará automáticamente un movimiento de ajuste para mantener la integridad de los datos.
                        </div>

                        <div className="space-y-2">
                            <Label>Nuevo Saldo Real ({account.currency})</Label>
                            <Input
                                type="number"
                                value={newBalance}
                                onChange={(e) => setNewBalance(e.target.value)}
                                className="font-bold text-lg"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Motivo del Ajuste</Label>
                            <Input
                                placeholder="Ej. Arqueo de caja, Corrección de error, Intereses bancarios..."
                                value={adjustmentReason}
                                onChange={(e) => setAdjustmentReason(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAdjustBalanceOpen(false)}>Cancelar</Button>
                        <Button onClick={handleAdjustBalance} className="bg-slate-900 text-white">
                            Confirmar Ajuste
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Transfer Modal */}
            <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Transferir entre Cuentas</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Cuenta Destino</Label>
                            <Select value={targetAccountId} onValueChange={setTargetAccountId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar cuenta..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts
                                        .filter(a => a.id !== account.id)
                                        .map(a => (
                                            <SelectItem key={a.id} value={a.id}>
                                                {a.name} ({a.currency})
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Monto a Enviar ({account.currency})</Label>
                                <Input
                                    type="number"
                                    value={transferAmount}
                                    onChange={(e) => {
                                        setTransferAmount(e.target.value)
                                        if (isCrossCurrency) {
                                            setTargetAmount(calculateTargetAmount(e.target.value, transferCommissionPercent, exchangeRate))
                                        }
                                    }}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Comisión (%)</Label>
                                <Input
                                    type="number"
                                    value={transferCommissionPercent}
                                    onChange={(e) => {
                                        setTransferCommissionPercent(e.target.value)
                                        if (isCrossCurrency) {
                                            setTargetAmount(calculateTargetAmount(transferAmount, e.target.value, exchangeRate))
                                        }
                                    }}
                                    placeholder="0%"
                                />
                                <p className="text-xs text-slate-500">
                                    Valor: {((parseFloat(transferAmount || "0") * (parseFloat(transferCommissionPercent || "0") / 100))).toLocaleString()} {account.currency}
                                </p>
                            </div>
                        </div>

                        {isCrossCurrency && (
                            <div className="bg-slate-50 p-4 rounded-lg space-y-4 border border-slate-100">
                                <div className="space-y-2">
                                    <Label>Tasa de Cambio (1 {account.currency} = X {targetAccount.currency})</Label>
                                    <Input
                                        type="number"
                                        value={exchangeRate}
                                        onChange={(e) => {
                                            setExchangeRate(e.target.value)
                                            setTargetAmount(calculateTargetAmount(transferAmount, transferCommissionPercent, e.target.value))
                                        }}
                                        placeholder="Ej. 320"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Recibe en {targetAccount.currency}</Label>
                                    <Input
                                        type="number"
                                        value={targetAmount}
                                        onChange={(e) => {
                                            setTargetAmount(e.target.value)
                                            setExchangeRate(calculateRate(transferAmount, transferCommissionPercent, e.target.value))
                                        }}
                                        className="font-bold text-slate-900"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Nota (Opcional)</Label>
                            <Input
                                value={transferDescription}
                                onChange={(e) => setTransferDescription(e.target.value)}
                                placeholder="Añadir detalle..."
                            />
                        </div>

                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsTransferOpen(false)}>Cancelar</Button>
                        <Button onClick={handleTransfer} disabled={!targetAccountId || !transferAmount} className="bg-blue-600 hover:bg-blue-700 text-white">
                            Confirmar Transferencia
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <OrderReceipt
                isOpen={!!selectedOrder}
                onClose={() => setSelectedOrder(null)}
                order={selectedOrder}
                onEdit={() => {
                    if (selectedOrder) {
                        router.push(`/orders?orderId=${selectedOrder.id}`)
                    }
                }}
            />
        </div>
    )
}
