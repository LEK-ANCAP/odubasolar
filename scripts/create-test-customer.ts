
import { prisma } from "../lib/prisma"

async function createTestCustomer() {
    try {
        const email = `test-customer=${Date.now()}@example.com`
        console.log("Creating customer with email:", email)

        const user = await prisma.user.create({
            data: {
                name: "Test Customer From Script",
                email: email,
                role: "CUSTOMER",
                password: "password123" // Providing password just in case it's required by old client
            }
        })
        console.log("Created customer:", user.id)
    } catch (e) {
        console.error("Error creating customer:", e)
    } finally {
        await prisma.$disconnect()
    }
}

createTestCustomer()
