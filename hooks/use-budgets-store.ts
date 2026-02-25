import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { idbStorage } from '@/lib/idb-storage'
import { getBudgets, createBudget, updateBudget, deleteBudget } from '@/app/actions/budgets'
import { useSyncStore } from './use-sync-store'

export interface BudgetItem {
    id?: string
    productId: string
    name: string
    quantity: number
    unitPrice: number
    subtotal: number
}

export interface Budget {
    id: string
    displayId?: string
    name?: string
    clientId: string
    clientName: string
    currency: string
    discountType?: 'PERCENTAGE' | 'FIXED' | 'TARGET_PRICE'
    discountValue?: number
    notes?: string
    createdAt?: string
    date: string // ISO string from createdAt
    validUntil?: string
    status: 'DRAFT' | 'SENT' | 'APPROVED' | 'PAID' | 'CANCELLED'
    items: BudgetItem[]
    totalAmount: number
}

interface BudgetsState {
    budgets: Budget[]
    isLoading: boolean
    error: string | null
    fetchBudgets: () => Promise<void>
    addBudget: (budget: any) => Promise<boolean>
    updateBudget: (id: string, budget: any) => Promise<boolean>
    deleteBudget: (id: string) => Promise<void>
    // Demo actions
    generateTestData: () => void
    clearBudgets: () => void
}

export const useBudgetsStore = create<BudgetsState>()(
    persist(
        (set, get) => ({
            budgets: [],
            isLoading: false,
            error: null,

            fetchBudgets: async () => {
                // If offline, rely on persisted data
                if (!useSyncStore.getState().isOnline) {
                    return
                }

                set({ isLoading: true, error: null })
                try {
                    const result = await getBudgets()
                    if (result.success && result.data) {
                        const mappedBudgets = result.data.map((b: any) => ({
                            id: b.id,
                            displayId: b.displayId || 'PRE-2024-XXXX', // Fallback for existing items
                            name: b.name,
                            clientId: b.clientId || '',
                            clientName: b.clientName || '',
                            date: b.createdAt.toISOString(),
                            validUntil: b.validUntil ? b.validUntil.toISOString() : undefined,
                            status: b.status as any,
                            totalAmount: b.totalAmount,
                            currency: b.currency || 'USD',
                            discountType: b.discountType,
                            discountValue: b.discountValue,
                            notes: b.notes,
                            items: b.items.map((i: any) => ({
                                id: i.id,
                                productId: i.productId || '',
                                name: i.name,
                                quantity: i.quantity,
                                unitPrice: i.unitPrice,
                                subtotal: i.subtotal
                            }))
                        }))
                        set({ budgets: mappedBudgets, isLoading: false })
                    } else {
                        set({ error: result.error as string, isLoading: false })
                    }
                } catch (error) {
                    console.error('Fetch budgets error:', error)
                    set({ error: 'Failed to fetch budgets', isLoading: false })
                }
            },

            addBudget: async (budgetData) => {
                // Optimistic Update is tricky without a real ID, but for demo/offline we generate one
                // For now, we follow the pattern: try server, if fail/offline -> queue

                if (!useSyncStore.getState().isOnline) {
                    const tempId = `temp-${Date.now()}`
                    const newBudget: Budget = { ...budgetData, id: tempId, date: new Date().toISOString() }
                    set(state => ({ budgets: [...state.budgets, newBudget] }))

                    useSyncStore.getState().addToQueue({
                        type: 'CREATE_BUDGET',
                        payload: budgetData
                    })
                    return true
                }

                set({ isLoading: true, error: null })
                try {
                    const result = await createBudget(budgetData)
                    if (result.success && result.data) {
                        await get().fetchBudgets()
                        return true
                    } else {
                        set({ error: result.error as string, isLoading: false })
                        return false
                    }
                } catch (error) {
                    // Fallback to offline queue if request fails
                    const tempId = `temp-${Date.now()}`
                    const newBudget: Budget = { ...budgetData, id: tempId, date: new Date().toISOString() }
                    set(state => ({ budgets: [...state.budgets, newBudget], isLoading: false }))

                    useSyncStore.getState().addToQueue({
                        type: 'CREATE_BUDGET',
                        payload: budgetData
                    })
                    return true
                }
            },

            updateBudget: async (id, budgetData) => {
                if (!useSyncStore.getState().isOnline) {
                    set(state => ({
                        budgets: state.budgets.map(b => b.id === id ? { ...b, ...budgetData } : b)
                    }))
                    useSyncStore.getState().addToQueue({
                        type: 'UPDATE_BUDGET',
                        payload: { id, data: budgetData }
                    })
                    return true
                }

                set({ isLoading: true, error: null })
                try {
                    const result = await updateBudget(id, budgetData)
                    if (result.success) {
                        await get().fetchBudgets()
                        return true
                    } else {
                        set({ error: result.error as string, isLoading: false })
                        return false
                    }
                } catch (error) {
                    set(state => ({
                        budgets: state.budgets.map(b => b.id === id ? { ...b, ...budgetData } : b),
                        isLoading: false
                    }))
                    useSyncStore.getState().addToQueue({
                        type: 'UPDATE_BUDGET',
                        payload: { id, data: budgetData }
                    })
                    return true
                }
            },

            deleteBudget: async (id) => {
                // Optimistic delete
                set(state => ({ budgets: state.budgets.filter(b => b.id !== id) }))

                if (!useSyncStore.getState().isOnline) {
                    useSyncStore.getState().addToQueue({
                        type: 'DELETE_BUDGET',
                        payload: { id }
                    })
                    return
                }

                try {
                    const result = await deleteBudget(id)
                    if (!result.success) {
                        // Revert if failed (optional, but good practice) - skipped for simplicity in this demo context
                        // If it failed, we might want to queue it anyway?
                        throw new Error(result.error as string)
                    }
                } catch (error) {
                    // Queue for retry
                    useSyncStore.getState().addToQueue({
                        type: 'DELETE_BUDGET',
                        payload: { id }
                    })
                }
            },

            clearBudgets: () => set({ budgets: [] }),

            generateTestData: async () => {
                const currentYear = new Date().getFullYear();
                const state = get();
                const existingIds = state.budgets.map(b => b.id);
                let nextSequence = 1;

                // Find max sequence
                existingIds.forEach(id => {
                    const parts = id.split('-');
                    if (parts.length === 3 && parts[1] === String(currentYear)) {
                        const seq = parseInt(parts[2], 10);
                        if (!isNaN(seq) && seq >= nextSequence) {
                            nextSequence = seq + 1;
                        }
                    }
                });

                set({ isLoading: true })

                // Create 3 demo budgets sequentially
                for (let i = 0; i < 3; i++) {
                    const sequence = nextSequence + i;
                    const subtotal = Math.floor(Math.random() * 5000) + 100

                    // Create payload compatible with createBudget action
                    const budgetPayload = {
                        clientName: `Cliente Demo ${sequence}`,
                        date: new Date(Date.now() - Math.floor(Math.random() * 1000000000)).toISOString(),
                        validUntil: new Date(Date.now() + Math.floor(Math.random() * 1000000000)).toISOString(),
                        status: ['DRAFT', 'SENT', 'APPROVED', 'PAID', 'CANCELLED'][Math.floor(Math.random() * 5)],
                        items: [
                            {
                                productId: 'prod-1', // Assuming prod-1 exists from inventory demo
                                name: 'Instalación Solar Básica',
                                quantity: 1,
                                unitPrice: subtotal,
                            }
                        ],
                        currency: 'USD',
                        notes: 'Presupuesto generado automáticamente.'
                    }

                    await get().addBudget(budgetPayload)
                }

                set({ isLoading: false })
            }
        }),
        {
            name: 'budgets-storage',
            storage: createJSONStorage(() => idbStorage),
        }
    )
)
