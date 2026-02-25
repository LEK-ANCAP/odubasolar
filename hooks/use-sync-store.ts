import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { idbStorage } from '@/lib/idb-storage'
import { createProduct, updateProduct, deleteProduct } from '@/app/actions/inventory'
import { createBudget, updateBudget, deleteBudget } from '@/app/actions/budgets'
import { createProvider, updateProvider, deleteProvider } from '@/app/actions/providers'
import { toast } from 'sonner'

export type SyncActionType =
    | 'CREATE_PRODUCT' | 'UPDATE_PRODUCT' | 'DELETE_PRODUCT'
    | 'CREATE_INVOICE' | 'UPDATE_INVOICE' | 'DELETE_INVOICE'
    | 'CREATE_BUDGET' | 'UPDATE_BUDGET' | 'DELETE_BUDGET'
    | 'CREATE_PROVIDER' | 'UPDATE_PROVIDER' | 'DELETE_PROVIDER'
    | 'CREATE_CUSTOMER' | 'UPDATE_CUSTOMER' | 'DELETE_CUSTOMER'
    | 'CREATE_ACCOUNT' | 'UPDATE_ACCOUNT' | 'DELETE_ACCOUNT'
    | 'CREATE_MOVEMENT' | 'UPDATE_MOVEMENT' | 'DELETE_MOVEMENT'

export interface SyncAction {
    id: string
    type: SyncActionType
    payload: any
    timestamp: number
    retryCount: number
    status: 'pending' | 'processing' | 'failed'
}

interface SyncState {
    queue: SyncAction[]
    isOnline: boolean
    isSyncing: boolean
    isSessionExpired: boolean
    setSessionExpired: (status: boolean) => void
    addToQueue: (action: Omit<SyncAction, 'id' | 'timestamp' | 'retryCount' | 'status'>) => void
    removeFromQueue: (id: string) => void
    clearQueue: () => void
    purgeStaleEntries: () => void
    setOnlineStatus: (status: boolean) => void
    processQueue: () => Promise<void>
}

export const useSyncStore = create<SyncState>()(
    persist(
        (set, get) => ({
            queue: [],
            isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
            isSyncing: false,
            isSessionExpired: false,

            setSessionExpired: (status) => {
                set({ isSessionExpired: status })
            },

            addToQueue: (action) => {
                const newAction: SyncAction = {
                    ...action,
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                    retryCount: 0,
                    status: 'pending'
                }
                set((state) => ({ queue: [...state.queue, newAction] }))

                // Disparar sincronización silenciosa (Background Sync API) si el navegador lo soporta
                if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window) {
                    navigator.serviceWorker.ready.then(sw => {
                        (sw as any).sync?.register('oduba-sync').catch(console.error)
                    }).catch(console.error)
                }
            },

            removeFromQueue: (id) => {
                set((state) => ({ queue: state.queue.filter((item) => item.id !== id) }))
            },

            clearQueue: () => {
                set({ queue: [] })
            },

            purgeStaleEntries: () => {
                const MAX_RETRIES = 3
                set((state) => ({
                    queue: state.queue.filter((item) => item.retryCount < MAX_RETRIES)
                }))
            },

            setOnlineStatus: (status) => {
                set({ isOnline: status })
                if (status) {
                    get().processQueue()
                }
            },

            processQueue: async () => {
                const state = get()
                if (state.isSyncing || state.queue.length === 0 || !state.isOnline || state.isSessionExpired) return

                set({ isSyncing: true })

                const queue = [...state.queue]
                const MAX_RETRIES = 3

                try {
                    // Process one by one to maintain order
                    for (const action of queue) {
                        // If action exceeded max retries, drop it and move on
                        if (action.retryCount >= MAX_RETRIES) {
                            console.error(`Action ${action.id} (${action.type}) exceeded max retries. Dropping.`)
                            get().removeFromQueue(action.id)
                            continue
                        }

                        try {
                            let success = false
                            let errorMessage = ''

                            // Map action types to actual server actions
                            switch (action.type) {
                                case 'CREATE_PRODUCT':
                                    const createProdResult = await createProduct(action.payload)
                                    success = createProdResult.success
                                    if (!success) errorMessage = createProdResult.error as string
                                    break
                                case 'UPDATE_PRODUCT':
                                    const updateProdResult = await updateProduct(action.payload.id, action.payload.data)
                                    success = updateProdResult.success
                                    if (!success) errorMessage = updateProdResult.error as string
                                    break
                                case 'DELETE_PRODUCT':
                                    const deleteProdResult = await deleteProduct(action.payload.id)
                                    success = deleteProdResult.success
                                    if (!success) errorMessage = deleteProdResult.error as string
                                    break

                                // Budgets
                                case 'CREATE_BUDGET':
                                    const createBudgetResult = await createBudget(action.payload)
                                    success = createBudgetResult.success
                                    if (!success) errorMessage = createBudgetResult.error as string
                                    break
                                case 'UPDATE_BUDGET':
                                    const updateBudgetResult = await updateBudget(action.payload.id, action.payload.data)
                                    success = updateBudgetResult.success
                                    if (!success) errorMessage = updateBudgetResult.error as string
                                    break
                                case 'DELETE_BUDGET':
                                    const deleteBudgetResult = await deleteBudget(action.payload.id)
                                    success = deleteBudgetResult.success
                                    if (!success) errorMessage = deleteBudgetResult.error as string
                                    break

                                // Providers
                                case 'CREATE_PROVIDER':
                                    const createProviderResult = await createProvider(action.payload)
                                    success = createProviderResult.success
                                    if (!success) errorMessage = createProviderResult.error as string
                                    break
                                case 'UPDATE_PROVIDER':
                                    const updateProviderResult = await updateProvider(action.payload.id, action.payload.data)
                                    success = updateProviderResult.success
                                    if (!success) errorMessage = updateProviderResult.error as string
                                    break
                                case 'DELETE_PROVIDER':
                                    const deleteProviderResult = await deleteProvider(action.payload.id)
                                    success = deleteProviderResult.success
                                    if (!success) errorMessage = deleteProviderResult.error as string
                                    break

                                // Customers
                                case 'CREATE_CUSTOMER':
                                    const { createCustomerAction } = await import('@/app/actions/customers')
                                    const createCustResult = await createCustomerAction(action.payload)
                                    success = createCustResult.success
                                    if (!success) errorMessage = createCustResult.error as string
                                    break
                                case 'UPDATE_CUSTOMER':
                                    const { updateCustomerAction } = await import('@/app/actions/customers')
                                    const updateCustResult = await updateCustomerAction(action.payload.id, action.payload.data)
                                    success = updateCustResult.success
                                    if (!success) errorMessage = updateCustResult.error as string
                                    break
                                case 'DELETE_CUSTOMER':
                                    const { deleteCustomerAction } = await import('@/app/actions/customers')
                                    const deleteCustResult = await deleteCustomerAction(action.payload.id)
                                    success = deleteCustResult.success
                                    if (!success) errorMessage = deleteCustResult.error as string
                                    break

                                default:
                                    console.warn(`Unhandled action type: ${action.type}. Removing from queue.`)
                                    success = true // Treat as handled to remove it
                                    break
                            }

                            if (success) {
                                get().removeFromQueue(action.id)
                            } else {
                                // 1. Validar Fallo por expiración de Autenticación
                                const isAuthError = errorMessage.toLowerCase().includes('unauthorized') ||
                                    errorMessage.toLowerCase().includes('unauthenticated') ||
                                    errorMessage.includes('401') ||
                                    errorMessage.includes('403');

                                if (isAuthError) {
                                    console.warn(`Auth error detected. Exiting sync loop.`);
                                    set({ isSessionExpired: true })
                                    break;
                                }

                                console.error(`Failed to process action ${action.id} (${action.type}): ${errorMessage}`)
                                const updatedRetries = (action.retryCount || 0) + 1
                                if (updatedRetries >= MAX_RETRIES) {
                                    console.error(`Action ${action.id} (${action.type}) reached max retries. Dropping and sending Rollback.`)
                                    get().removeFromQueue(action.id)
                                    toast.error(`Un cambio local (${action.type}) fue rechazado permanentemente por el servidor.`)

                                    // 3. Ejecutar Rollback del store afectado para restaurar con la verdad del servidor
                                    try {
                                        if (action.type.includes('CUSTOMER')) {
                                            const { useCustomersStore } = await import('@/hooks/use-customers-store')
                                            useCustomersStore.getState().fetchCustomers()
                                        } else if (action.type.includes('BUDGET')) {
                                            const { useBudgetsStore } = await import('@/hooks/use-budgets-store')
                                            useBudgetsStore.getState().fetchBudgets()
                                        } else if (action.type.includes('PRODUCT')) {
                                            const { useInventoryStore } = await import('@/hooks/use-inventory-store')
                                            useInventoryStore.getState().fetchProducts()
                                        } else if (action.type.includes('PROVIDER')) {
                                            const { useProvidersStore } = await import('@/hooks/use-providers-store')
                                            useProvidersStore.getState().fetchProviders()
                                        } else if (action.type.includes('INVOICE')) {
                                            // TODO: Implement fetchInvoices in useInvoicesStore to rollback
                                            // const { useInvoicesStore } = await import('@/hooks/use-invoices-store')
                                            // useInvoicesStore.getState().fetchInvoices()
                                        }
                                    } catch (e) {
                                        console.error('Failed to execute rollback logic: ', e)
                                    }
                                } else {
                                    set((state) => ({
                                        queue: state.queue.map(item =>
                                            item.id === action.id
                                                ? { ...item, retryCount: updatedRetries }
                                                : item
                                        )
                                    }))
                                }
                            }
                        } catch (error: any) {
                            console.error(`Error processing action ${action.id} (${action.type}):`, error)

                            const isAuthError = error?.message?.includes('401') || error?.message?.includes('403') || error?.message?.toLowerCase().includes('unauthorized');
                            if (isAuthError) {
                                console.warn(`Auth error detected, suspending queue.`);
                                set({ isSessionExpired: true })
                                break;
                            }

                            // Do not increment retries on network failures
                            const isNetworkError = error?.message?.includes('fetch failed') || error?.message?.includes('Network Error') || !navigator.onLine;
                            if (isNetworkError) {
                                console.warn(`Network error detected, suspending queue processing.`);
                                break;
                            }

                            const updatedRetries = (action.retryCount || 0) + 1
                            if (updatedRetries >= MAX_RETRIES) {
                                get().removeFromQueue(action.id)
                                toast.error(`Un cambio local (${action.type}) falló permanentemente.`)

                                try {
                                    if (action.type.includes('CUSTOMER')) {
                                        const { useCustomersStore } = await import('@/hooks/use-customers-store')
                                        useCustomersStore.getState().fetchCustomers()
                                    } else if (action.type.includes('BUDGET')) {
                                        const { useBudgetsStore } = await import('@/hooks/use-budgets-store')
                                        useBudgetsStore.getState().fetchBudgets()
                                    } else if (action.type.includes('PRODUCT')) {
                                        const { useInventoryStore } = await import('@/hooks/use-inventory-store')
                                        useInventoryStore.getState().fetchProducts()
                                    } else if (action.type.includes('PROVIDER')) {
                                        const { useProvidersStore } = await import('@/hooks/use-providers-store')
                                        useProvidersStore.getState().fetchProviders()
                                    } else if (action.type.includes('INVOICE')) {
                                        // TODO: Implement fetchInvoices in useInvoicesStore to rollback
                                        // const { useInvoicesStore } = await import('@/hooks/use-invoices-store')
                                        // useInvoicesStore.getState().fetchInvoices()
                                    }
                                } catch (e) {
                                    console.error('Failed to execute rollback logic: ', e)
                                }
                            } else {
                                set((state) => ({
                                    queue: state.queue.map(item =>
                                        item.id === action.id
                                            ? { ...item, retryCount: updatedRetries }
                                            : item
                                    )
                                }))
                            }
                        }
                    }
                } finally {
                    // Always reset isSyncing, even if an unexpected error occurred
                    set({ isSyncing: false })
                }
            }
        }),
        {
            name: 'sync-queue-storage',
            storage: createJSONStorage(() => idbStorage),
        }
    )
)

// Attach global network listeners if in browser
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        useSyncStore.getState().setOnlineStatus(true)
    })
    window.addEventListener('offline', () => {
        useSyncStore.getState().setOnlineStatus(false)
    })
}
