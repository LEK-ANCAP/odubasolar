import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { idbStorage } from '@/lib/idb-storage'

export interface Customer {
    id: string
    name: string
    email?: string
    phone?: string
    address?: string
    notes?: string
    // Computed/Mocked fields for demo
    totalSpent?: number
    ordersCount?: number
    lastOrderDate?: string
    status: 'active' | 'inactive'
    createdAt: string
}

interface CustomersState {
    customers: Customer[]
    addCustomer: (customer: Customer) => void
    updateCustomer: (id: string, customer: Partial<Customer>) => void
    deleteCustomer: (id: string) => void
    clearCustomers: () => void
    generateTestData: () => void
    fetchCustomers: () => Promise<void>
}

const defaultCustomers: Customer[] = [
    {
        id: 'mostrador',
        name: 'Cliente Mostrador',
        address: 'Local',
        status: 'active',
        createdAt: new Date().toISOString(),
        totalSpent: 0,
        ordersCount: 0
    }
]

import { fetchCustomersAction, createCustomerAction, updateCustomerAction, deleteCustomerAction } from '@/app/actions/customers'

export const useCustomersStore = create<CustomersState>()(
    persist(
        (set, get) => ({
            customers: defaultCustomers,
            addCustomer: async (customer) => {
                // Optimistic update
                set((state) => ({ customers: [...state.customers, customer] }))

                try {
                    const result = await createCustomerAction(customer)
                    if (result.success && result.data) {
                        // Replace the optimistic customer with the real one from DB
                        set((state) => ({
                            customers: state.customers.map((c) => (c.id === customer.id ? result.data! : c))
                        }))
                    } else {
                        console.error("Failed to create customer:", result.error)
                        // Revert on failure
                        set((state) => ({
                            customers: state.customers.filter((c) => c.id !== customer.id)
                        }))
                    }
                } catch (e) {
                    console.error("Error adding customer:", e)
                    // Revert
                    set((state) => ({
                        customers: state.customers.filter((c) => c.id !== customer.id)
                    }))
                }
            },
            updateCustomer: async (id, updatedCustomer) => {
                // Optimistic
                set((state) => ({
                    customers: state.customers.map((c) => (c.id === id ? { ...c, ...updatedCustomer } : c)),
                }))

                try {
                    const result = await updateCustomerAction(id, updatedCustomer)
                    if (result.success && result.data) {
                        set((state) => ({
                            customers: state.customers.map((c) => (c.id === id ? result.data! : c))
                        }))
                    } else {
                        // Revert? (Complex without previous state, let's just log for now or reload)
                        console.error("Failed to update customer:", result.error)
                    }
                } catch (e) {
                    console.error("Error updating customer:", e)
                }
            },
            deleteCustomer: async (id) => {
                // Optimistic
                set((state) => ({
                    customers: state.customers.filter((c) => c.id !== id),
                }))

                try {
                    await deleteCustomerAction(id)
                } catch (e) {
                    console.error("Error deleting customer:", e)
                    // Revert? Fetch again to sync
                    get().fetchCustomers()
                }
            },
            clearCustomers: () => set({ customers: [] }),
            generateTestData: () => {
                const state = get();
                const existingIds = state.customers.map(c => c.id);
                let nextSequence = 1;

                // Find max sequence 
                existingIds.forEach(id => {
                    const parts = id.split('-');
                    if (parts.length === 2 && parts[0] === 'cust') {
                        const seq = parseInt(parts[1], 10);
                        if (!isNaN(seq) && seq >= nextSequence) {
                            nextSequence = seq + 1;
                        }
                    }
                });

                const testCustomers: Customer[] = Array.from({ length: 5 }).map((_, i) => {
                    const sequence = nextSequence + i;
                    const id = `cust-${String(sequence).padStart(4, '0')}`;
                    return {
                        id: id,
                        name: `Cliente Prueba ${sequence}`,
                        email: `cliente${sequence}@ejemplo.com`,
                        phone: `+53 5${Math.floor(Math.random() * 9000000) + 1000000}`,
                        address: `Calle ${Math.floor(Math.random() * 100)} #${Math.floor(Math.random() * 1000)}, Vedado, La Habana`,
                        status: Math.random() > 0.2 ? 'active' : 'inactive',
                        createdAt: new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toISOString(),
                        totalSpent: Math.floor(Math.random() * 5000),
                        ordersCount: Math.floor(Math.random() * 20),
                        lastOrderDate: new Date(Date.now() - Math.floor(Math.random() * 1000000000)).toISOString()
                    }
                })
                set((state) => ({ customers: [...state.customers, ...testCustomers] }))
            },
            fetchCustomers: async () => {
                const result = await fetchCustomersAction()
                if (result.success && result.data) {
                    set({ customers: result.data })
                }
            }
        }),
        {
            name: 'customers-storage',
            storage: createJSONStorage(() => idbStorage),
        }
    )
)
