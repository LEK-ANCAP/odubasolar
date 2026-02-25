"use server"

import { prisma as db } from "@/lib/prisma"

export type BudgetLogicResult = {
    productId: string
    quantity: number
}

export async function calculateBudgetItems(answers: Record<string, string>): Promise<BudgetLogicResult[]> {
    try {
        // 1. Get all impacts for the selected options
        // answers is a map of questionId -> optionId (or value)

        // We only care about the values that are option IDs
        const optionIds = Object.values(answers)

        const impacts = await db.budgetQuestionImpact.findMany({
            where: {
                optionId: {
                    in: optionIds
                }
            },
            include: {
                product: true
            }
        })

        // 2. Aggregate quantities by product
        const productMap = new Map<string, number>()

        for (const impact of impacts) {
            const currentQty = productMap.get(impact.productId) || 0
            productMap.set(impact.productId, currentQty + impact.quantity)
        }

        // 3. Convert to array
        const results: BudgetLogicResult[] = []
        for (const [productId, quantity] of productMap.entries()) {
            results.push({ productId, quantity })
        }

        return results

    } catch (error) {
        console.error("Error calculating budget items:", error)
        return []
    }
}
