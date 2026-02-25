"use client"

import { useState } from "react"
import { Bell, Search, User, Settings2, Menu } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { MobileSidebar } from "./mobile-sidebar"
import { ConfigModal } from "./config-modal"
import { useAdminHeaderStore } from "@/hooks/use-admin-header-store"

export function AdminHeader() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [isConfigOpen, setIsConfigOpen] = useState(false)
    const { title, actions } = useAdminHeaderStore()

    return (
        <>
            <MobileSidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
            <ConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />

            <header className="h-16 flex items-center justify-between sticky top-0 z-40 bg-sidebar border-b border-transparent shadow-none px-4 md:px-6">
                {/* Left: Mobile Toggle & Global Search */}
                <div className="flex items-center gap-4 flex-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden text-slate-500 hover:bg-slate-100 rounded-xl"
                        onClick={() => setIsMobileMenuOpen(true)}
                    >
                        <Menu className="w-6 h-6" />
                    </Button>

                    {/* Global Search Bar */}
                    <div className="relative w-full max-w-md hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Buscar..."
                            className="pl-10 h-10 bg-white border-slate-200 focus-visible:ring-slate-900 focus-visible:ring-1 rounded-xl shadow-sm"
                        />
                    </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 md:gap-4">
                    <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full h-10 w-10 transition-colors">
                        <Bell className="w-5 h-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsConfigOpen(true)}
                        className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full h-10 w-10 hidden md:flex transition-colors"
                    >
                        <Settings2 className="w-5 h-5" />
                    </Button>

                    <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block" />

                    <div className="flex items-center gap-3 pl-2 ml-2">
                        <span className="hidden lg:block text-sm font-bold text-slate-800">Dr. James Carter</span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full h-10 w-10 bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 shadow-sm"
                        >
                            <User className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </header>
        </>
    )
}
