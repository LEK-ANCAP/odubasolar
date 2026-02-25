"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Package, Users, ShoppingCart, Settings, Zap, FileText, LogOut, PanelLeftClose, PanelLeftOpen, Truck, ChevronRight, Wallet, Banknote, Receipt, CreditCard, FileSpreadsheet, Target, Sun } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUIStore } from "@/hooks/use-ui-store"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export type NavigationItem = {
    name: string
    href: string
    icon: any
}

export type NavigationSection = {
    title?: string
    items: NavigationItem[]
}

export const mainNavigation: NavigationSection[] = [
    {
        items: [
            { name: "Inicio", href: "/", icon: LayoutDashboard },
        ]
    },
    {
        title: "Inventario",
        items: [
            { name: "Artículos", href: "/inventory", icon: Package },
            { name: "Kits", href: "/kits", icon: Zap },
        ]
    },
    {
        title: "Ventas",
        items: [
            { name: "Clientes", href: "/customers", icon: Users },
            { name: "Presupuestos", href: "/budgets", icon: FileText },
            { name: "Facturas", href: "/invoices", icon: Banknote },

            { name: "Pagos", href: "/payments", icon: CreditCard },
            { name: "CRM", href: "/crm", icon: Target },
        ]
    },
    {
        title: "Compras",
        items: [
            { name: "Proveedores", href: "/providers", icon: Truck },
            { name: "Gastos variables", href: "/expenses", icon: Receipt },
            { name: "Compras", href: "/orders", icon: ShoppingCart },
        ]
    },
    {
        title: "Contabilidad",
        items: [
            { name: "Cuentas", href: "/accounts", icon: Wallet },
        ]
    },
    {
        title: "Informes",
        items: [
            { name: "Reportes", href: "/reports", icon: FileSpreadsheet }, // Changed icon to FileSpreadsheet for variety
        ]
    }
]

export function AdminSidebar() {
    const pathname = usePathname()
    const { isSidebarCollapsed, toggleSidebar } = useUIStore()

    return (
        <TooltipProvider delayDuration={0}>
            <div className={cn(
                "flex flex-col h-full bg-sidebar border-r border-transparent shadow-none transition-all duration-300 relative z-20 overflow-x-hidden",
                isSidebarCollapsed ? "w-[70px]" : "w-64"
            )}>
                {/* Header / Logo */}
                <div className={cn("h-16 flex items-center transition-all duration-300 border-b border-slate-200/0", isSidebarCollapsed ? "justify-center px-2 gap-2" : "justify-between px-5")}>
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="relative w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center overflow-hidden shadow-sm group-hover:scale-105 transition-transform shrink-0">
                            <Sun className="w-3.5 h-3.5 text-white" />
                        </div>
                        {!isSidebarCollapsed && (
                            <span className="font-bold text-base text-slate-800 tracking-tight whitespace-nowrap opacity-100 transition-opacity duration-300">
                                Oduba Solar
                            </span>
                        )}
                    </Link>

                    <button
                        onClick={toggleSidebar}
                        className={cn(
                            "text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1.5 rounded-md transition-colors relative z-50",
                            isSidebarCollapsed && "hover:bg-slate-100"
                        )}
                    >
                        {isSidebarCollapsed ? (
                            <PanelLeftOpen className="w-4 h-4" />
                        ) : (
                            <PanelLeftClose className="w-4 h-4" />
                        )}
                    </button>
                </div>

                {/* Navigation */}
                <div className={cn(
                    "flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-6", // Increased gap for sections
                    isSidebarCollapsed ? "scrollbar-none" : "scrollbar-thin scrollbar-thumb-slate-100"
                )}>
                    {mainNavigation.map((section, sectionIndex) => (
                        <div key={sectionIndex} className="flex flex-col gap-1">
                            {!isSidebarCollapsed && section.title && (
                                <h3 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                                    {section.title}
                                </h3>
                            )}

                            {section.items.map((item) => {
                                const isActive = pathname === item.href
                                const LinkContent = (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 group relative",
                                            isActive
                                                ? "bg-white text-black shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-slate-100"
                                                : "text-slate-900 hover:text-black hover:bg-slate-200/50",
                                            isSidebarCollapsed && "justify-center px-0 py-2"
                                        )}
                                    >
                                        <item.icon className={cn("w-4 h-4 shrink-0 transition-colors", isActive ? "text-black" : "text-slate-900 group-hover:text-black")} />

                                        {!isSidebarCollapsed && (
                                            <div className="flex-1 flex justify-between items-center overflow-hidden">
                                                <span className="truncate">{item.name}</span>
                                                {isActive && <ChevronRight className="w-3 h-3 text-slate-400" />}
                                            </div>
                                        )}
                                    </Link>
                                )

                                if (isSidebarCollapsed) {
                                    return (
                                        <Tooltip key={item.name}>
                                            <TooltipTrigger asChild>
                                                {LinkContent}
                                            </TooltipTrigger>
                                            <TooltipContent side="right" sideOffset={10}>
                                                {item.name}
                                                {section.title && <span className="text-slate-400 ml-2 text-[10px] hidden">({section.title})</span>}
                                            </TooltipContent>
                                        </Tooltip>
                                    )
                                }

                                return LinkContent
                            })}
                        </div>
                    ))}

                    <div className="flex-1" /> {/* Spacer to push Settings to bottom */}

                    {/* Settings Link */}
                    {(() => {
                        const settingsLink = (
                            <Link
                                href="/settings"
                                className={cn(
                                    "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 group relative mt-2",
                                    pathname === "/settings"
                                        ? "bg-white text-black shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-slate-100"
                                        : "text-slate-900 hover:text-black hover:bg-slate-200/50",
                                    isSidebarCollapsed && "justify-center px-0 py-2"
                                )}
                            >
                                <Settings className={cn("w-4 h-4 shrink-0 transition-colors", pathname === "/settings" ? "text-black" : "text-slate-900 group-hover:text-black")} />

                                {!isSidebarCollapsed && (
                                    <div className="flex-1 flex justify-between items-center overflow-hidden">
                                        <span className="truncate">Configuración</span>
                                        {pathname === "/settings" && <ChevronRight className="w-3 h-3 text-slate-400" />}
                                    </div>
                                )}
                            </Link>
                        )

                        if (isSidebarCollapsed) {
                            return (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        {settingsLink}
                                    </TooltipTrigger>
                                    <TooltipContent side="right" sideOffset={10}>
                                        Configuración
                                    </TooltipContent>
                                </Tooltip>
                            )
                        }

                        return settingsLink
                    })()}

                </div>

                {/* User / Logout Section */}
                <div className="p-3 border-t border-slate-200/0 bg-transparent">
                    {(() => {
                        const logoutBtn = (
                            <button className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-900 hover:bg-white hover:shadow-sm hover:text-rose-600 transition-all w-full group",
                                isSidebarCollapsed && "justify-center px-0 hover:bg-transparent hover:shadow-none"
                            )}>
                                <div className={cn(
                                    "w-7 h-7 rounded-full bg-white border border-slate-100 flex items-center justify-center shrink-0 group-hover:bg-rose-50 group-hover:border-rose-100 transition-colors",
                                    isSidebarCollapsed ? "w-8 h-8" : ""
                                )}>
                                    <LogOut className="w-3.5 h-3.5 shrink-0 transition-colors group-hover:text-rose-600 text-slate-900" />
                                </div>
                                {!isSidebarCollapsed && (
                                    <div className="flex flex-col items-start gap-0.5">
                                        <span className="text-slate-700 font-semibold">Salir</span>
                                        <span className="text-[10px] text-slate-400">Cerrar sesión</span>
                                    </div>
                                )}
                            </button>
                        )

                        if (isSidebarCollapsed) {
                            return (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        {logoutBtn}
                                    </TooltipTrigger>
                                    <TooltipContent side="right" sideOffset={10}>
                                        Cerrar sesión
                                    </TooltipContent>
                                </Tooltip>
                            )
                        }

                        return logoutBtn
                    })()}
                </div>
            </div>
        </TooltipProvider>
    )
}
