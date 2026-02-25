import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { idbStorage } from '@/lib/idb-storage'

interface SettingsState {
    usdRate: number
    eurRate: number
    companyName: string
    companyEmail: string
    companyPhone: string
    companyAddress: string
    companyLogo: string | null
    setCompanyName: (name: string) => void
    setCompanyEmail: (email: string) => void
    setCompanyPhone: (phone: string) => void
    setCompanyAddress: (address: string) => void
    setCompanyLogo: (logo: string | null) => void
    setUsdRate: (rate: number) => void
    setEurRate: (rate: number) => void
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            usdRate: 320,
            eurRate: 340,
            companyName: "Oduba Solar",
            companyEmail: "contacto@odubasolar.com",
            companyPhone: "+53 52345678",
            companyAddress: "Calle Principal #123, La Habana",
            companyLogo: null,
            setCompanyName: (name) => set({ companyName: name }),
            setCompanyEmail: (email) => set({ companyEmail: email }),
            setCompanyPhone: (phone) => set({ companyPhone: phone }),
            setCompanyAddress: (address) => set({ companyAddress: address }),
            setCompanyLogo: (logo) => set({ companyLogo: logo }),
            setUsdRate: (rate) => set({ usdRate: rate }),
            setEurRate: (rate) => set({ eurRate: rate }),
        }),
        {
            name: 'settings-storage',
            storage: createJSONStorage(() => idbStorage),
        }
    )
)
