"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getBudgets() {
    try {
        const budgets = await prisma.budget.findMany({
            include: {
                client: true,
                items: {
                    include: {
                        product: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        // Serialize decimals
        const safeBudgets = budgets.map(budget => ({
            ...budget,
            totalAmount: Number(budget.totalAmount),
            discountValue: budget.discountValue ? Number(budget.discountValue) : undefined,
            items: budget.items.map(item => ({
                ...item,
                unitPrice: Number(item.unitPrice),
                subtotal: Number(item.subtotal),
                product: item.product ? {
                    ...item.product,
                    price: Number(item.product.price),
                    costPrice: Number(item.product.costPrice)
                } : null
            })),
            displayId: `PRE-${new Date(budget.createdAt).getFullYear()}-${String(budget.number || 0).padStart(4, '0')}`
        }))

        return { success: true, data: safeBudgets }
    } catch (error) {
        console.error("Error fetching budgets:", error)
        return { success: false, error: "Failed to fetch budgets" }
    }
}

export async function createBudget(data: any) {
    try {
        const { items: rawItems, date, ...rest } = data
        const items = rawItems || []

        // Calculate totals
        const subtotal = items.reduce((sum: number, item: any) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0)

        // Calculate discount
        let discountAmount = 0
        if (rest.discountType === 'PERCENTAGE' && rest.discountValue) {
            discountAmount = subtotal * (Number(rest.discountValue) / 100)
        } else if (rest.discountType === 'FIXED' && rest.discountValue) {
            discountAmount = Number(rest.discountValue)
        } else if (rest.discountType === 'TARGET_PRICE' && rest.discountValue) {
            discountAmount = Math.max(0, subtotal - Number(rest.discountValue))
        }

        const totalAmount = Math.max(0, subtotal - discountAmount)

        // Generate sequential number
        const lastBudget = await prisma.budget.findFirst({
            orderBy: { number: 'desc' }
        })
        const nextNumber = (lastBudget?.number || 0) + 1

        // Handle clientId FK constraint
        // If clientId is a demo ID (e.g. starts with 'cust-' or is 'temp-'), set it to null
        // Real CUIDs are approx 25 chars, alphanumeric.
        // Or simply: check if it exists? That's expensive.
        // Better: catch the FK error and retry without clientId?
        // Simplest heuristic: If it's short or has dashes (cuid has no dashes usually, uuid does), check format.
        // Actually, let's just set it to null if it looks suspicious or try to find it.
        // For safety/speed: if it starts with 'temp' or 'cust', NULL it.
        // But better is to just try. If it fails, fallback.

        let budget;
        try {
            budget = await prisma.budget.create({
                data: {
                    ...rest,
                    name: rest.name, // Add name
                    number: nextNumber, // Assign sequential number
                    createdAt: date ? new Date(date) : undefined,
                    clientId: (rest.clientId && !rest.clientId.startsWith('cust-') && !rest.clientId.startsWith('temp-')) ? rest.clientId : null,
                    totalAmount,
                    items: {
                        create: items.map((item: any) => ({
                            productId: item.productId,
                            name: item.name,
                            quantity: Number(item.quantity),
                            unitPrice: Number(item.unitPrice),
                            subtotal: Number(item.quantity) * Number(item.unitPrice),
                            configuration: item.configuration // Store kit config if any
                        }))
                    }
                },
                include: {
                    items: true
                }
            })
        } catch (err: any) {
            // If FK constraint failed, retry without clientId
            if (err.code === 'P2003') {
                budget = await prisma.budget.create({
                    data: {
                        ...rest,
                        name: rest.name, // Add name
                        number: nextNumber,
                        createdAt: date ? new Date(date) : undefined,
                        clientId: null, // Clear invalid client ID
                        totalAmount,
                        items: {
                            create: items.map((item: any) => ({
                                productId: item.productId,
                                name: item.name,
                                quantity: Number(item.quantity),
                                unitPrice: Number(item.unitPrice),
                                subtotal: Number(item.quantity) * Number(item.unitPrice),
                                configuration: item.configuration
                            }))
                        }
                    },
                    include: {
                        items: true
                    }
                })
            } else {
                throw err;
            }
        }

        revalidatePath("/budgets")
        return { success: true, data: budget }
    } catch (error) {
        console.error("Error creating budget:", error)
        return { success: false, error: "Failed to create budget" }
    }
}

export async function updateBudget(id: string, data: any) {
    try {
        const { items: rawItems, date, ...rest } = data
        const items = rawItems || []

        // Calculate totals
        const subtotal = items.reduce((sum: number, item: any) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0)

        let discountAmount = 0
        if (rest.discountType === 'PERCENTAGE' && rest.discountValue) {
            discountAmount = subtotal * (Number(rest.discountValue) / 100)
        } else if (rest.discountType === 'FIXED' && rest.discountValue) {
            discountAmount = Number(rest.discountValue)
        } else if (rest.discountType === 'TARGET_PRICE' && rest.discountValue) {
            discountAmount = Math.max(0, subtotal - Number(rest.discountValue))
        }

        const totalAmount = Math.max(0, subtotal - discountAmount)

        const budget = await prisma.$transaction(async (tx) => {
            await tx.budgetItem.deleteMany({
                where: { budgetId: id }
            })

            return await tx.budget.update({
                where: { id },
                data: {
                    ...rest, // Spread remaining properties from 'rest'
                    name: rest.name, // Add name
                    clientId: (rest.clientId && !rest.clientId.startsWith('cust-') && !rest.clientId.startsWith('temp-')) ? rest.clientId : null,
                    createdAt: date ? new Date(date) : undefined,
                    totalAmount,
                    items: {
                        create: items.map((item: any) => ({
                            productId: item.productId,
                            name: item.name,
                            quantity: Number(item.quantity),
                            unitPrice: Number(item.unitPrice),
                            subtotal: Number(item.quantity) * Number(item.unitPrice),
                            configuration: item.configuration
                        }))
                    }
                },
                include: {
                    items: true
                }
            })
        })

        revalidatePath("/budgets")
        revalidatePath(`/budgets/${id}`)
        return { success: true, data: budget }
    } catch (error) {
        console.error("Error updating budget:", error)
        return { success: false, error: "Failed to update budget" }
    }
}

export async function deleteBudget(id: string) {
    try {
        await prisma.budget.delete({
            where: { id }
        })
        revalidatePath("/budgets")
        return { success: true }
    } catch (error) {
        console.error("Error deleting budget:", error)
        return { success: false, error: "Failed to delete budget" }
    }
}

export async function getBudgetsByClient(clientId: string) {
    try {
        const budgets = await prisma.budget.findMany({
            where: {
                clientId: clientId
            },
            include: {
                items: {
                    include: {
                        product: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        const safeBudgets = budgets.map(budget => ({
            ...budget,
            totalAmount: Number(budget.totalAmount),
            discountValue: budget.discountValue ? Number(budget.discountValue) : undefined,
            items: budget.items.map(item => ({
                ...item,
                unitPrice: Number(item.unitPrice),
                subtotal: Number(item.subtotal),
                product: item.product ? {
                    ...item.product,
                    price: Number(item.product.price),
                    costPrice: Number(item.product.costPrice)
                } : null
            })),
            displayId: `PRE-${new Date(budget.createdAt).getFullYear()}-${String(budget.number || 0).padStart(4, '0')}`
        }))

        return { success: true, data: safeBudgets }
    } catch (error) {
        console.error("Error fetching client budgets:", error)
        return { success: false, error: "Failed to fetch client budgets" }
    }
}

export async function updateBudgetStatus(id: string, status: string) {
    try {
        const budget = await prisma.budget.update({
            where: { id },
            data: { status }
        })
        revalidatePath("/budgets")
        revalidatePath(`/budgets/${id}`)
        return { success: true, data: budget }
    } catch (error) {
        console.error("Error updating budget status:", error)
        return { success: false, error: "Failed to update budget status" }
    }
}
