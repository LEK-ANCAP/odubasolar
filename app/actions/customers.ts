"use server"

import { prisma } from "@/lib/prisma"
import { Customer } from "@/hooks/use-customers-store"
import { revalidatePath } from "next/cache"

export async function fetchCustomersAction() {
    try {
        const users = await prisma.user.findMany({
            where: {
                role: "CUSTOMER"
            },
            orderBy: {
                name: 'asc'
            },
            include: {
                orders: true
            }
        })

        const customers: Customer[] = users.map(user => ({
            id: user.id,
            name: user.name || "Sin Nombre",
            email: user.email || undefined,
            phone: user.phone || undefined,
            address: user.address || undefined,
            status: 'active', // Default status for now
            createdAt: user.createdAt.toISOString(),
            totalSpent: 0, // value to be calculated if needed
            ordersCount: user.orders.length
        }))

        return { success: true, data: customers }
    } catch (error) {
        console.error("Error fetching customers:", error)
        return { success: false, error: "Error al cargar clientes" }
    }
}

export async function createCustomerAction(data: Partial<Customer>) {
    try {
        if (!data.email) {
            // Generate a fake email if not provided, or handle as error?
            // For now, let's allow optional email but Prisma mandates strict unique email if provided. 
            // If email is empty string in payload, we should treat as undefined.
            // But User model has email as String @unique. It CANNOT be null? 
            // Prisma schema says: email String @unique. So it is REQUIRED.
            // We need to handle this. If user doesn't provide email, we might need a fake one or fail.
            // Let's assume for now we generate one if missing or fail.
            return { success: false, error: "El email es obligatorio para crear un usuario." }
        }

        const newUser = await prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                phone: data.phone,
                address: data.address,
                role: "CUSTOMER"
            }
        })

        const newCustomer: Customer = {
            id: newUser.id,
            name: newUser.name || "Sin Nombre",
            email: newUser.email || undefined,
            phone: newUser.phone || undefined,
            address: newUser.address || undefined,
            status: 'active',
            createdAt: newUser.createdAt.toISOString(),
            totalSpent: 0,
            ordersCount: 0
        }

        revalidatePath('/admin/customers')
        return { success: true, data: newCustomer }
    } catch (error: any) {
        console.error("Error creating customer:", error)
        if (error.code === 'P2002') {
            return { success: false, error: "Ya existe un cliente con este email." }
        }
        return { success: false, error: "Error al crear cliente" }
    }
}

export async function updateCustomerAction(id: string, data: Partial<Customer>) {
    try {
        const updatedUser = await prisma.user.update({
            where: { id },
            data: {
                name: data.name,
                email: data.email,
                phone: data.phone,
                address: data.address
            }
        })

        const updatedCustomer: Customer = {
            id: updatedUser.id,
            name: updatedUser.name || "Sin Nombre",
            email: updatedUser.email || undefined,
            phone: updatedUser.phone || undefined,
            address: updatedUser.address || undefined,
            status: 'active',
            createdAt: updatedUser.createdAt.toISOString(),
            // We might want to fetch orders count again or preserve it?
            // For simplicity, returning basic info. Store matches by ID.
            totalSpent: 0,
            ordersCount: 0
        }

        revalidatePath('/admin/customers')
        return { success: true, data: updatedCustomer }
    } catch (error) {
        console.error("Error updating customer:", error)
        return { success: false, error: "Error al actualizar cliente" }
    }
}

export async function deleteCustomerAction(id: string) {
    try {
        await prisma.user.delete({
            where: { id }
        })
        revalidatePath('/admin/customers')
        return { success: true }
    } catch (error) {
        console.error("Error deleting customer:", error)
        return { success: false, error: "Error al eliminar cliente" }
    }
}
