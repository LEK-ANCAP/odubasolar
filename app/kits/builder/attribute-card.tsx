"use client";

import { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import { AttributeOptions } from "./attribute-options";

export function AttributeCard({ index, remove }: { index: number, remove: (index: number) => void }) {
    const { register, watch } = useFormContext();
    const [isOpen, setIsOpen] = useState(false);

    // Watch relevant values
    const name = watch(`attributes.${index}.name`);
    const options = watch(`attributes.${index}.options`);

    // Auto-open if it has no name (assuming it's new)
    useEffect(() => {
        if (!name) {
            setIsOpen(true);
        }
    }, []);

    // Also auto-open if manually toggled (handled by onClick)

    return (
        <div className="group border rounded-xl shadow-sm bg-white overflow-hidden transition-all duration-200 hover:shadow-md hover:border-slate-300">
            {/* Header - Always visible */}
            <div
                className="flex items-center justify-between p-3 bg-slate-50/50 border-b border-transparent group-hover:bg-slate-50 cursor-pointer transition-colors select-none"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-3">
                    <GripVertical className="text-slate-300 w-4 h-4 group-hover:text-slate-400" />
                    <div className="flex flex-col">
                        <span className="font-semibold text-sm text-slate-700">{name || <span className="text-slate-400 italic">Nuevo Atributo...</span>}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded-md">
                                {options?.length || 0} OPCIONES
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        onClick={(e) => {
                            e.stopPropagation();
                            remove(index);
                        }}
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                    <div className="h-8 w-8 flex items-center justify-center text-slate-400">
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                </div>
            </div>

            {/* Body - Collapsible */}
            {isOpen && (
                <div className="p-3 md:p-4 space-y-4 md:space-y-6 bg-white animate-in slide-in-from-top-2 fade-in duration-200">
                    <div className="space-y-1.5">
                        <Label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Nombre del Atributo</Label>
                        <Input
                            {...register(`attributes.${index}.name` as const, { required: true })}
                            placeholder="Ej: Tipo de Techo"
                            className="font-semibold text-base md:text-lg h-10 md:h-12 bg-slate-50/30 border-slate-200 focus:bg-white transition-all"
                            autoFocus
                        />
                        <p className="text-[10px] md:text-[11px] text-slate-400 ml-1">Este nombre identificará la pregunta en el configurador (Ej: "¿Qué tipo de estructura necesita?").</p>
                    </div>

                    <div className="pt-2">
                        <Label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Opciones Disponibles</Label>
                        <AttributeOptions nestIndex={index} />
                    </div>
                </div>
            )}
        </div>
    )
}
