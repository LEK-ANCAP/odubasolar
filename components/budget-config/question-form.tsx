"use strict";
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createBudgetQuestion, updateBudgetQuestion, createBudgetOption, updateBudgetOption, deleteBudgetOption } from "@/app/actions/budget-config"
import { toast } from "sonner"
import { Loader2, Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { BudgetImpactForm } from "./budget-impact-form"
import { Separator } from "@/components/ui/separator"

interface Question {
    id: string
    text: string
    type: string
    order: number
    options: Option[]
}

interface Option {
    id: string
    label: string
    value: string
    order: number
    impacts: any[]
}

interface QuestionFormProps {
    initialData?: Question | null
    onSuccess: () => void
    onCancel: () => void
}

export function QuestionForm({ initialData, onSuccess, onCancel }: QuestionFormProps) {
    const [text, setText] = useState(initialData?.text || "")
    const [order, setOrder] = useState(initialData?.order || 0)
    const [isLoading, setIsLoading] = useState(false)
    const [options, setOptions] = useState<Option[]>(initialData?.options || [])

    // Question Save
    const handleSaveQuestion = async () => {
        setIsLoading(true)
        try {
            if (initialData) {
                await updateBudgetQuestion(initialData.id, { text, order })
                toast.success("Pregunta actualizada")
            } else {
                const res = await createBudgetQuestion({ text, type: 'SELECT', order })
                if (res.success && res.data) {
                    toast.success("Pregunta creada")
                    // If created, we might want to switch to edit mode or just close
                    // For simplicity, let's close.
                    onSuccess()
                    return
                }
            }
            onSuccess()
        } catch (error) {
            toast.error("Error al guardar")
        } finally {
            setIsLoading(false)
        }
    }

    // Option Management
    const [newOptionLabel, setNewOptionLabel] = useState("")

    const handleAddOption = async () => {
        if (!initialData) {
            toast.error("Guarda la pregunta primero")
            return
        }
        if (!newOptionLabel) return

        const res = await createBudgetOption({
            questionId: initialData.id,
            label: newOptionLabel,
            value: newOptionLabel.toLowerCase().replace(/\s/g, '_'),
            order: options.length
        })

        if (res.success && res.data) {
            setOptions([...options, { ...res.data, impacts: [] }])
            setNewOptionLabel("")
            toast.success("Opción añadida")
        }
    }

    const handleDeleteOption = async (id: string) => {
        const res = await deleteBudgetOption(id)
        if (res.success) {
            setOptions(options.filter(o => o.id !== id))
            toast.success("Opción eliminada")
        }
    }

    return (
        <div className="space-y-6 border p-4 rounded-lg bg-white">
            <div className="space-y-4">
                <div className="grid gap-2">
                    <Label>Pregunta</Label>
                    <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ej: ¿Qué tipo de techo tiene?" />
                </div>
                <div className="grid gap-2 w-24">
                    <Label>Orden</Label>
                    <Input type="number" value={order} onChange={(e) => setOrder(parseInt(e.target.value))} />
                </div>
            </div>

            <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onCancel} disabled={isLoading}>Cancelar</Button>
                <Button onClick={handleSaveQuestion} disabled={isLoading || !text}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {initialData ? "Guardar Cambios" : "Crear Pregunta"}
                </Button>
            </div>

            {initialData && (
                <>
                    <Separator />
                    <div className="space-y-4">
                        <h3 className="font-medium text-lg">Opciones de Respuesta</h3>

                        <div className="space-y-4">
                            {options.map((option) => (
                                <OptionItem key={option.id} option={option} onDelete={() => handleDeleteOption(option.id)} />
                            ))}
                        </div>

                        <div className="flex gap-2 items-end pt-4">
                            <div className="flex-1">
                                <Label>Nueva Opción</Label>
                                <Input
                                    value={newOptionLabel}
                                    onChange={(e) => setNewOptionLabel(e.target.value)}
                                    placeholder="Ej: Teja, Zinc..."
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
                                />
                            </div>
                            <Button onClick={handleAddOption} disabled={!newOptionLabel}>
                                <Plus className="w-4 h-4 mr-2" /> Añadir
                            </Button>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

function OptionItem({ option, onDelete }: { option: Option, onDelete: () => void }) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-md bg-slate-50">
            <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-0 h-auto w-auto hover:bg-transparent">
                            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </Button>
                    </CollapsibleTrigger>
                    <span className="font-medium">{option.label}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
            <CollapsibleContent className="px-3 pb-3">
                <BudgetImpactForm optionId={option.id} initialImpacts={option.impacts} />
            </CollapsibleContent>
        </Collapsible>
    )
}
