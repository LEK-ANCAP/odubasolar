export interface AdminHeaderState {
    title: string
    setTitle: (title: string) => void
    actions: React.ReactNode | null
    setActions: (actions: React.ReactNode | null) => void
}

import { create } from 'zustand'

export const useAdminHeaderStore = create<AdminHeaderState>((set) => ({
    title: '',
    setTitle: (title) => set({ title }),
    actions: null,
    setActions: (actions) => set({ actions }),
}))
