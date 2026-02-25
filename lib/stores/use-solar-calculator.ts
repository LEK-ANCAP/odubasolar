import { create } from 'zustand'

export type RoofType = 'flat' | 'pitched' | 'tile' | 'metal'

interface CalculatorState {
    step: number
    location: string
    monthlyBill: number
    roofType: RoofType | null
    contact: {
        name: string
        email: string
        phone: string
    }

    setStep: (step: number) => void
    nextStep: () => void
    prevStep: () => void
    setLocation: (location: string) => void
    setMonthlyBill: (bill: number) => void
    setRoofType: (roof: RoofType) => void
    setContact: (contact: Partial<CalculatorState['contact']>) => void
    reset: () => void
}

export const useSolarCalculator = create<CalculatorState>((set) => ({
    step: 1,
    location: '',
    monthlyBill: 1500, // Default value in MXN or USD depending on context, let's assume reasonable bill
    roofType: null,
    contact: {
        name: '',
        email: '',
        phone: ''
    },

    setStep: (step) => set({ step }),
    nextStep: () => set((state) => ({ step: Math.min(state.step + 1, 4) })),
    prevStep: () => set((state) => ({ step: Math.max(state.step - 1, 1) })),
    setLocation: (location) => set({ location }),
    setMonthlyBill: (monthlyBill) => set({ monthlyBill }),
    setRoofType: (roofType) => set({ roofType }),
    setContact: (contact) => set((state) => ({ contact: { ...state.contact, ...contact } })),
    reset: () => set({
        step: 1,
        location: '',
        monthlyBill: 1500,
        roofType: null,
        contact: { name: '', email: '', phone: '' }
    })
}))
