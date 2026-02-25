import { cn } from "@/lib/utils"

type Status = "in_stock" | "low_stock" | "out_of_stock"

interface ProductStatusBadgeProps {
    status: Status
    quantity: number
}

export function ProductStatusBadge({ status, quantity }: ProductStatusBadgeProps) {
    return (
        <span className={cn(
            "inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium",
            {
                "bg-emerald-100 text-emerald-700": status === "in_stock",
                "bg-amber-100 text-amber-700": status === "low_stock",
                "bg-rose-100 text-rose-700": status === "out_of_stock",
            }
        )}>
            {quantity}
        </span>
    )
}
