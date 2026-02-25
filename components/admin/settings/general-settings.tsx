"use client"

import { User, Mail, Globe } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useSettingsStore } from "@/hooks/use-settings-store"

export function GeneralSettings() {
    const {
        companyName, companyEmail, companyPhone, companyAddress, companyLogo,
        setCompanyName, setCompanyEmail, setCompanyPhone, setCompanyAddress, setCompanyLogo
    } = useSettingsStore()

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Configuración del Sistema</h2>
                <p className="text-slate-500">Gestiona los datos de la empresa y configuraciones globales.</p>
            </div>

            {/* Company Information */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                    <div className="p-2 bg-slate-900 rounded-lg text-white">
                        <Globe className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Datos de la Empresa</h3>
                        <p className="text-sm text-slate-500">Información visible en recibos y facturas.</p>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Nombre de la Empresa</Label>
                            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="bg-slate-50 border-slate-200" />
                        </div>
                        <div className="space-y-2">
                            <Label>Logo URL</Label>
                            <Input value={companyLogo || ''} onChange={(e) => setCompanyLogo(e.target.value)} placeholder="https://..." className="bg-slate-50 border-slate-200" />
                        </div>
                        <div className="space-y-2">
                            <Label>Correo de Contacto</Label>
                            <Input value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} className="bg-slate-50 border-slate-200" />
                        </div>
                        <div className="space-y-2">
                            <Label>Teléfono</Label>
                            <Input value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} className="bg-slate-50 border-slate-200" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>Dirección Física</Label>
                            <Input value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} className="bg-slate-50 border-slate-200" />
                        </div>
                    </div>
                </div>
            </section>


        </div>
    )
}
