import { z } from "zod";

export const KitVariationSchema = z.object({
    productId: z.string().min(1, "Product is required"),
    quantityAdjustment: z.number().int(),
});

export const KitOptionSchema = z.object({
    label: z.string().min(1, "Label is required"),
    value: z.string().min(1, "Value is required"),
    variations: z.array(KitVariationSchema),
});

export const KitAttributeSchema = z.object({
    name: z.string().min(1, "Attribute name is required"),
    options: z.array(KitOptionSchema),
});

export const CreateKitSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    basePrice: z.coerce.number().min(0, "Price must be positive"),
    attributes: z.array(KitAttributeSchema),
});

export type CreateKitInput = z.infer<typeof CreateKitSchema>;
