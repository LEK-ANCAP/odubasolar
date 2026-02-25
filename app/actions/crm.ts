'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// Schema definitions for validation
const dealSchema = z.object({
    title: z.string().min(1, "Title is required"),
    value: z.number().min(0),
    currency: z.string().default("USD"),
    stage: z.string().default("PROSPECT"),
    notes: z.string().optional(),
    contactName: z.string().optional(),
    contactEmail: z.string().email().optional().or(z.literal("")),
    contactPhone: z.string().optional(),
    companyName: z.string().optional(),
    source: z.string().optional(),
    expectedCloseDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
    userId: z.string().optional(),
})

export type Deal = {
    id: string
    title: string
    value: number
    currency: string
    stage: string
    notes?: string | null
    contactName?: string | null
    contactEmail?: string | null
    contactPhone?: string | null
    companyName?: string | null
    source?: string | null
    expectedCloseDate?: Date | null
    createdAt: Date
    updatedAt: Date
    userId?: string | null
    user?: {
        name: string | null
        email: string | null
        image: string | null
    } | null
}

export async function getDeals() {
    try {
        const deals = await prisma.deal.findMany({
            where: {
                archived: false
            },
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        image: true
                    }
                }
            }
        })

        // Sort logic can be improved, or handled on client for drag-drop
        return { success: true, data: deals }
    } catch (error) {
        console.error("Error fetching deals:", error)
        return { success: false, error: "Failed to fetch deals" }
    }
}

export async function createDeal(data: z.infer<typeof dealSchema>) {
    try {
        const validated = dealSchema.parse(data)

        const deal = await prisma.deal.create({
            data: {
                ...validated,
                value: validated.value, // Ensure decimal handling if needed, but Prisma handles number -> Decimal
            }
        })

        revalidatePath("/crm")
        return { success: true, data: deal }
    } catch (error) {
        console.error("Error creating deal:", error)
        return { success: false, error: "Failed to create deal" }
    }
}

export async function updateDealStage(id: string, stage: string) {
    try {
        const deal = await prisma.deal.update({
            where: { id },
            data: { stage }
        })

        revalidatePath("/crm")
        return { success: true, data: deal }
    } catch (error) {
        console.error("Error updating deal stage:", error)
        return { success: false, error: "Failed to update deal stage" }
    }
}

export async function updateDeal(id: string, data: Partial<z.infer<typeof dealSchema>>) {
    try {
        // We might need a partial schema for updates, or just use the full one loosely
        // For now, let's just pass the data directly as it comes from a controlled form

        const deal = await prisma.deal.update({
            where: { id },
            data: {
                ...data,
            }
        })

        revalidatePath("/crm")
        return { success: true, data: deal }
    } catch (error) {
        console.error("Error updating deal:", error)
        return { success: false, error: "Failed to update deal" }
    }
}

export async function deleteDeal(id: string) {
    try {
        await prisma.deal.update({
            where: { id },
            data: { archived: true } // Soft delete
        })

        revalidatePath("/crm")
        return { success: true }
    } catch (error) {
        console.error("Error deleting deal:", error)
        return { success: false, error: "Failed to delete deal" }
    }
}
