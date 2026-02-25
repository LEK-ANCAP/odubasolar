
import { prisma } from "../lib/prisma"

async function createTestCustomerNoPassword() {
    try {
        const email = `test-no-pass=${Date.now()}@example.com`
        console.log("Creating customer without password:", email)

        // Omit password
        const user = await prisma.user.create({
            data: {
                name: "Test No Password",
                email: email,
                role: "CUSTOMER"
            }
        })
        console.log("Created customer:", user.id)
    } catch (e) {
        console.error("Error creating customer:", e)
    } finally {
        await prisma.$disconnect()
    }
}

createTestCustomerNoPassword()
