"use strict";
"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { calculateBudgetItems } from "@/app/actions/budget-logic"
import { Loader2, ChevronRight, Check, ChevronLeft } from "lucide-react"

interface InitialFormProps {
    questions: any[]
    onComplete: (items: any[]) => void
    onSkip: () => void
}

export function InitialForm({ questions, onComplete, onSkip }: InitialFormProps) {
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [currentStep, setCurrentStep] = useState(0)
    const [isCalculating, setIsCalculating] = useState(false)

    const handleAnswer = (value: string) => {
        setAnswers({ ...answers, [questions[currentStep].id]: value })
    }

    const handleNext = async () => {
        if (currentStep < questions.length - 1) {
            setCurrentStep(currentStep + 1)
        } else {
            // Finish
            setIsCalculating(true)
            const items = await calculateBudgetItems(answers)
            setIsCalculating(false)
            onComplete(items)
        }
    }

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1)
        }
    }



    if (questions.length === 0) {
        return (
            <Card className="max-w-lg mx-auto mt-8">
                <CardHeader>
                    <CardTitle>Crear Presupuesto</CardTitle>
                    <CardDescription>No hay preguntas configuradas para la generación automática.</CardDescription>
                </CardHeader>
                <CardFooter>
                    <Button onClick={onSkip} className="w-full">Continuar al formulario manual</Button>
                </CardFooter>
            </Card>
        )
    }

    const currentQuestion = questions[currentStep]
    const currentAnswer = answers[currentQuestion.id]

    return (
        <Card className="max-w-xl mx-auto mt-8 animate-in fade-in zoom-in-95 duration-300">
            <CardHeader>
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-slate-500 font-medium">Pregunta {currentStep + 1} de {questions.length}</span>
                    <Button variant="ghost" size="sm" onClick={onSkip} className="text-slate-400 hover:text-slate-600">
                        Omitir asistente
                    </Button>
                </div>
                <CardTitle className="text-xl">{currentQuestion.text}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="py-4">
                    {currentQuestion.type === 'SELECT' && (
                        <RadioGroup value={currentAnswer} onValueChange={handleAnswer} className="gap-3">
                            {currentQuestion.options.map((option: any) => (
                                <div key={option.id} className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors has-[:checked]:border-slate-900 has-[:checked]:bg-slate-50">
                                    <RadioGroupItem value={option.id} id={option.id} />
                                    <Label htmlFor={option.id} className="flex-1 cursor-pointer font-medium">{option.label}</Label>
                                </div>
                            ))}
                        </RadioGroup>
                    )}
                    {/* Add more types if needed later */}
                </div>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={handleBack} disabled={currentStep === 0}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
                </Button>
                <Button onClick={handleNext} disabled={!currentAnswer || isCalculating}>
                    {isCalculating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {currentStep === questions.length - 1 ? "Finalizar" : "Siguiente"}
                    {!isCalculating && currentStep < questions.length - 1 && <ChevronRight className="ml-2 h-4 w-4" />}
                    {!isCalculating && currentStep === questions.length - 1 && <Check className="ml-2 h-4 w-4" />}
                </Button>
            </CardFooter>
        </Card>
    )
}
