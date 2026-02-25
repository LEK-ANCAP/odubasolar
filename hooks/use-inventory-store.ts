import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { idbStorage } from '@/lib/idb-storage'
import { getProducts, createProduct, updateProduct, deleteProduct } from '@/app/actions/inventory'
import { useSyncStore } from './use-sync-store'

export interface Product {
    id: string
    name: string
    category: string
    stock: number
    costCup: number
    costUsd: number
    saleCup: number
    saleUsd: number
    status: 'in_stock' | 'low_stock' | 'out_of_stock'
    lowStockThreshold?: number
    description?: string
    weightedCost?: number
    useWeightedCost?: boolean
    sku?: string
}

interface InventoryState {
    products: Product[]
    categories: string[]
    isLoading: boolean
    error: string | null
    fetchProducts: () => Promise<void>
    addProduct: (product: any) => Promise<boolean>
    updateProduct: (id: string, product: any) => Promise<boolean>
    deleteProduct: (id: string) => Promise<{ success: boolean; error?: string }>
    addCategory: (category: string) => void
    removeCategory: (category: string) => void
    generateTestData: () => void
    clearProducts: () => void
}

const defaultCategories = [
    "Cableado",
    "Accesorios",
    "Fijación",
    "Conectores",
    "Estructura",
    "Protecciones",
    "Montaje",
    "Paneles",
    "Inversores",
    "Baterías"
]

const getStatus = (stock: number, minStock: number): 'in_stock' | 'low_stock' | 'out_of_stock' => {
    if (stock <= 0) return 'out_of_stock'
    if (stock < minStock) return 'low_stock'
    return 'in_stock'
}

export const useInventoryStore = create<InventoryState>()(
    persist(
        (set, get) => ({
            products: [],
            categories: defaultCategories,
            isLoading: false,
            error: null,

            fetchProducts: async () => {
                // If offline, trust persisted data
                if (!useSyncStore.getState().isOnline) {
                    return
                }

                set({ isLoading: true, error: null })
                try {
                    const result = await getProducts()
                    if (result.success && result.data) {
                        const mappedProducts = result.data.map((p: any) => {
                            const specs = typeof p.specs === 'string' ? JSON.parse(p.specs) : (p.specs || {})
                            return {
                                id: p.id,
                                name: p.name,
                                category: p.category,
                                stock: p.stock,
                                costCup: specs.costCup || 0,
                                costUsd: Number(p.costPrice) || 0,
                                saleCup: specs.saleCup || 0,
                                saleUsd: Number(p.price) || 0,
                                status: getStatus(p.stock, p.minStock || 0),
                                lowStockThreshold: p.minStock || 0,
                                description: p.description,
                                weightedCost: specs.weightedCost || 0,
                                useWeightedCost: specs.useWeightedCost || false,
                                sku: p.sku
                            }
                        })
                        set({ products: mappedProducts, isLoading: false })
                    } else {
                        set({ error: result.error as string, isLoading: false })
                    }
                } catch (error) {
                    set({ error: 'Failed to fetch products', isLoading: false })
                }
            },

            addProduct: async (productData) => {
                const tempId = `temp-${crypto.randomUUID()}`

                // Optimistic Update
                const newProduct: Product = {
                    id: tempId,
                    name: productData.name,
                    category: productData.category || "Uncategorized",
                    stock: Number(productData.stock) || 0,
                    costCup: Number(productData.costCup) || 0,
                    costUsd: Number(productData.costUsd) || 0,
                    saleCup: Number(productData.saleCup) || 0,
                    saleUsd: Number(productData.saleUsd) || 0,
                    status: getStatus(Number(productData.stock), Number(productData.lowStockThreshold) || 0),
                    lowStockThreshold: Number(productData.lowStockThreshold) || 0,
                    description: productData.description,
                    weightedCost: Number(productData.weightedCost) || 0,
                    useWeightedCost: Boolean(productData.useWeightedCost)
                }

                set((state) => ({
                    products: [...state.products, newProduct],
                    isLoading: false
                }))

                // If offline or network error, add to sync queue
                if (!useSyncStore.getState().isOnline) {
                    useSyncStore.getState().addToQueue({
                        type: 'CREATE_PRODUCT',
                        payload: productData
                    })
                    return true
                }

                try {
                    const result = await createProduct(productData)
                    if (result.success && result.data) {
                        const p = result.data as any
                        const specs = typeof p.specs === 'string' ? JSON.parse(p.specs) : (p.specs || {})

                        // Replace temp product with real one
                        set((state) => ({
                            products: state.products.map(prod => prod.id === tempId ? {
                                id: p.id,
                                name: p.name,
                                category: p.category,
                                stock: p.stock,
                                costCup: specs.costCup || 0,
                                costUsd: Number(p.costPrice) || 0,
                                saleCup: specs.saleCup || 0,
                                saleUsd: Number(p.price) || 0,
                                status: getStatus(p.stock, p.minStock || 0),
                                lowStockThreshold: p.minStock || 0,
                                description: p.description,
                                weightedCost: specs.weightedCost || 0,
                                useWeightedCost: specs.useWeightedCost || false,
                                sku: p.sku
                            } : prod)
                        }))
                        return true
                    } else {
                        // Server returned a validation/business logic error (e.g. missing name, duplicate SKU).
                        // Do NOT queue these for retry — the payload is invalid and will always fail.
                        // Revert the optimistic update instead.
                        console.error(`createProduct server error: ${result.error}`)
                        set((state) => ({
                            products: state.products.filter(prod => prod.id !== tempId)
                        }))
                        return false
                    }
                } catch (error) {
                    // Network/connection exception — queue for retry when back online
                    console.warn('createProduct network error, queuing for sync:', error)
                    useSyncStore.getState().addToQueue({
                        type: 'CREATE_PRODUCT',
                        payload: productData
                    })
                    return true
                }
            },

            updateProduct: async (id, productData) => {
                // Optimistic Update
                set((state) => ({
                    products: state.products.map((prod) => {
                        if (prod.id === id) {
                            return { ...prod, ...productData }
                        }
                        return prod
                    })
                }))

                if (!useSyncStore.getState().isOnline) {
                    useSyncStore.getState().addToQueue({
                        type: 'UPDATE_PRODUCT',
                        payload: { id, data: productData as any }
                    })
                    return true
                }

                set({ isLoading: true, error: null })
                try {
                    const result = await updateProduct(id, productData)
                    if (result.success && result.data) {
                        const p = result.data as any
                        const specs = typeof p.specs === 'string' ? JSON.parse(p.specs) : (p.specs || {})

                        set(state => ({
                            products: state.products.map(prod => prod.id === id ? {
                                id: p.id,
                                name: p.name,
                                category: p.category,
                                stock: p.stock,
                                costCup: specs.costCup || 0,
                                costUsd: Number(p.costPrice) || 0,
                                saleCup: specs.saleCup || 0,
                                saleUsd: Number(p.price) || 0,
                                status: getStatus(p.stock, p.minStock || 0),
                                lowStockThreshold: p.minStock || 0,
                                description: p.description,
                                weightedCost: specs.weightedCost || 0,
                                useWeightedCost: specs.useWeightedCost || false,
                                sku: p.sku
                            } : prod),
                            isLoading: false
                        }))
                        return true
                    } else {
                        // Server returned a business logic error (validation, duplicate name, etc)
                        // Revert the optimistic update and show the error
                        const errorMsg = result.error || 'Error al actualizar el producto'
                        set(state => ({
                            error: errorMsg,
                            isLoading: false,
                            products: state.products.map(prod => prod.id === id
                                ? { ...prod, ...productData } // keep optimistic for now — will revert on explicit false
                                : prod
                            )
                        }))
                        return false
                    }
                } catch (error) {
                    // Network error — queue for retry
                    set({ isLoading: false })
                    useSyncStore.getState().addToQueue({
                        type: 'UPDATE_PRODUCT',
                        payload: { id, data: productData }
                    })
                    return true
                }
            },

            deleteProduct: async (id) => {
                // Save the product before optimistic delete in case we need to revert
                const productToDelete = get().products.find(p => p.id === id)

                // Optimistic delete
                set(state => ({ products: state.products.filter(p => p.id !== id) }))

                if (!useSyncStore.getState().isOnline) {
                    useSyncStore.getState().addToQueue({
                        type: 'DELETE_PRODUCT',
                        payload: { id }
                    })
                    return { success: true }
                }

                try {
                    const result = await deleteProduct(id)
                    if (result.success) {
                        return { success: true }
                    } else {
                        // Business logic error (e.g. foreign key constraint) — revert optimistic delete
                        if (productToDelete) {
                            set(state => ({ products: [...state.products, productToDelete] }))
                        }
                        return { success: false, error: result.error || 'No se pudo eliminar el producto' }
                    }
                } catch (error) {
                    // Network error — queue for retry, keep optimistic delete
                    useSyncStore.getState().addToQueue({
                        type: 'DELETE_PRODUCT',
                        payload: { id }
                    })
                    return { success: true }
                }
            },

            clearProducts: () => set({ products: [] }),

            addCategory: (category) => set((state) => ({ categories: [...state.categories, category] })),
            removeCategory: (category) => set((state) => ({ categories: state.categories.filter((c) => c !== category) })),
            generateTestData: async () => {
                const testProducts = [
                    { name: "Panel Solar 450W", category: "Paneles", stock: 150, costCup: 5000, costUsd: 180, saleCup: 7500, saleUsd: 250, status: "in_stock", lowStockThreshold: 10, description: "Panel monocristalino de alta eficiencia" },
                    { name: "Inversor Híbrido 5kW", category: "Inversores", stock: 20, costCup: 25000, costUsd: 800, saleCup: 45000, saleUsd: 1200, status: "in_stock", lowStockThreshold: 5, description: "Inversor de onda pura con cargador MPPT" },
                    { name: "Batería LiFePO4 48V 100Ah", category: "Baterías", stock: 5, costCup: 35000, costUsd: 1100, saleCup: 60000, saleUsd: 1600, status: "low_stock", lowStockThreshold: 10, description: "Batería de litio de ciclo profundo" },
                    { name: "Cable Solar 6mm", category: "Cableado", stock: 500, costCup: 50, costUsd: 1.5, saleCup: 100, saleUsd: 3, status: "in_stock", lowStockThreshold: 100, description: "Cable PV resistente UV" },
                    { name: "Conector MC4 Par", category: "Conectores", stock: 0, costCup: 150, costUsd: 2, saleCup: 500, saleUsd: 5, status: "out_of_stock", lowStockThreshold: 50, description: "Par de conectores macho/hembra" }
                ]

                set({ isLoading: true })
                // Process sequentially to be safe
                for (const p of testProducts) {
                    await get().addProduct(p)
                }
                set({ isLoading: false })
            }
        }),
        {
            name: 'inventory-storage',
            storage: createJSONStorage(() => idbStorage),
        }
    )
)
