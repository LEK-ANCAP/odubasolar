import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { idbStorage } from '@/lib/idb-storage'
import { createProvider, updateProvider, deleteProvider, getProviders } from '@/app/actions/providers'
import { useSyncStore } from './use-sync-store'

export interface Provider {
    id: string
    name: string
    contactName?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
    taxId?: string | null
    notes?: string | null
    createdAt?: Date
    updatedAt?: Date
}

interface ProvidersState {
    providers: Provider[]
    isLoading: boolean
    error: string | null
    fetchProviders: () => Promise<void>
    addProvider: (provider: any) => Promise<string | null>
    updateProvider: (id: string, provider: any) => Promise<boolean>
    deleteProvider: (id: string) => Promise<void>
    // Demo actions
    generateTestData: () => void
    clearProviders: () => void
}

export const useProvidersStore = create<ProvidersState>()(
    persist(
        (set, get) => ({
            providers: [],
            isLoading: false,
            error: null,

            fetchProviders: async () => {
                if (!useSyncStore.getState().isOnline) {
                    return
                }

                set({ isLoading: true, error: null })
                try {
                    const result = await getProviders()
                    if (result.success && result.data) {
                        set({ providers: result.data, isLoading: false })
                    } else {
                        set({ error: result.error as string, isLoading: false })
                    }
                } catch (error) {
                    console.error('Fetch providers error:', error)
                    set({ error: 'Failed to fetch providers', isLoading: false })
                }
            },

            addProvider: async (providerData) => {
                const tempId = `temp-${Date.now()}`
                const newProvider: Provider = {
                    ...providerData,
                    id: tempId,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }

                // Optimistic update
                set(state => ({ providers: [...state.providers, newProvider] }))

                if (!useSyncStore.getState().isOnline) {
                    useSyncStore.getState().addToQueue({
                        type: 'CREATE_PROVIDER',
                        payload: providerData
                    })
                    return tempId
                }

                set({ isLoading: true, error: null })
                try {
                    const result = await createProvider(providerData)
                    if (result.success && result.data) {
                        // Replace temp with real
                        set(state => ({
                            providers: state.providers.map(p => p.id === tempId ? result.data! : p),
                            isLoading: false
                        }))
                        return result.data.id
                    } else {
                        // Revert? Or queue?
                        useSyncStore.getState().addToQueue({
                            type: 'CREATE_PROVIDER',
                            payload: providerData
                        })
                        return tempId
                    }
                } catch (error) {
                    useSyncStore.getState().addToQueue({
                        type: 'CREATE_PROVIDER',
                        payload: providerData
                    })
                    return tempId
                }
            },

            updateProvider: async (id, providerData) => {
                // Optimistic update
                set(state => ({
                    providers: state.providers.map(p => p.id === id ? { ...p, ...providerData } : p)
                }))

                if (!useSyncStore.getState().isOnline) {
                    useSyncStore.getState().addToQueue({
                        type: 'UPDATE_PROVIDER',
                        payload: { id, data: providerData }
                    })
                    return true
                }

                set({ isLoading: true, error: null })
                try {
                    const result = await updateProvider(id, providerData)
                    if (result.success) {
                        // await get().fetchProviders() // logic handled by optimistic update mostly, but refresh is good
                        set(state => ({
                            providers: state.providers.map(p => p.id === id ? result.data! : p),
                            isLoading: false
                        }))
                        return true
                    } else {
                        useSyncStore.getState().addToQueue({
                            type: 'UPDATE_PROVIDER',
                            payload: { id, data: providerData }
                        })
                        return true
                    }
                } catch (error) {
                    useSyncStore.getState().addToQueue({
                        type: 'UPDATE_PROVIDER',
                        payload: { id, data: providerData }
                    })
                    return true
                }
            },

            deleteProvider: async (id) => {
                // Optimistic delete
                set(state => ({ providers: state.providers.filter(p => p.id !== id) }))

                if (!useSyncStore.getState().isOnline) {
                    useSyncStore.getState().addToQueue({
                        type: 'DELETE_PROVIDER',
                        payload: { id }
                    })
                    return
                }

                try {
                    const result = await deleteProvider(id)
                    if (!result.success) {
                        useSyncStore.getState().addToQueue({
                            type: 'DELETE_PROVIDER',
                            payload: { id }
                        })
                    }
                } catch (error) {
                    useSyncStore.getState().addToQueue({
                        type: 'DELETE_PROVIDER',
                        payload: { id }
                    })
                }
            },

            clearProviders: () => set({ providers: [] }),

            generateTestData: () => {
                const state = get();
                const existingIds = state.providers.map(p => p.id);
                let nextSequence = 1;

                // Find max sequence
                existingIds.forEach(id => {
                    const parts = id.split('-');
                    if (parts.length === 2 && parts[0] === 'prov') {
                        const seq = parseInt(parts[1], 10);
                        if (!isNaN(seq) && seq >= nextSequence) {
                            nextSequence = seq + 1;
                        }
                    }
                });

                const testProviders: Provider[] = Array.from({ length: 5 }).map((_, i) => {
                    const sequence = nextSequence + i;
                    return {
                        id: `prov-${String(sequence).padStart(4, '0')}`,
                        name: `Proveedor Demo ${sequence}`,
                        contactName: `Contacto ${sequence}`,
                        email: `proveedor${sequence}@demo.com`,
                        phone: `+53 5555 ${String(sequence).padStart(4, '0')}`,
                        address: `Calle ${sequence} #123, La Habana`,
                        taxId: `NIT-${sequence}000`,
                        notes: 'Proveedor generado automáticamente.'
                    }
                })
                set(state => ({ providers: [...state.providers, ...testProviders] }))
            }
        }),
        {
            name: 'providers-storage',
            storage: createJSONStorage(() => idbStorage),
        }
    )
)
