"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getPurchaseOrders() {
    try {
        const orders = await prisma.purchaseOrder.findMany({
            include: {
                provider: true,
                items: {
                    include: {
                        product: true
                    }
                }
            },
            orderBy: { date: 'desc' }
        })
        const safeOrders = orders.map(order => ({
            ...order,
            totalAmount: Number(order.totalAmount),
            items: order.items.map(item => ({
                ...item,
                unitCost: Number(item.unitCost),
                product: {
                    ...item.product,
                    price: Number(item.product.price),
                    costPrice: Number(item.product.costPrice)
                }
            }))
        }))
        return { success: true, data: safeOrders }
    } catch (error) {
        console.error("Error fetching purchase orders:", error)
        return { success: false, error: "Failed to fetch purchase orders" }
    }
}

export async function createPurchaseOrder(data: {
    providerId: string
    date: Date
    status?: string
    items: {
        productId: string
        quantity: number
        unitCost: number
    }[]
    notes?: string
    paymentStatus?: string
    paymentAccountId?: string
    paymentDate?: Date
}) {
    try {
        // Calculate total amount
        const totalAmount = data.items.reduce((sum, item) => {
            return sum + (item.quantity * item.unitCost)
        }, 0)

        const isReceived = (data.status || "DRAFT").toUpperCase() === "RECEIVED"

        const order = await prisma.$transaction(async (tx) => {
            const created = await tx.purchaseOrder.create({
                data: {
                    providerId: data.providerId,
                    date: data.date,
                    status: data.status || "DRAFT",
                    totalAmount: totalAmount,
                    notes: data.notes,
                    paymentStatus: data.paymentStatus || 'UNPAID',
                    paymentAccountId: data.paymentAccountId,
                    paymentDate: data.paymentDate,
                    items: {
                        create: data.items.map(item => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            unitCost: item.unitCost
                        }))
                    }
                },
                include: {
                    provider: true,
                    items: {
                        include: {
                            product: true
                        }
                    }
                }
            })

            // If creating directly as RECEIVED, update stock + weighted cost
            if (isReceived) {
                for (const item of data.items) {
                    const product = await tx.product.findUnique({
                        where: { id: item.productId },
                        select: { stock: true, specs: true }
                    })
                    const specs = product?.specs ? JSON.parse(product.specs as string) : {}
                    const useWeighted = specs.useWeightedCost ?? true

                    const productUpdateData: any = { stock: { increment: item.quantity } }

                    if (useWeighted) {
                        // Running weighted average: resets naturally when stock was 0
                        const currentStock = product?.stock ?? 0
                        const currentWC = specs.weightedCost ?? 0
                        const newWC = currentStock === 0
                            ? item.unitCost
                            : (currentStock * currentWC + item.quantity * item.unitCost) / (currentStock + item.quantity)

                        specs.weightedCost = newWC
                        productUpdateData.costPrice = newWC
                        productUpdateData.specs = JSON.stringify(specs)
                    }

                    await tx.product.update({
                        where: { id: item.productId },
                        data: productUpdateData
                    })
                }
            }

            return created
        })

        revalidatePath("/orders")
        revalidatePath("/inventory")
        return {
            success: true,
            data: {
                ...order,
                totalAmount: Number(order.totalAmount),
                items: order.items.map(item => ({
                    ...item,
                    unitCost: Number(item.unitCost),
                    product: {
                        ...item.product,
                        price: Number(item.product.price),
                        costPrice: Number(item.product.costPrice)
                    }
                }))
            }
        }
    } catch (error) {
        console.error("Error creating purchase order:", error)
        return { success: false, error: "Failed to create purchase order" }
    }
}

export async function updatePurchaseOrder(id: string, data: {
    providerId?: string
    date?: Date
    status?: string
    items?: {
        productId: string
        quantity: number
        unitCost: number
    }[]
    notes?: string
    paymentStatus?: string
    paymentAccountId?: string
    paymentDate?: Date
}) {
    try {
        //If items are updated, recalculate total
        let totalAmount = undefined
        if (data.items) {
            totalAmount = data.items.reduce((sum, item) => {
                return sum + (item.quantity * item.unitCost)
            }, 0)
        }

        // Transaction to handle item updates (delete all and recreate is simplest for now)
        // In a real optimized app we would diff them, but for now this ensures consistency
        const order = await prisma.$transaction(async (tx) => {
            // Updated basic fields
            const updated = await tx.purchaseOrder.update({
                where: { id },
                data: {
                    providerId: data.providerId,
                    date: data.date,
                    status: data.status,
                    notes: data.notes,
                    totalAmount: totalAmount,
                    ...(data.paymentStatus !== undefined && { paymentStatus: data.paymentStatus }),
                    ...(data.paymentAccountId !== undefined && { paymentAccountId: data.paymentAccountId }),
                    ...(data.paymentDate !== undefined && { paymentDate: data.paymentDate }),
                }
            })

            if (data.items) {
                // Delete existing items
                await tx.purchaseOrderItem.deleteMany({
                    where: { purchaseOrderId: id }
                })

                // Create new items
                await tx.purchaseOrderItem.createMany({
                    data: data.items.map(item => ({
                        purchaseOrderId: id,
                        productId: item.productId,
                        quantity: item.quantity,
                        unitCost: item.unitCost
                    }))
                })
            }

            return updated
        })

        // Fetch full object to return
        const fullOrder = await prisma.purchaseOrder.findUnique({
            where: { id },
            include: {
                provider: true,
                items: {
                    include: { product: true }
                }
            }
        })

        revalidatePath("/orders")
        return {
            success: true,
            data: {
                ...fullOrder,
                totalAmount: Number(fullOrder?.totalAmount || 0),
                items: (fullOrder?.items || []).map(item => ({
                    ...item,
                    unitCost: Number(item.unitCost),
                    product: {
                        ...item.product,
                        price: Number(item.product.price),
                        costPrice: Number(item.product.costPrice)
                    }
                }))
            }
        }
    } catch (error) {
        console.error("Error updating purchase order:", error)
        return { success: false, error: "Failed to update purchase order" }
    }
}

export async function deletePurchaseOrder(id: string) {
    try {
        await prisma.purchaseOrder.delete({
            where: { id }
        })
        revalidatePath("/orders")
        return { success: true }
    } catch (error) {
        console.error("Error deleting purchase order:", error)
        return { success: false, error: "Failed to delete purchase order" }
    }
}

export async function deletePurchaseOrders(ids: string[]) {
    try {
        await prisma.purchaseOrder.deleteMany({
            where: {
                id: { in: ids }
            }
        })
        revalidatePath("/orders")
        return { success: true }
    } catch (error) {
        console.error("Error deleting purchase orders:", error)
        return { success: false, error: "Failed to delete purchase orders" }
    }
}

export async function receivePurchaseOrder(id: string) {
    try {
        await prisma.$transaction(async (tx) => {
            // 1. Get the order with items
            const order = await tx.purchaseOrder.findUnique({
                where: { id },
                include: { items: true }
            })

            if (!order) throw new Error("Order not found")
            if (order.status === 'RECEIVED') throw new Error("Order already received")

            // 2. Update stats
            await tx.purchaseOrder.update({
                where: { id },
                data: {
                    status: 'RECEIVED',
                    updatedAt: new Date()
                }
            })

            // 3. Update stock + weighted cost for each product
            for (const item of order.items) {
                const product = await tx.product.findUnique({
                    where: { id: item.productId },
                    select: { stock: true, specs: true }
                })
                const specs = product?.specs ? JSON.parse(product.specs as string) : {}
                const useWeighted = specs.useWeightedCost ?? true

                const productUpdateData: any = { stock: { increment: item.quantity } }

                if (useWeighted) {
                    // Running weighted average — resets naturally when stock was 0
                    const currentStock = product?.stock ?? 0
                    const currentWC = specs.weightedCost ?? 0
                    const newWC = currentStock === 0
                        ? Number(item.unitCost)
                        : (currentStock * currentWC + item.quantity * Number(item.unitCost)) / (currentStock + item.quantity)

                    specs.weightedCost = newWC
                    productUpdateData.costPrice = newWC
                    productUpdateData.specs = JSON.stringify(specs)
                }

                await tx.product.update({
                    where: { id: item.productId },
                    data: productUpdateData
                })
            }
        })

        revalidatePath("/orders")
        revalidatePath("/inventory")
        return { success: true }
    } catch (error) {
        console.error("Error receiving purchase order:", error)
        return { success: false, error: error instanceof Error ? error.message : "Failed to receive purchase order" }
    }
}
