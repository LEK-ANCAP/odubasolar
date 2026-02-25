"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut, Sun, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { mainNavigation } from "./admin-sidebar"

interface MobileSidebarProps {
    isOpen: boolean
    onClose: () => void
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
    const pathname = usePathname()

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="left" className="w-[300px] bg-sidebar border-r-0 p-0 flex flex-col font-sans">
                <SheetTitle className="sr-only">Menú de Navegación</SheetTitle>

                {/* Header / Logo */}
                <div className="h-16 flex items-center px-6 border-b border-transparent">
                    <Link href="/" onClick={onClose} className="flex items-center gap-3 group">
                        <div className="relative w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center overflow-hidden shadow-sm group-hover:scale-105 transition-transform shrink-0">
                            <Sun className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-lg text-slate-800 tracking-tight">
                            Oduba Solar
                        </span>
                    </Link>
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto py-4 px-4 flex flex-col gap-6 scrollbar-thin scrollbar-thumb-slate-100">
                    {mainNavigation.map((section, sectionIndex) => (
                        <div key={sectionIndex} className="flex flex-col gap-1">
                            {section.title && (
                                <h3 className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 mt-1">
                                    {section.title}
                                </h3>
                            )}

                            {section.items.map((item) => {
                                const isActive = pathname === item.href
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        onClick={onClose}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                                            isActive
                                                ? "bg-white text-black shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-slate-100"
                                                : "text-slate-900 hover:text-black hover:bg-slate-200/50"
                                        )}
                                    >
                                        <item.icon className={cn("w-5 h-5 shrink-0 transition-colors", isActive ? "text-black" : "text-slate-900 group-hover:text-black")} />
                                        <span className="truncate">{item.name}</span>
                                    </Link>
                                )
                            })}
                        </div>
                    ))}

                    <div className="flex-1" />

                    {/* Settings Link */}
                    <Link
                        href="/settings"
                        onClick={onClose}
                        className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group mt-4",
                            pathname === "/settings"
                                ? "bg-white text-black shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-slate-100"
                                : "text-slate-900 hover:text-black hover:bg-slate-200/50"
                        )}
                    >
                        <Settings className={cn("w-5 h-5 shrink-0 transition-colors", pathname === "/settings" ? "text-black" : "text-slate-900 group-hover:text-black")} />
                        <span className="truncate">Configuración</span>
                    </Link>
                </div>

                {/* User / Logout Section */}
                <div className="p-4 border-t border-transparent bg-transparent">
                    <button className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-slate-900 hover:bg-white hover:shadow-sm hover:text-rose-600 transition-all w-full group">
                        <div className="w-9 h-9 rounded-full bg-white border border-slate-100 flex items-center justify-center shrink-0 group-hover:bg-rose-50 group-hover:border-rose-100 transition-colors">
                            <LogOut className="w-4 h-4 shrink-0 transition-colors group-hover:text-rose-600 text-slate-900" />
                        </div>
                        <div className="flex flex-col items-start gap-0.5">
                            <span className="text-slate-700 font-semibold leading-tight">Salir</span>
                            <span className="text-[11px] text-slate-400">Cerrar sesión</span>
                        </div>
                    </button>
                </div>
            </SheetContent>
        </Sheet>
    )
}

