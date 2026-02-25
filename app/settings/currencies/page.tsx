"use client"

import { CurrencySettings } from "@/components/admin/settings/currency-settings"

export default function CurrencySettingsPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CurrencySettings />
        </div>
    )
}
