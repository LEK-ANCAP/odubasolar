"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import fs from 'fs';
import path from 'path';

const DEBUG_LOG = path.join(process.cwd(), 'debug_server_action.log');

export async function getProducts() {
    try {
        const products = await prisma.product.findMany({
            orderBy: { name: 'asc' }
        })
        const safeProducts = products.map((p) => ({
            ...p,
            price: Number(p.price),
            costPrice: Number(p.costPrice),
        }))
        return { success: true, data: safeProducts }
    } catch (error) {
        console.error("Error fetching products:", error)
        return { success: false, error: "Failed to fetch products" }
    }
}

export async function createProduct(data: any) {
    try {
        const logEntry = `[${new Date().toISOString()}] createProduct called with: ${JSON.stringify(data)}\n`;
        try {
            fs.appendFileSync(DEBUG_LOG, logEntry);
        } catch (logErr) {
            console.error("Failed to write to log file", logErr);
        }

        console.log("createProduct received data:", JSON.stringify(data, null, 2));

        // Validate required fields
        if (!data.name) {
            return { success: false, error: "El nombre del producto es obligatorio" };
        }

        // Check for duplicate name (case-insensitive)
        const allProducts = await prisma.product.findMany({ select: { name: true } });
        const nameTaken = allProducts.some(p => p.name.toLowerCase() === data.name.toLowerCase());
        if (nameTaken) {
            return { success: false, error: `Ya existe un producto con el nombre "${data.name}"` };
        }

        const product = await prisma.product.create({
            data: {
                name: data.name,
                description: data.description || "",
                sku: data.sku || null,
                category: data.category || "Uncategorized",
                stock: Number(data.stock) || 0,
                // minStock: Number(data.lowStockThreshold) || 0, // Removed due to type mismatch
                costPrice: Number(data.costUsd) || 0,
                price: Number(data.saleUsd) || 0,
                specs: JSON.stringify({
                    costCup: Number(data.costCup) || 0,
                    saleCup: Number(data.saleCup) || 0,
                    weightedCost: Number(data.weightedCost) || 0,
                    useWeightedCost: Boolean(data.useWeightedCost),
                    status: data.status
                })
            }
        })

        console.log("Product created successfully:", product.id);

        revalidatePath("/inventory")
        return {
            success: true,
            data: {
                ...product,
                price: Number(product.price),
                costPrice: Number(product.costPrice),
            },
        }
    } catch (error) {
        console.error("Error creating product:", error);

        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const errorStack = error instanceof Error ? error.stack : "";

        try {
            fs.appendFileSync(DEBUG_LOG, `[${new Date().toISOString()}] Catch Error: ${errorMessage}\nStack: ${errorStack}\n`);
        } catch (logErr) {
            console.error("Failed to write to log file", logErr);
        }

        // Handle unique constraint violation for SKU
        if ((error as any).code === 'P2002' && (error as any).meta?.target?.includes('sku')) {
            return { success: false, error: "A product with this SKU already exists." }
        }

        // Return full error detail for debugging
        return {
            success: false,
            error: `Failed to create product: ${errorMessage}`
        }
    }
}

export async function updateProduct(id: string, data: any) {
    try {
        const updateData: any = {}
        if (data.name) updateData.name = data.name
        if (data.category) updateData.category = data.category
        if (data.stock !== undefined) updateData.stock = data.stock
        if (data.lowStockThreshold !== undefined) updateData.minStock = data.lowStockThreshold
        if (data.costUsd !== undefined) updateData.costPrice = data.costUsd
        if (data.saleUsd !== undefined) updateData.price = data.saleUsd

        // Check for duplicate name (case-insensitive), excluding the current product
        if (data.name) {
            const allProducts = await prisma.product.findMany({ select: { id: true, name: true } });
            const nameTaken = allProducts.some(p => p.id !== id && p.name.toLowerCase() === data.name.toLowerCase());
            if (nameTaken) {
                return { success: false, error: `Ya existe un producto con el nombre "${data.name}"` };
            }
        }

        // Read existing specs and merge with new values
        const existing = await prisma.product.findUnique({ where: { id }, select: { specs: true } })
        const existingSpecs = existing?.specs ? JSON.parse(existing.specs as string) : {}
        const newSpecs = {
            ...existingSpecs,
            ...(data.costCup !== undefined && { costCup: Number(data.costCup) }),
            ...(data.saleCup !== undefined && { saleCup: Number(data.saleCup) }),
            ...(data.weightedCost !== undefined && { weightedCost: Number(data.weightedCost) }),
            ...(data.useWeightedCost !== undefined && { useWeightedCost: Boolean(data.useWeightedCost) }),
        }
        updateData.specs = JSON.stringify(newSpecs)

        const product = await prisma.product.update({
            where: { id },
            data: updateData
        })
        revalidatePath("/inventory")
        return {
            success: true,
            data: {
                ...product,
                price: Number(product.price),
                costPrice: Number(product.costPrice),
            },
        }
    } catch (error) {
        console.error("Error updating product:", error)
        return { success: false, error: "Failed to update product" }
    }
}

export async function deleteProduct(id: string) {
    try {
        await prisma.$transaction(async (tx) => {
            // Delete related records that reference this product (no cascade in schema)
            await tx.purchaseOrderItem.deleteMany({ where: { productId: id } })
            await tx.kitComponent.deleteMany({ where: { productId: id } })
            await tx.kitVariation.deleteMany({ where: { productId: id } })

            // For optional relations (OrderItem, BudgetItem), set productId to null
            await tx.orderItem.updateMany({
                where: { productId: id },
                data: { productId: null }
            })
            await tx.budgetItem.updateMany({
                where: { productId: id },
                data: { productId: null }
            })

            // Now delete the product itself
            await tx.product.delete({ where: { id } })
        })
        revalidatePath("/inventory")
        return { success: true }
    } catch (error: any) {
        // P2025 = record not found — product was already deleted, treat as success
        if (error?.code === 'P2025') {
            revalidatePath("/inventory")
            return { success: true }
        }
        console.error("Error deleting product:", error)
        return { success: false, error: "No se pudo eliminar el producto" }
    }
}


export async function getProductHistory(productId: string) {
    try {
        // 1. Get Purchase Orders (Ingress) - Approved/Received
        const purchases = await prisma.purchaseOrderItem.findMany({
            where: {
                productId: productId,
                purchaseOrder: {
                    status: 'RECEIVED'
                }
            },
            include: {
                purchaseOrder: {
                    include: { provider: true }
                }
            },
            orderBy: {
                purchaseOrder: { date: 'desc' }
            }
        })

        // 2. Get Sales Orders (Egress) - Valid orders
        const sales = await prisma.orderItem.findMany({
            where: {
                productId: productId,
                order: {
                    status: { notIn: ['CANCELLED', 'LEAD'] }
                }
            },
            include: {
                order: {
                    include: { user: true }
                }
            },
            orderBy: {
                order: { createdAt: 'desc' }
            }
        })

        // 3. Combine and Format
        const movements: any[] = [
            ...purchases.map(p => ({
                id: `po-${p.id}`,
                date: p.purchaseOrder.date,
                type: 'Compra',
                concept: `Orden de Compra #${p.purchaseOrder.id ? p.purchaseOrder.id.slice(-4) : '???'} - ${p.purchaseOrder.provider?.name || 'Proveedor'}`,
                quantity: p.quantity,
                unitCost: Number(p.unitCost), // Added unitCost
                balance: 0,
            })),
            ...sales.map(s => ({
                id: `so-${s.id}`,
                date: s.order.createdAt,
                type: 'Venta',
                concept: `Pedido #${s.order.id ? s.order.id.slice(-4) : '???'} - ${s.order.user?.name || s.order.guestEmail || 'Cliente'}`,
                quantity: -s.quantity,
                price: Number(s.price), // Added price
                balance: 0,
            }))
        ].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

        // 4. Calculate Running Balance
        const product = await prisma.product.findUnique({
            where: { id: productId },
            select: { stock: true }
        })

        if (!product) {
            return { success: false, error: "Product not found" }
        }

        let currentBalance = product.stock

        const movementsWithBalance = movements.map(m => {
            const balance = currentBalance
            currentBalance -= m.quantity
            return { ...m, balance }
        })


        return { success: true, data: movementsWithBalance }

    } catch (error) {
        console.error("Error fetching product history:", error)
        return { success: false, error: "Failed to fetch product history" }
    }
}

/**
 * Calculates the weighted average cost (USD) for a product
 * from all RECEIVED purchase orders.
 * Formula: sum(quantity * unitCost) / sum(quantity)
 */
export async function getWeightedCost(productId: string): Promise<{ success: boolean; weightedCost?: number; totalUnits?: number; error?: string }> {
    try {
        const items = await prisma.purchaseOrderItem.findMany({
            where: {
                productId,
                purchaseOrder: { status: 'RECEIVED' }
            },
            select: { quantity: true, unitCost: true }
        })

        if (items.length === 0) {
            return { success: true, weightedCost: 0, totalUnits: 0 }
        }

        let totalUnits = 0
        let totalCost = 0
        for (const item of items) {
            const qty = item.quantity
            const cost = Number(item.unitCost)
            totalUnits += qty
            totalCost += qty * cost
        }

        const weightedCost = totalUnits > 0 ? totalCost / totalUnits : 0
        return { success: true, weightedCost, totalUnits }
    } catch (error) {
        console.error("Error calculating weighted cost:", error)
        return { success: false, error: "Error al calcular el coste ponderado" }
    }
}

export async function getNextSku() {
    try {
        // Find the product with the highest SKU
        // We act optimistically and look for strings that might look like numbers or contain numbers
        const lastProduct = await prisma.product.findFirst({
            where: {
                sku: { not: null }
            },
            orderBy: {
                createdAt: 'desc' // Or maybe by SKU if they were always sequential, but createdAt is safer for "latest added"
            }
        })

        if (!lastProduct || !lastProduct.sku) {
            return { success: true, sku: "00001" }
        }

        // Extract numbers from the SKU
        const currentSku = lastProduct.sku
        const match = currentSku.match(/(\d+)$/)

        if (match) {
            const numberPart = match[1]
            const prefix = currentSku.substring(0, match.index)
            const nextNumber = parseInt(numberPart, 10) + 1
            // Ensure at least 5 digits, or match existing length if longer
            const padLength = Math.max(numberPart.length, 5)
            const nextSku = `${prefix}${nextNumber.toString().padStart(padLength, '0')}`
            return { success: true, sku: nextSku }
        }

        // Fallback if no numbers found, just append -001? Or better, just return a default
        return { success: true, sku: `${currentSku}-01` } // Simple fallback

    } catch (error) {
        console.error("Error generating next SKU:", error)
        return { success: false, error: "Failed to generate SKU" }
    }
}
