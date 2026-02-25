"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { User, Package, CreditCard, Users, Settings, CircleDollarSign, FileText } from "lucide-react"

const settingsNav = [
    { name: "Perfil General", href: "/settings", icon: User },
    { name: "Inventario", href: "/settings/inventory", icon: Package },
    { name: "Monedas y Tasas", href: "/settings/currencies", icon: CircleDollarSign },
    { name: "Equipo", href: "/settings/team", icon: Users },
    { name: "Facturación", href: "/settings/billing", icon: CreditCard },
    { name: "Presupuestos", href: "/settings/budgets", icon: FileText },
]

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()

    return (
        <div className="flex flex-col md:flex-row gap-8 h-full">
            {/* Settings Sidebar */}
            <aside className="w-full md:w-64 flex-shrink-0 space-y-2">
                <div className="mb-6 px-2">
                    <h2 className="text-2xl font-bold text-slate-800">Configuración</h2>
                    <p className="text-slate-500 text-sm">Gestionar preferencias</p>
                </div>

                <nav className="space-y-1">
                    {settingsNav.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-white/60 shadow-sm text-slate-900 font-bold"
                                        : "text-slate-500 hover:text-slate-900 hover:bg-white/30"
                                )}
                            >
                                <item.icon className={cn("w-4 h-4", isActive ? "text-slate-900" : "text-slate-400")} />
                                {item.name}
                            </Link>
                        )
                    })}
                </nav>
            </aside>

            {/* Content Area */}
            <div className="flex-1 min-w-0 bg-white/40 rounded-[30px] p-8 border border-white/50 shadow-sm overflow-y-auto">
                {children}
            </div>
        </div>
    )
}
