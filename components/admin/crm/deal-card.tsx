'use client'

import { Deal } from "@/app/actions/crm"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, UserIcon, PhoneIcon, MailIcon, ClockIcon } from "lucide-react"
import { formatCurrency } from "@/lib/utils" // Assuming this helper exists
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

interface DealCardProps {
    deal: Deal
    onDragStart: (e: React.DragEvent) => void
}

export function DealCard({ deal, onDragStart }: DealCardProps) {
    return (
        <div
            draggable
            onDragStart={onDragStart}
            className="cursor-move touch-none"
        >
            <Card className="shadow-sm hover:shadow-md transition-shadow group">
                <CardHeader className="p-3 pb-2 space-y-1">
                    <div className="flex justify-between items-start">
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-5 font-normal">
                            {deal.source || "Sin origen"}
                        </Badge>
                        {/* Options menu could go here */}
                    </div>
                    <CardTitle className="text-sm font-medium leading-tight">
                        {deal.title}
                    </CardTitle>
                    <div className="font-bold text-sm">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: deal.currency }).format(deal.value)}
                    </div>
                </CardHeader>
                <CardContent className="p-3 pt-0 pb-2 space-y-2">
                    {deal.expectedCloseDate && (
                        <div className="flex items-center text-xs text-muted-foreground gap-1">
                            <CalendarIcon className="w-3 h-3" />
                            <span>
                                {new Date(deal.expectedCloseDate).toLocaleDateString()}
                            </span>
                        </div>
                    )}

                    {(deal.contactName || deal.user?.name) && (
                        <div className="flex items-center text-xs text-muted-foreground gap-1">
                            <UserIcon className="w-3 h-3" />
                            <span className="truncate max-w-[150px]">
                                {deal.user?.name || deal.contactName}
                            </span>
                        </div>
                    )}

                    {deal.contactPhone && (
                        <div className="flex items-center text-xs text-muted-foreground gap-1">
                            <PhoneIcon className="w-3 h-3" />
                            <span className="truncate max-w-[150px]">
                                {deal.contactPhone}
                            </span>
                        </div>
                    )}

                    {deal.contactEmail && (
                        <div className="flex items-center text-xs text-muted-foreground gap-1">
                            <MailIcon className="w-3 h-3" />
                            <span className="truncate max-w-[150px]">
                                {deal.contactEmail}
                            </span>
                        </div>
                    )}

                </CardContent>
                <CardFooter className="p-3 pt-0 flex justify-between items-center text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <ClockIcon className="w-3 h-3" />
                        {formatDistanceToNow(new Date(deal.updatedAt), { addSuffix: true, locale: es })}
                    </div>
                </CardFooter>
            </Card>
        </div>
    )
}
