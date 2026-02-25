import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { idbStorage } from '@/lib/idb-storage'

export type Currency = 'USD' | 'CUP'

export interface Account {
    id: string
    name: string
    type: 'cash' | 'bank' | 'other'
    currency: Currency
    balance: number
    description?: string
}

export interface Movement {
    id: string
    accountId: string
    date: string
    description: string
    amount: number // Negative for expense, positive for income
    type: 'income' | 'expense' | 'transfer'
    referenceId?: string // Order ID, Invoice ID, etc.
    category?: string
}

interface AccountsState {
    accounts: Account[]
    movements: Movement[]
    addAccount: (account: Account) => void
    updateAccount: (id: string, account: Partial<Account>) => void
    deleteAccount: (id: string) => void
    addMovement: (movement: Movement) => void
    clearAccounts: () => void
    generateTestData: () => void
}

export const useAccountsStore = create<AccountsState>()(
    persist(
        (set, get) => ({
            accounts: [],
            movements: [],

            addAccount: (account) => set((state) => ({
                accounts: [...state.accounts, account]
            })),

            updateAccount: (id, updatedAccount) => set((state) => ({
                accounts: state.accounts.map((a) => (a.id === id ? { ...a, ...updatedAccount } : a)),
            })),

            deleteAccount: (id) => set((state) => ({
                accounts: state.accounts.filter((a) => a.id !== id),
                movements: state.movements.filter((m) => m.accountId !== id) // Cascade delete movements? Or keep for history? Let's delete for now to keep it clean.
            })),

            addMovement: (movement: Movement) => {
                const state = get() // Fixed: use get() instead of closing over 'accounts' from line 55
                const account = state.accounts.find(a => a.id === movement.accountId)

                if (!account) return

                // Update Account Balance
                const newBalance = movement.type === 'income'
                    ? account.balance + movement.amount
                    : account.balance - movement.amount // Assuming amount is positive in movement object, or handle sign logic

                // Ensure movement amount is stored with correct sign if needed, or just type

                set((state) => ({
                    movements: [movement, ...state.movements],
                    accounts: state.accounts.map((a) =>
                        a.id === movement.accountId ? { ...a, balance: newBalance } : a
                    )
                }))
            },

            clearAccounts: () => set({ accounts: [], movements: [] }),

            generateTestData: () => {
                const testAccounts: Account[] = [
                    { id: 'acc-1', name: 'Efectivo Principal', type: 'cash', currency: 'CUP', balance: 50000, description: 'Caja chica' },
                    { id: 'acc-2', name: 'Banco Metropolitano', type: 'bank', currency: 'CUP', balance: 150000, description: 'Cuenta operación' },
                    { id: 'acc-3', name: 'Reserva USD', type: 'cash', currency: 'USD', balance: 2000, description: 'Fondo de emergencia' },
                ]

                const testMovements: Movement[] = [
                    { id: 'mov-1', accountId: 'acc-1', date: new Date().toISOString(), description: 'Venta contado', amount: 5000, type: 'income', category: 'Ventas' },
                    { id: 'mov-2', accountId: 'acc-1', date: new Date().toISOString(), description: 'Pago Almuerzo', amount: 1500, type: 'expense', category: 'Dieta' },
                ]

                set({ accounts: testAccounts, movements: testMovements })
            }
        }),
        {
            name: 'accounts-storage',
            storage: createJSONStorage(() => idbStorage),
        }
    )
)
