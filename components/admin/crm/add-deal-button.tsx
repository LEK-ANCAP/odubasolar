'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createDeal } from "@/app/actions/crm"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function AddDealButton() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)

        const formData = new FormData(e.currentTarget)
        const data = {
            title: formData.get("title") as string,
            value: parseFloat(formData.get("value") as string) || 0,
            currency: formData.get("currency") as string,
            contactName: formData.get("contactName") as string,
            contactEmail: formData.get("contactEmail") as string,
            contactPhone: formData.get("contactPhone") as string,
            source: formData.get("source") as string,
            notes: formData.get("notes") as string,
            stage: "PROSPECT",
            expectedCloseDate: undefined
        }

        const res = await createDeal(data)

        if (res.success) {
            toast.success("Oportunidad creada exitosamente")
            setOpen(false)
            // Ideally the parent would update, but since we rely on server actions revalidating path, 
            // the router refresh *should* trigger a re-fetch if we were using a server component wrapper effectively.
            // However, simplified local updates or reloading is needed.
            // RevalidatePath server-side handles the data, nextjs should update.
        } else {
            toast.error(res.error || "Error al crear oportunidad")
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full mb-2 border-dashed border-2">
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Nueva Oportunidad
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Crear Oportunidad</DialogTitle>
                    <DialogDescription>
                        Añade un nuevo prospecto a tu pipeline.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="title" className="text-right">
                            Título
                        </Label>
                        <Input id="title" name="title" placeholder="Ej. Instalación Solar Residencial" className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="value" className="text-right">
                            Valor
                        </Label>
                        <div className="col-span-3 flex gap-2">
                            <Input id="value" name="value" type="number" placeholder="0.00" step="0.01" />
                            <Select name="currency" defaultValue="USD">
                                <SelectTrigger className="w-[100px]">
                                    <SelectValue placeholder="Moneda" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="USD">USD</SelectItem>
                                    <SelectItem value="CUP">CUP</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="contactName" className="text-right">
                            Cliente
                        </Label>
                        <Input id="contactName" name="contactName" placeholder="Nombre del contacto" className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="contactPhone" className="text-right">
                            Teléfono
                        </Label>
                        <Input id="contactPhone" name="contactPhone" placeholder="+53..." className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="source" className="text-right">
                            Origen
                        </Label>
                        <Select name="source">
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Seleccionar origen" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Website">Sitio Web</SelectItem>
                                <SelectItem value="Referral">Referido</SelectItem>
                                <SelectItem value="Social">Redes Sociales</SelectItem>
                                <SelectItem value="Cold Call">Llamada en Frío</SelectItem>
                                <SelectItem value="Walk-in">Visita</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="notes" className="text-right">
                            Notas
                        </Label>
                        <Textarea id="notes" name="notes" placeholder="Detalles adicionales..." className="col-span-3" />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Guardando..." : "Guardar"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
