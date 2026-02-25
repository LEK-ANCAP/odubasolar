import * as React from "react"
import { motion, HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"

interface GlassCardProps extends HTMLMotionProps<"div"> {
    variant?: "default" | "hover" | "feature" | "dark"
    children: React.ReactNode
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
    ({ className, variant = "default", children, ...props }, ref) => {

        // Use the global .glass class for base styles and augment with variants
        const baseStyles = "glass rounded-2xl p-6 relative overflow-hidden transition-all duration-300"

        const variants = {
            default: "",
            hover: "hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:-translate-y-1",
            feature: "border-primary/20 bg-gradient-to-br from-white/90 to-white/50 dark:from-white/10 dark:to-transparent",
            dark: "bg-black/50 border-white/10 text-white"
        }

        return (
            <motion.div
                ref={ref}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={cn(baseStyles, variants[variant], className)}
                {...props}
            >
                {/* Subtle Shine Effect for Premium Feel */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                {children}
            </motion.div>
        )
    }
)
GlassCard.displayName = "GlassCard"

export { GlassCard }
