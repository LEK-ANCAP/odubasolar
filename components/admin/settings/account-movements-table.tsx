"use client"

import { useAccountsStore, Movement } from "@/hooks/use-accounts-store"
import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { ArrowDownLeft, ArrowUpRight, ArrowRightLeft } from "lucide-react"

interface AccountMovementsTableProps {
    accountId: string
    onViewOrder?: (orderId: string) => void
}

export function AccountMovementsTable({ accountId, onViewOrder }: AccountMovementsTableProps) {
    const { movements } = useAccountsStore()
    const router = useRouter()

    // Filter and sort movements for this account (newest first)
    const accountMovements = movements
        .filter(m => m.accountId === accountId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    if (accountMovements.length === 0) {
        return (
            <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <p className="text-slate-500 text-sm">No hay movimientos registrados en esta cuenta.</p>
            </div>
        )
    }

    return (
        <div className="bg-white">
            {/* Mobile View */}
            <div className="md:hidden divide-y divide-slate-100">
                {accountMovements.map((movement) => {
                    const isOrder = movement.description.includes('Pedido') || movement.category === 'Pedido de Compra' || (movement.referenceId && movement.referenceId.startsWith('ORD-'))

                    return (
                        <div
                            key={movement.id}
                            className={cn(
                                "flex items-center justify-between p-4 transition-colors active:bg-slate-50",
                                isOrder ? "active:bg-blue-50 cursor-pointer" : ""
                            )}
                            onClick={() => {
                                if (isOrder) {
                                    let orderId = movement.referenceId
                                    if (!orderId) {
                                        const match = movement.description.match(/#([\w-]+)/)
                                        if (match) orderId = match[1]
                                    }
                                    if (orderId) {
                                        if (onViewOrder) {
                                            onViewOrder(orderId)
                                        } else {
                                            router.push(`/orders?orderId=${orderId}`)
                                        }
                                    }
                                }
                            }}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                                    movement.type === 'income' ? "bg-emerald-50 text-emerald-600" :
                                        movement.type === 'expense' ? "bg-rose-50 text-rose-600" :
                                            "bg-blue-50 text-blue-600"
                                )}>
                                    {movement.type === 'income' ? <ArrowDownLeft className="w-5 h-5" /> :
                                        movement.type === 'expense' ? <ArrowUpRight className="w-5 h-5" /> :
                                            <ArrowRightLeft className="w-5 h-5" />}
                                </div>
                                <div className="min-w-0 pr-2">
                                    <p className={cn("text-sm font-bold truncate", isOrder ? "text-blue-600" : "text-slate-900")}>
                                        {movement.description}
                                    </p>
                                    <div className="flex items-center text-xs text-slate-500 gap-2 mt-0.5">
                                        <span className="truncate">{new Date(movement.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                        {movement.category && (
                                            <>
                                                <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />
                                                <span className="truncate text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">{movement.category}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <span className={cn(
                                    "font-bold text-sm",
                                    movement.type === 'income' ? "text-emerald-600" :
                                        movement.type === 'expense' ? "text-rose-600" : "text-slate-700"
                                )}>
                                    {movement.type === 'income' ? '+' : movement.type === 'expense' ? '-' : ''}
                                    {Math.abs(movement.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block">
                <Table>
                    <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                        <TableRow>
                            <TableHead className="w-[40px]"></TableHead>
                            <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Descripción</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Monto</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {accountMovements.map((movement) => {
                            // Check if it's an order related movement
                            const isOrder = movement.description.includes('Pedido') || movement.category === 'Pedido de Compra' || (movement.referenceId && movement.referenceId.startsWith('ORD-'))

                            return (
                                <TableRow
                                    key={movement.id}
                                    className={cn(
                                        "transition-colors",
                                        isOrder ? "hover:bg-blue-50/50 cursor-pointer group" : "hover:bg-slate-50/50"
                                    )}
                                    onClick={() => {
                                        if (isOrder) {
                                            let orderId = movement.referenceId

                                            // Fallback: Try to extract Order ID from description "Pedido #ORD-..."
                                            if (!orderId) {
                                                const match = movement.description.match(/#([\w-]+)/)
                                                if (match) orderId = match[1]
                                            }

                                            if (orderId) {
                                                if (onViewOrder) {
                                                    onViewOrder(orderId)
                                                } else {
                                                    router.push(`/orders?orderId=${orderId}`)
                                                }
                                            }
                                        }
                                    }}
                                >
                                    <TableCell className="py-3 pl-4">
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center transition-transform group-hover:scale-110",
                                            movement.type === 'income' ? "bg-emerald-100 text-emerald-600" :
                                                movement.type === 'expense' ? "bg-rose-100 text-rose-600" :
                                                    "bg-blue-100 text-blue-600"
                                        )}>
                                            {movement.type === 'income' ? <ArrowDownLeft className="w-4 h-4" /> :
                                                movement.type === 'expense' ? <ArrowUpRight className="w-4 h-4" /> :
                                                    <ArrowRightLeft className="w-4 h-4" />}
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-3 text-sm text-slate-600">
                                        {new Date(movement.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </TableCell>
                                    <TableCell className="py-3">
                                        <div className="flex flex-col">
                                            <span className={cn("font-medium text-sm", isOrder ? "text-blue-600 group-hover:underline" : "text-slate-900")}>
                                                {movement.description}
                                            </span>
                                            {movement.category && <span className="text-[10px] text-slate-400 bg-slate-100 w-fit px-1.5 py-0.5 rounded mt-0.5">{movement.category}</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-3 text-right pr-6">
                                        <span className={cn(
                                            "font-bold text-sm",
                                            movement.type === 'income' ? "text-emerald-600" :
                                                movement.type === 'expense' ? "text-rose-600" : "text-slate-700"
                                        )}>
                                            {movement.type === 'income' ? '+' : movement.type === 'expense' ? '-' : ''}
                                            {Math.abs(movement.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
