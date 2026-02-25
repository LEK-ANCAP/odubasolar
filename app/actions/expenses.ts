"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"

// Get all expense templates
export async function getExpenseTemplates() {
    try {
        const templates = await prisma.expenseTemplate.findMany({
            include: {
                account: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        })
        const safeTemplates = templates.map(t => ({
            ...t,
            amount: Number(t.amount)
        }))
        return { success: true, data: safeTemplates }
    } catch (error) {
        console.error("Error fetching expense templates:", error)
        return { success: false, error: "Failed to fetch expense templates" }
    }
}

// Create a new expense template
export async function createExpenseTemplate(data: {
    name: string
    description?: string
    amount: number
    accountId: string
    category: string
}) {
    try {
        const template = await prisma.expenseTemplate.create({
            data: {
                name: data.name,
                description: data.description,
                amount: data.amount,
                accountId: data.accountId,
                category: data.category
            }
        })
        revalidatePath("/expenses")
        return { success: true, data: template }
    } catch (error) {
        console.error("Error creating expense template:", error)
        return { success: false, error: "Failed to create expense template" }
    }
}

// Update an existing expense template
export async function updateExpenseTemplate(id: string, data: {
    name: string
    description?: string
    amount: number
    accountId: string
    category: string
}) {
    try {
        const template = await prisma.expenseTemplate.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description,
                amount: data.amount,
                accountId: data.accountId,
                category: data.category
            }
        })
        revalidatePath("/expenses")
        revalidatePath("/expenses")
        return {
            success: true,
            data: {
                ...template,
                amount: Number(template.amount)
            }
        }
    } catch (error) {
        console.error("Error updating expense template:", error)
        return { success: false, error: "Failed to update expense template" }
    }
}

// Delete an expense template
export async function deleteExpenseTemplate(id: string) {
    try {
        await prisma.expenseTemplate.delete({
            where: { id }
        })
        revalidatePath("/expenses")
        return { success: true }
    } catch (error) {
        console.error("Error deleting expense template:", error)
        return { success: false, error: "Failed to delete expense template" }
    }
}

// Register an expense from a template (Create AccountMovement)
export async function registerExpense(templateId: string, overrides?: {
    amount?: number
    date?: Date
    description?: string
}) {
    try {
        const template = await prisma.expenseTemplate.findUnique({
            where: { id: templateId }
        })

        if (!template) {
            return { success: false, error: "Template not found" }
        }

        const amount = overrides?.amount ?? Number(template.amount)
        const date = overrides?.date ?? new Date()
        const description = overrides?.description ?? template.name

        // Check account existence
        const account = await prisma.financialAccount.findUnique({
            where: { id: template.accountId }
        })

        if (!account) {
            return { success: false, error: "Account not found" }
        }

        // Create AccountMovement (Expense)
        // Note: Expenses are negative logic in balance but movement amount is strictly amount?
        // Let's check AccountMovement model logic.
        // Usually movements are stored with positive amount and 'type' determines sign, or signed amount?
        // Looking at schema: amount Decimal // Positive for Income, Negative for Expense

        const movementAmount = -Math.abs(amount) // Ensure it is negative

        const movement = await prisma.accountMovement.create({
            data: {
                accountId: template.accountId,
                amount: movementAmount,
                description: description,
                date: date,
                type: "EXPENSE"
            }
        })

        // Update Account Balance
        await prisma.financialAccount.update({
            where: { id: template.accountId },
            data: {
                balance: {
                    increment: movementAmount
                }
            }
        })

        revalidatePath("/expenses")
        revalidatePath("/accounts")
        revalidatePath("/expenses")
        revalidatePath("/accounts")
        return {
            success: true,
            data: {
                ...movement,
                amount: Number(movement.amount)
            }
        }

    } catch (error) {
        console.error("Error registering expense:", error)
        return { success: false, error: "Failed to register expense" }
    }
}
