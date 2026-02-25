import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { idbStorage } from '@/lib/idb-storage'

export interface InvoiceItem {
    id: string
    productId: string
    productName: string
    quantity: number
    price: number
    total: number
    // For manufacture kits: stores sub-products for inventory deduction
    kitComponents?: { productId: string; quantity: number }[]
    isManufactureKit?: boolean
}

export interface InvoicePayment {
    id: string
    date: string
    amount: number
    method: 'cash' | 'transfer' | 'card' | 'other'
    accountId: string
    notes?: string
}

export interface Invoice {
    id: string
    customerId: string
    customerName: string
    date: string
    dueDate: string
    currency: string
    budgetId?: string
    status: 'draft' | 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled'
    items: InvoiceItem[]
    subtotal: number
    tax: number
    discountType?: 'PERCENTAGE' | 'FIXED' | 'TARGET_PRICE'
    discountValue?: number
    total: number
    notes?: string
    payments: InvoicePayment[]
    history?: InvoiceHistoryEntry[]
}

export interface InvoiceHistoryEntry {
    id: string
    date: string
    action: 'created' | 'updated' | 'status_change' | 'payment_added'
    description: string
    changes?: Record<string, { from: any, to: any }>
}

interface InvoicesState {
    invoices: Invoice[]
    addInvoice: (invoice: Invoice) => void
    updateInvoice: (id: string, invoice: Partial<Invoice>) => void
    deleteInvoice: (id: string) => void
    addPayment: (invoiceId: string, payment: InvoicePayment) => void
    clearInvoices: () => void
    generateTestData: () => void
}

const defaultInvoices: Invoice[] = []

export const useInvoicesStore = create<InvoicesState>()(
    persist(
        (set, get) => ({
            invoices: defaultInvoices,
            addInvoice: (invoice) => set((state) => ({ invoices: [...state.invoices, { ...invoice, payments: invoice.payments || [] }] })),
            updateInvoice: (id, updatedInvoice) => set((state) => ({
                invoices: state.invoices.map((inv) => (inv.id === id ? { ...inv, ...updatedInvoice } : inv)),
            })),
            deleteInvoice: (id) => set((state) => ({
                invoices: state.invoices.filter((inv) => inv.id !== id),
            })),
            addPayment: (invoiceId, payment) => set((state) => {
                const invoice = state.invoices.find(i => i.id === invoiceId)
                if (!invoice) return { invoices: state.invoices }

                const updatedPayments = [...(invoice.payments || []), payment]
                const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0)

                let newStatus: Invoice['status'] = invoice.status
                if (totalPaid >= invoice.total) {
                    newStatus = 'paid'
                } else if (totalPaid > 0) {
                    newStatus = 'partial'
                } else {
                    newStatus = 'pending' // Or keep original if it was overdue? Let's stick to simple logic for now
                }

                return {
                    invoices: state.invoices.map(i => i.id === invoiceId ? { ...i, payments: updatedPayments, status: newStatus } : i)
                }
            }),
            clearInvoices: () => set({ invoices: [] }),
            generateTestData: () => {
                const currentYear = new Date().getFullYear();
                const state = get();
                const existingIds = state.invoices.map(i => i.id);
                let nextSequence = 1;

                // Find max sequence for current year to avoid duplicates
                existingIds.forEach(id => {
                    const parts = id.split('-');
                    if (parts.length === 3 && parts[1] === String(currentYear)) {
                        const seq = parseInt(parts[2], 10);
                        if (!isNaN(seq) && seq >= nextSequence) {
                            nextSequence = seq + 1;
                        }
                    }
                });

                const testInvoices: Invoice[] = Array.from({ length: 5 }).map((_, i) => { // Reduced to 5 for less clutter
                    const sequence = nextSequence + i;
                    const subtotal = Math.floor(Math.random() * 5000) + 100
                    const tax = subtotal * 0.10
                    const total = subtotal + tax
                    const statusOptions: Invoice['status'][] = ['draft', 'pending', 'paid', 'overdue', 'cancelled']

                    return {
                        id: `INV-${currentYear}-${String(sequence).padStart(4, '0')}`,
                        customerId: `cust-${Math.random().toString(36).substr(2, 9)}`,
                        customerName: `Cliente Demo ${sequence}`,
                        date: new Date(Date.now() - Math.floor(Math.random() * 1000000000)).toISOString(),
                        dueDate: new Date(Date.now() + Math.floor(Math.random() * 1000000000)).toISOString(),
                        currency: 'USD',
                        status: statusOptions[Math.floor(Math.random() * statusOptions.length)],
                        items: [
                            {
                                id: `item-${sequence}-1`,
                                productId: 'prod-1',
                                productName: 'Panel Solar 450W',
                                quantity: 2,
                                price: subtotal / 2,
                                total: subtotal
                            }
                        ],
                        subtotal: subtotal,
                        tax: tax,
                        total: total,
                        notes: 'Generado automáticamente para pruebas.',
                        payments: []
                    }
                })
                set((state) => ({ invoices: [...state.invoices, ...testInvoices] }))
            }
        }),
        {
            name: 'invoices-storage',
            storage: createJSONStorage(() => idbStorage),
        }
    )
)
