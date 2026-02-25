
import { prisma } from "../lib/prisma"

async function checkCustomers() {
    try {
        const customers = await prisma.user.findMany({
            where: {
                role: "CUSTOMER"
            }
        })
        console.log("Count of customers:", customers.length)
        console.log("Customers:", JSON.stringify(customers, null, 2))
    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

checkCustomers()
