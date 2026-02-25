import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { idbStorage } from '@/lib/idb-storage'

interface UIState {
    isSidebarCollapsed: boolean
    toggleSidebar: () => void
}

export const useUIStore = create<UIState>()(
    persist(
        (set) => ({
            isSidebarCollapsed: false,
            toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
        }),
        {
            name: 'ui-settings',
            storage: createJSONStorage(() => idbStorage),
        }
    )
)
