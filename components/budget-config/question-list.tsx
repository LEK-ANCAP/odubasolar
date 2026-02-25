"use strict";
"use client"

import { useEffect, useState } from "react"
import { getBudgetQuestions, deleteBudgetQuestion } from "@/app/actions/budget-config"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react"
import { QuestionForm } from "./question-form"
import { toast } from "sonner"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function QuestionList() {
    const [questions, setQuestions] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [isCreating, setIsCreating] = useState(false)

    const fetchQuestions = async () => {
        setIsLoading(true)
        const data = await getBudgetQuestions()
        setQuestions(data)
        setIsLoading(false)
    }

    useEffect(() => {
        fetchQuestions()
    }, [])

    const handleDelete = async (id: string) => {
        const res = await deleteBudgetQuestion(id)
        if (res.success) {
            setQuestions(questions.filter(q => q.id !== id))
            toast.success("Pregunta eliminada")
        } else {
            toast.error("Error al eliminar")
        }
    }

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin w-8 h-8 text-slate-400" /></div>

    if (isCreating) {
        return <QuestionForm
            onSuccess={() => { setIsCreating(false); fetchQuestions(); }}
            onCancel={() => setIsCreating(false)}
        />
    }

    if (editingId) {
        const question = questions.find(q => q.id === editingId)
        return <QuestionForm
            initialData={question}
            onSuccess={() => { setEditingId(null); fetchQuestions(); }}
            onCancel={() => setEditingId(null)}
        />
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Preguntas del Presupuesto</h3>
                <Button onClick={() => setIsCreating(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Nueva Pregunta
                </Button>
            </div>

            {questions.length === 0 && (
                <div className="text-center p-8 border rounded-lg border-dashed text-slate-500">
                    No hay preguntas configuradas.
                </div>
            )}

            <div className="grid gap-3">
                {questions.map((question) => (
                    <div key={question.id} className="border p-4 rounded-lg bg-white flex justify-between items-start shadow-sm">
                        <div>
                            <div className="font-medium text-lg">{question.text}</div>
                            <div className="text-sm text-slate-500 mt-1">
                                {question.options.length} opciones configuradas
                            </div>
                            <div className="flex gap-2 mt-2 flex-wrap">
                                {question.options.map((opt: any) => (
                                    <span key={opt.id} className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-xs text-slate-700">
                                        {opt.label}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="icon" onClick={() => setEditingId(question.id)}>
                                <Pencil className="w-4 h-4" />
                            </Button>

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="icon" className="text-red-500 hover:text-red-600">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta acción eliminará la pregunta y todas sus opciones e impactos configurados.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(question.id)} className="bg-red-500 hover:bg-red-600">
                                            Eliminar
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
