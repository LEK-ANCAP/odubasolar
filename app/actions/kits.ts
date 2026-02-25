"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function checkPrisma() {
    // Helper to check DB connection
    try {
        await prisma.$queryRaw`SELECT 1`;
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
}

export async function getProductsForSelector() {
    try {
        const products = await prisma.product.findMany({
            select: {
                id: true,
                name: true,
                sku: true,
                price: true,
            },
            orderBy: { name: 'asc' }
        });
        return products.map(p => ({
            ...p,
            price: Number(p.price)
        }));
    } catch (error) {
        console.error("Failed to fetch products:", error);
        return [];
    }
}

// Zod Validation
import { CreateKitSchema } from "@/lib/schemas";

export async function createKit(data: unknown) {
    try {
        const result = CreateKitSchema.safeParse(data);

        if (!result.success) {
            console.error("Validation failed:", result.error.flatten());
            return { success: false, error: "Validation failed", details: result.error.flatten() };
        }

        const validData = result.data;
        console.log("Creating Kit:", validData.name);

        // Transactional creation with explicit ID linking
        const kit = await prisma.$transaction(async (tx) => {
            // 1. Create the base Kit
            const newKit = await tx.kit.create({
                data: {
                    name: validData.name,
                    description: validData.description,
                    totalPrice: validData.basePrice,
                }
            });

            // 2. Create Attributes, Options, and Variations recursively
            for (const attr of validData.attributes) {
                const newAttr = await tx.kitAttribute.create({
                    data: {
                        kitId: newKit.id,
                        name: attr.name,
                        slug: attr.name.toLowerCase().replace(/\s+/g, '_'),
                    }
                });

                for (const opt of attr.options) {
                    const newOpt = await tx.kitAttributeOption.create({
                        data: {
                            attributeId: newAttr.id,
                            label: opt.label,
                            value: opt.value,
                        }
                    });

                    // 3. Create Variations (Linking to Kit, Option, and Product)
                    if (opt.variations.length > 0) {
                        await tx.kitVariation.createMany({
                            data: opt.variations.map(v => ({
                                kitId: newKit.id,
                                optionId: newOpt.id,
                                productId: v.productId,
                                quantityAdjustment: v.quantityAdjustment,
                            }))
                        });
                    }
                }
            }

            return newKit;
        });

        revalidatePath('/kits');
        return {
            success: true,
            kit: {
                ...kit,
                totalPrice: Number(kit.totalPrice)
            }
        };
    } catch (error) {
        console.error("Failed to create kit:", error);
        return { success: false, error: "Database error" };
    }
}
