"use client"

import { useEffect, useMemo, useState } from "react"
import {
    TrendingUp,
    Package,
    ShoppingCart,
    FileText,
    AlertTriangle,
    ArrowRight,
    Plus,
    Users,
    Wallet,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Search
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

// Stores
import { useInventoryStore } from "@/hooks/use-inventory-store"
import { useOrdersStore } from "@/hooks/use-orders-store"
import { useBudgetsStore } from "@/hooks/use-budgets-store"
import { useCustomersStore } from "@/hooks/use-customers-store"
import { useSettingsStore } from "@/hooks/use-settings-store"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export default function DashboardPage() {
    // Hooks
    const { products, fetchProducts, isLoading: isProdLoading } = useInventoryStore()
    const { orders, fetchOrders, isLoading: isOrdersLoading } = useOrdersStore()
    const { budgets, fetchBudgets, isLoading: isBudgetsLoading } = useBudgetsStore()
    const { customers, fetchCustomers } = useCustomersStore()
    const { usdRate } = useSettingsStore()

    // Load Data
    useEffect(() => {
        fetchProducts()
        fetchOrders()
        fetchBudgets()
        fetchCustomers()
    }, [])

    const isLoading = isProdLoading || isOrdersLoading || isBudgetsLoading

    // --- Computed Metrics ---

    // 1. Inventory Value & Low Stock
    const inventoryMetrics = useMemo(() => {
        const totalValue = products.reduce((acc, p) => acc + (p.costUsd * p.stock), 0)
        const lowStockItems = products.filter(p => p.stock <= (p.lowStockThreshold || 5))
        return { totalValue, lowStockItems }
    }, [products])

    // 2. Pending Orders (Purchases)
    const orderMetrics = useMemo(() => {
        const pending = orders.filter(o => o.status === 'ordered')
        const thisMonth = orders.filter(o => new Date(o.date).getMonth() === new Date().getMonth())
        const totalSpentMonth = thisMonth.reduce((acc, o) => acc + o.totalAmount, 0)
        return { pending, totalSpentMonth }
    }, [orders])

    // 3. Budgets / Sales
    const budgetMetrics = useMemo(() => {
        const approved = budgets.filter(b => b.status === 'APPROVED')
        const pending = budgets.filter(b => b.status === 'SENT' || b.status === 'DRAFT')
        const totalSales = approved.reduce((acc, b) => acc + b.totalAmount, 0) // Simplified
        return { approved, pending, totalSales }
    }, [budgets])

    // 4. Recent Activity (Combined)
    const recentActivity = useMemo(() => {
        const combined = [
            ...orders.map(o => ({ type: 'order', date: new Date(o.date), data: o })),
            ...budgets.map(b => ({ type: 'budget', date: new Date(b.date), data: b }))
        ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5)
        return combined
    }, [orders, budgets])

    // --- Components ---

    const Greeting = () => {
        const hour = new Date().getHours()
        const greeting = hour < 12 ? "Buenos días" : hour < 18 ? "Buenas tardes" : "Buenas noches"
        return (
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{greeting}, equipo.</h1>
                    <p className="text-slate-500 mt-1">
                        Hoy es {format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                    </p>
                </div>
                <div className="hidden md:flex gap-3">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button className="rounded-full h-10 px-6 bg-slate-900 shadow-lg shadow-slate-900/10 hover:shadow-slate-900/20 hover:scale-105 transition-all text-white font-medium">
                                <Plus className="w-4 h-4 mr-2" />
                                <span className="hidden md:inline">Crear Nuevo</span>
                                <span className="md:hidden">Nuevo</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2 shadow-xl border-slate-100">
                            <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                                <Link href="/budgets/new" className="flex items-center w-full">
                                    <FileText className="w-4 h-4 mr-2 text-slate-500" />
                                    <span>Presupuesto</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                                <Link href="/orders/new" className="flex items-center w-full">
                                    <ShoppingCart className="w-4 h-4 mr-2 text-slate-500" />
                                    <span>Compra</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                                <Link href="/inventory" className="flex items-center w-full">
                                    <Package className="w-4 h-4 mr-2 text-slate-500" />
                                    <span>Producto</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-1 bg-slate-100" />
                            <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                                <Link href="/customers" className="flex items-center w-full">
                                    <Users className="w-4 h-4 mr-2 text-slate-500" />
                                    <span>Cliente</span>
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        )
    }

    const StatCard = ({ title, value, subtext, icon: Icon, trend, colorClass, bgClass, href }: any) => {
        const content = (
            <div className={cn(
                "relative overflow-hidden rounded-[24px] bg-white border border-slate-100 p-6 shadow-sm transition-all group flex flex-col justify-between h-full",
                href && "hover:shadow-md hover:-translate-y-1 cursor-pointer"
            )}>
                <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-20 transition-opacity group-hover:opacity-40", bgClass)} />

                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className={cn("p-3 rounded-2xl", bgClass)}>
                        <Icon className={cn("w-6 h-6", colorClass)} />
                    </div>
                    {trend && (
                        <div className={cn("flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full", trend > 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                            {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {Math.abs(trend)}%
                        </div>
                    )}
                </div>

                <div className="relative z-10 mt-auto">
                    <h3 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">{value}</h3>
                    <p className="text-sm font-medium text-slate-500">{title}</p>
                    {subtext && <p className="text-xs text-slate-400 mt-2">{subtext}</p>}
                </div>
            </div>
        )

        if (href) {
            return <Link href={href} className="block h-full outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded-[24px]">{content}</Link>
        }
        return content
    }

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8 pb-10">
            <Greeting />

            {/* Accesos Rápidos (Mobile First) */}
            <div className="grid grid-cols-4 gap-3 md:gap-6">
                <Link href="/orders/new" className="flex flex-col items-center justify-center p-3 md:p-6 rounded-[20px] bg-white hover:bg-slate-50 transition-all border border-slate-100 shadow-sm hover:shadow-md text-center gap-2 md:gap-3 group">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <ShoppingCart className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                    </div>
                    <span className="text-[10px] md:text-sm font-bold text-slate-700 leading-tight">Comprar</span>
                </Link>
                <Link href="/inventory" className="flex flex-col items-center justify-center p-3 md:p-6 rounded-[20px] bg-white hover:bg-slate-50 transition-all border border-slate-100 shadow-sm hover:shadow-md text-center gap-2 md:gap-3 group">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <Package className="w-5 h-5 md:w-6 md:h-6 text-emerald-600" />
                    </div>
                    <span className="text-[10px] md:text-sm font-bold text-slate-700 leading-tight">Inventario</span>
                </Link>
                <Link href="/customers" className="flex flex-col items-center justify-center p-3 md:p-6 rounded-[20px] bg-white hover:bg-slate-50 transition-all border border-slate-100 shadow-sm hover:shadow-md text-center gap-2 md:gap-3 group">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-amber-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <Users className="w-5 h-5 md:w-6 md:h-6 text-amber-600" />
                    </div>
                    <span className="text-[10px] md:text-sm font-bold text-slate-700 leading-tight">Clientes</span>
                </Link>
                <Link href="/reports" className="flex flex-col items-center justify-center p-3 md:p-6 rounded-[20px] bg-white hover:bg-slate-50 transition-all border border-slate-100 shadow-sm hover:shadow-md text-center gap-2 md:gap-3 group">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-violet-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <FileText className="w-5 h-5 md:w-6 md:h-6 text-violet-600" />
                    </div>
                    <span className="text-[10px] md:text-sm font-bold text-slate-700 leading-tight">Reportes</span>
                </Link>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <StatCard
                    title="Ventas Totales"
                    value={`$${budgetMetrics.totalSales.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
                    subtext={`${budgetMetrics.approved.length} presupuestos aprobados`}
                    icon={Wallet}
                    colorClass="text-emerald-600"
                    bgClass="bg-emerald-100"
                    trend={12.5}
                    href="/budgets"
                />
                <StatCard
                    title="Valor Inventario"
                    value={`$${inventoryMetrics.totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
                    subtext={`${products.length} productos en catálogo`}
                    icon={Package}
                    colorClass="text-blue-600"
                    bgClass="bg-blue-100"
                    href="/inventory"
                />
                <StatCard
                    title="Compras Mes"
                    value={`$${orderMetrics.totalSpentMonth.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
                    subtext={`${orderMetrics.pending.length} pendientes de recibir`}
                    icon={ShoppingCart}
                    colorClass="text-violet-600"
                    bgClass="bg-violet-100"
                    href="/orders"
                />
                <StatCard
                    title="Clientes"
                    value={customers.length.toString()}
                    subtext="Base de datos activa"
                    icon={Users}
                    colorClass="text-amber-600"
                    bgClass="bg-amber-100"
                    trend={5.2}
                    href="/customers"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Quick Actions & Alerts */}
                <div className="space-y-8">
                    {/* Alerts Section */}
                    {(inventoryMetrics.lowStockItems.length > 0 || orderMetrics.pending.length > 0) && (
                        <div className="rounded-[24px] border border-amber-100 bg-amber-50/50 p-6">
                            <h3 className="font-bold text-amber-900 flex items-center gap-2 mb-4">
                                <AlertTriangle className="w-5 h-5" />
                                Atención Requerida
                            </h3>
                            <div className="space-y-3">
                                {inventoryMetrics.lowStockItems.slice(0, 3).map(p => (
                                    <div key={p.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-amber-100 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                                            <span className="text-sm font-medium text-slate-700 truncate max-w-[150px]">{p.name}</span>
                                        </div>
                                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md">Stock: {p.stock}</span>
                                    </div>
                                ))}
                                {orderMetrics.pending.length > 0 && (
                                    <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-blue-100 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                            <span className="text-sm font-medium text-slate-700">Compras por recibir</span>
                                        </div>
                                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">{orderMetrics.pending.length}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Quick Access Block has been moved to top */}
                </div>

                {/* Right Column: Recent Activity & Financials */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Recent Activity */}
                    <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-xl text-slate-900">Actividad Reciente</h3>
                            <Button variant="ghost" size="sm" asChild>
                                <Link href="/budgets">Ver todo</Link>
                            </Button>
                        </div>

                        <div className="space-y-0">
                            {recentActivity.length > 0 ? recentActivity.map((item, i) => (
                                <div key={i} className="flex items-center gap-4 py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors px-2 -mx-2 rounded-lg">
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center shadow-sm border",
                                        item.type === 'budget' ? "bg-emerald-50 border-emerald-100" : "bg-blue-50 border-blue-100"
                                    )}>
                                        {item.type === 'budget' ? <FileText className="w-5 h-5 text-emerald-600" /> : <ShoppingCart className="w-5 h-5 text-blue-600" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-900 text-sm">
                                            {item.type === 'budget'
                                                ? `Presupuesto ${(item.data as any).status === 'DRAFT' ? 'creado' : 'aprobado'}`
                                                : `Compra ${(item.data as any).status === 'received' ? 'recibida' : 'realizada'}`
                                            }
                                        </p>
                                        <p className="text-xs text-slate-500 truncate">
                                            {item.type === 'budget' ? (item.data as any).clientName : (item.data as any).supplier}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-slate-900 text-sm">
                                            ${(item.data as any).totalAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            {format(item.date, "d MMM", { locale: es })}
                                        </p>
                                    </div>
                                </div>
                            )) : (
                                <div className="py-12 text-center text-slate-400">
                                    No hay actividad reciente
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Action Button (Mobile Only) */}
            <div className="md:hidden fixed bottom-6 right-6 z-50">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button size="icon" className="h-14 w-14 rounded-full bg-slate-900 text-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:scale-105 transition-all focus:ring-4 focus:ring-slate-900/20 active:scale-95">
                            <Plus className="w-6 h-6" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" side="top" className="w-48 mb-2 rounded-2xl p-2 shadow-xl border-slate-100">
                        <DropdownMenuItem asChild className="rounded-xl py-3 cursor-pointer">
                            <Link href="/budgets/new" className="flex items-center w-full">
                                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center mr-3">
                                    <FileText className="w-4 h-4 text-emerald-600" />
                                </div>
                                <span className="font-medium text-slate-700">Presupuesto</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="rounded-xl py-3 cursor-pointer">
                            <Link href="/orders/new" className="flex items-center w-full">
                                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mr-3">
                                    <ShoppingCart className="w-4 h-4 text-blue-600" />
                                </div>
                                <span className="font-medium text-slate-700">Compra</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="rounded-xl py-3 cursor-pointer">
                            <Link href="/inventory" className="flex items-center w-full">
                                <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center mr-3">
                                    <Package className="w-4 h-4 text-amber-600" />
                                </div>
                                <span className="font-medium text-slate-700">Producto</span>
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    )
}
