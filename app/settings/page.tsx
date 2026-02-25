import { GeneralSettings } from "@/components/admin/settings/general-settings"

export default function SettingsPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
            <div className="w-full">
                <GeneralSettings />
            </div>
        </div>
    )
}

