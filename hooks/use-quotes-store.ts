import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { idbStorage } from '@/lib/idb-storage'

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected'

export interface QuoteItem {
    productId: string
    quantity: number
    unitPrice: number
}

export interface Quote {
    id: string
    customerId: string
    date: string
    expirationDate?: string
    status: QuoteStatus
    items: QuoteItem[]
    totalAmount: number
    notes?: string
    discountType?: 'amount' | 'percentage' | 'fixed_total'
    discountValue?: number
    name?: string
}

interface QuotesState {
    quotes: Quote[]
    addQuote: (quote: Quote) => void
    updateQuote: (id: string, quote: Partial<Quote>) => void
    deleteQuote: (id: string) => void
}

export const useQuotesStore = create<QuotesState>()(
    persist(
        (set) => ({
            quotes: [],
            addQuote: (quote) => set((state) => ({ quotes: [quote, ...state.quotes] })),
            updateQuote: (id, updatedQuote) => set((state) => ({
                quotes: state.quotes.map((q) => (q.id === id ? { ...q, ...updatedQuote } : q)),
            })),
            deleteQuote: (id) => set((state) => ({ quotes: state.quotes.filter((q) => q.id !== id) })),
        }),
        {
            name: 'quotes-storage',
            storage: createJSONStorage(() => idbStorage),
        }
    )
)
