"use server"

import { prisma as db } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getBudgetQuestions() {
    try {
        const questions = await db.budgetQuestion.findMany({
            include: {
                options: {
                    include: {
                        impacts: {
                            include: {
                                product: true
                            }
                        }
                    },
                    orderBy: {
                        order: 'asc'
                    }
                }
            },
            orderBy: {
                order: 'asc'
            }
        })
        return questions
    } catch (error) {
        console.error("Error fetching budget questions:", error)
        return []
    }
}

export async function createBudgetQuestion(data: { text: string, type: string, order: number }) {
    try {
        const question = await db.budgetQuestion.create({
            data
        })
        revalidatePath("/admin/settings")
        return { success: true, data: question }
    } catch (error) {
        console.error("Error creating budget question:", error)
        return { success: false, error: "Failed to create question" }
    }
}

export async function updateBudgetQuestion(id: string, data: { text?: string, type?: string, order?: number }) {
    try {
        const question = await db.budgetQuestion.update({
            where: { id },
            data
        })
        revalidatePath("/admin/settings")
        return { success: true, data: question }
    } catch (error) {
        console.error("Error updating budget question:", error)
        return { success: false, error: "Failed to update question" }
    }
}

export async function deleteBudgetQuestion(id: string) {
    try {
        await db.budgetQuestion.delete({
            where: { id }
        })
        revalidatePath("/admin/settings")
        return { success: true }
    } catch (error) {
        console.error("Error deleting budget question:", error)
        return { success: false, error: "Failed to delete question" }
    }
}

export async function createBudgetOption(data: { questionId: string, label: string, value: string, order: number }) {
    try {
        const option = await db.budgetQuestionOption.create({
            data
        })
        revalidatePath("/admin/settings")
        return { success: true, data: option }
    } catch (error) {
        console.error("Error creating budget option:", error)
        return { success: false, error: "Failed to create option" }
    }
}

export async function updateBudgetOption(id: string, data: { label?: string, value?: string, order?: number }) {
    try {
        const option = await db.budgetQuestionOption.update({
            where: { id },
            data
        })
        revalidatePath("/admin/settings")
        return { success: true, data: option }
    } catch (error) {
        console.error("Error updating budget option:", error)
        return { success: false, error: "Failed to update option" }
    }
}

export async function deleteBudgetOption(id: string) {
    try {
        await db.budgetQuestionOption.delete({
            where: { id }
        })
        revalidatePath("/admin/settings")
        return { success: true }
    } catch (error) {
        console.error("Error deleting budget option:", error)
        return { success: false, error: "Failed to delete option" }
    }
}

export async function addImpactToOption(data: { optionId: string, productId: string, quantity: number }) {
    try {
        const impact = await db.budgetQuestionImpact.create({
            data
        })
        revalidatePath("/admin/settings")
        return { success: true, data: impact }
    } catch (error) {
        console.error("Error adding impact:", error)
        return { success: false, error: "Failed to add impact" }
    }
}

export async function removeImpact(id: string) {
    try {
        await db.budgetQuestionImpact.delete({
            where: { id }
        })
        revalidatePath("/admin/settings")
        return { success: true }
    } catch (error) {
        console.error("Error removing impact:", error)
        return { success: false, error: "Failed to remove impact" }
    }
}
