import { create } from 'zustand'
import {
    getPurchaseOrders,
    createPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder,
    deletePurchaseOrders,
    receivePurchaseOrder
} from '@/app/actions/purchase-orders'

export type OrderStatus = 'draft' | 'ordered' | 'received' | 'cancelled'

export interface OrderItem {
    productId: string
    quantity: number
    unitCost: number
}

// Frontend interface adapted from DB model
export interface Order {
    id: string
    supplier: string // Display name (Provider Name)
    providerId: string // Provider ID
    date: string
    status: OrderStatus
    items: OrderItem[]
    totalAmount: number
    notes?: string
    paymentStatus?: 'unpaid' | 'paid' | 'partial'
    paymentAccountId?: string
    paymentDate?: string
}

interface OrdersState {
    orders: Order[]
    isLoading: boolean
    error: string | null

    fetchOrders: () => Promise<void>
    addOrder: (order: Partial<Order>) => Promise<string | null>
    updateOrder: (id: string, order: Partial<Order>) => Promise<void>
    deleteOrder: (id: string) => Promise<void>
    deleteOrders: (ids: string[]) => Promise<void>
    receiveOrder: (id: string, receiveDate: string) => Promise<void>
}

export const useOrdersStore = create<OrdersState>((set, get) => ({
    orders: [],
    isLoading: false,
    error: null,

    fetchOrders: async () => {
        set({ isLoading: true, error: null })
        try {
            const result = await getPurchaseOrders()
            if (result.success && result.data) {
                const mappedOrders: Order[] = result.data.map((p: any) => ({
                    id: p.id,
                    supplier: p.provider.name,
                    providerId: p.providerId,
                    date: p.date.toISOString(),
                    status: p.status.toLowerCase() as OrderStatus,
                    items: p.items.map((i: any) => ({
                        productId: i.productId,
                        quantity: i.quantity,
                        unitCost: Number(i.unitCost)
                    })),
                    totalAmount: Number(p.totalAmount),
                    notes: p.notes || "",
                    paymentStatus: (p.paymentStatus || 'UNPAID').toLowerCase() as Order['paymentStatus'],
                    paymentAccountId: p.paymentAccountId || undefined,
                    paymentDate: p.paymentDate ? p.paymentDate.toISOString() : undefined,
                }))
                set({ orders: mappedOrders, isLoading: false })
            } else {
                set({ error: result.error as string, isLoading: false })
            }
        } catch (error) {
            set({ error: 'Failed to fetch orders', isLoading: false })
        }
    },

    addOrder: async (orderData) => {
        set({ isLoading: true })
        try {
            // Transform frontend Order data to Server Action payload
            const payload = {
                providerId: orderData.providerId || "",
                date: new Date(orderData.date || Date.now()),
                status: (orderData.status || "draft").toUpperCase(),
                items: orderData.items || [],
                notes: orderData.notes,
                paymentStatus: orderData.paymentStatus ? orderData.paymentStatus.toUpperCase() : 'UNPAID',
                paymentAccountId: orderData.paymentAccountId,
                paymentDate: orderData.paymentDate ? new Date(orderData.paymentDate) : undefined,
            }

            const result = await createPurchaseOrder(payload)
            if (result.success && result.data) {
                // Refresh to get full data with provider relation
                await get().fetchOrders()
                return result.data.id
            } else {
                set({ error: result.error as string, isLoading: false })
                return null
            }
        } catch (error) {
            set({ error: 'Failed to create order', isLoading: false })
            return null
        }
    },

    updateOrder: async (id, orderData) => {
        set({ isLoading: true })
        try {
            const payload: any = {}
            if (orderData.providerId) payload.providerId = orderData.providerId
            if (orderData.date) payload.date = new Date(orderData.date)
            if (orderData.status) payload.status = orderData.status.toUpperCase()
            if (orderData.items) payload.items = orderData.items
            if (orderData.notes !== undefined) payload.notes = orderData.notes
            if (orderData.paymentStatus !== undefined) payload.paymentStatus = orderData.paymentStatus.toUpperCase()
            if (orderData.paymentAccountId !== undefined) payload.paymentAccountId = orderData.paymentAccountId
            if (orderData.paymentDate !== undefined) payload.paymentDate = new Date(orderData.paymentDate)

            const result = await updatePurchaseOrder(id, payload)
            if (result.success) {
                await get().fetchOrders()
            } else {
                set({ error: result.error as string, isLoading: false })
            }
        } catch (error) {
            set({ error: 'Failed to update order', isLoading: false })
        }
    },

    deleteOrder: async (id) => {
        set({ isLoading: true })
        try {
            const result = await deletePurchaseOrder(id)
            if (!result.success) {
                set({ error: result.error as string })
                // Revert if failed (optional, but good practice) - skipped for simplicity
                await get().fetchOrders()
            }
        } catch (error) {
            set({ error: 'Failed to delete order' })
        }
    },

    deleteOrders: async (ids) => {
        // Optimistic Update
        set(state => ({
            orders: state.orders.filter(o => !ids.includes(o.id))
        }))

        try {
            const result = await deletePurchaseOrders(ids)
            if (!result.success) {
                set({ error: result.error as string })
                await get().fetchOrders() // Revert/Refresh
            }
        } catch (error) {
            set({ error: 'Failed to delete orders' })
            await get().fetchOrders()
        }
    },

    receiveOrder: async (id, receiveDate) => {
        set({ isLoading: true })
        try {
            const result = await receivePurchaseOrder(id)
            if (result.success) {
                await get().fetchOrders()
                // Trigger inventory refresh to update stock
                const { useInventoryStore } = await import('./use-inventory-store')
                useInventoryStore.getState().fetchProducts()
            } else {
                set({ error: result.error as string, isLoading: false })
            }
        } catch (error) {
            set({ error: 'Failed to receive order', isLoading: false })
        }
    }
}))
