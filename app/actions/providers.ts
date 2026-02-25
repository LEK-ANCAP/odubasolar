"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getProviders() {
    try {
        const providers = await prisma.provider.findMany({
            orderBy: { name: 'asc' }
        })
        return { success: true, data: providers }
    } catch (error) {
        console.error("Error fetching providers:", error)
        return { success: false, error: "Failed to fetch providers" }
    }
}

export async function createProvider(data: {
    name: string
    email?: string | null
    phone?: string | null
    address?: string | null
    isDefault?: boolean
}) {
    try {
        const provider = await prisma.provider.create({
            data
        })
        revalidatePath("/providers") // Assuming upcoming page
        revalidatePath("/orders")
        return { success: true, data: provider }
    } catch (error) {
        console.error("Error creating provider:", error)
        return { success: false, error: "Failed to create provider" }
    }
}

export async function updateProvider(id: string, data: {
    name?: string
    email?: string | null
    phone?: string | null
    address?: string | null
    isDefault?: boolean
}) {
    try {
        const provider = await prisma.provider.update({
            where: { id },
            data
        })
        revalidatePath("/providers")
        revalidatePath("/orders")
        return { success: true, data: provider }
    } catch (error) {
        console.error("Error updating provider:", error)
        return { success: false, error: "Failed to update provider" }
    }
}

export async function deleteProvider(id: string) {
    try {
        await prisma.provider.delete({
            where: { id }
        })
        revalidatePath("/providers")
        revalidatePath("/orders")
        return { success: true }
    } catch (error) {
        console.error("Error deleting provider:", error)
        return { success: false, error: "Failed to delete provider" }
    }
}
