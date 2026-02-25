import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { idbStorage } from '@/lib/idb-storage'

export interface Variation {
    productId: string
    quantityAdjustment: number
}

export interface AttributeOption {
    label: string
    value: string
    variations: Variation[]
}

export interface Attribute {
    name: string
    options: AttributeOption[]
}

export interface Kit {
    id: string
    name: string
    description: string
    basePrice: number
    attributes: Attribute[]
    products: { productId: string; quantity: number }[]
    totalPrice: number // Calculated or base
    type: 'purchase' | 'sale' | 'manufacture'
}

interface KitsState {
    kits: Kit[]
    addKit: (kit: Kit) => void
    updateKit: (id: string, kit: Partial<Kit>) => void
    deleteKit: (id: string) => void
    duplicateKit: (id: string) => void
}

export const useKitsStore = create<KitsState>()(
    persist(
        (set) => ({
            kits: [],
            addKit: (kit) => set((state) => ({ kits: [...state.kits, kit] })),
            updateKit: (id, updatedKit) => set((state) => ({
                kits: state.kits.map((k) => (k.id === id ? { ...k, ...updatedKit } : k)),
            })),
            deleteKit: (id) => set((state) => ({ kits: state.kits.filter((k) => k.id !== id) })),
            duplicateKit: (id) => set((state) => {
                const kitToDuplicate = state.kits.find((k) => k.id === id)
                if (!kitToDuplicate) return { kits: state.kits }

                const newKit: Kit = {
                    ...kitToDuplicate,
                    id: `kit-${Date.now()}`,
                    name: `${kitToDuplicate.name} (Copia)`,
                }

                return { kits: [...state.kits, newKit] }
            }),
        }),
        {
            name: 'kits-storage',
            storage: createJSONStorage(() => idbStorage),
        }
    )
)
