"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { ProductSelector } from "@/components/admin/product-selector";

export function AttributeOptions({ nestIndex }: { nestIndex: number }) {
    const { control, register } = useFormContext();
    const { fields, append, remove } = useFieldArray({
        control,
        name: `attributes.${nestIndex}.options`,
    });

    return (
        <div className="space-y-4 md:space-y-4">
            {fields.map((item, k) => (
                <div key={item.id} className="grid gap-4 pb-4 mb-4 border-b border-slate-100 last:border-0 last:pb-0 last:mb-0 relative">
                    <div className="absolute right-0 top-[-4px]">
                        <Button variant="ghost" size="icon" onClick={() => remove(k)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="pr-10">
                        <h4 className="font-bold text-sm text-slate-800">Opción {k + 1}</h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="grid gap-1.5">
                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Etiqueta (Ej: Teja)</Label>
                            <Input {...register(`attributes.${nestIndex}.options.${k}.label`, { required: true })} className="h-10 bg-slate-50/50" />
                        </div>
                        <div className="grid gap-1.5">
                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Valor Interno (Ej: teja)</Label>
                            <Input {...register(`attributes.${nestIndex}.options.${k}.value`, { required: true })} className="h-10 bg-slate-50/50" />
                        </div>
                    </div>

                    {/* Variations: Products added by this option */}
                    <div className="pt-2">
                        <Label className="mb-2 block text-xs font-semibold text-slate-500 uppercase tracking-wider">Productos Agregados por esta opción</Label>
                        <VariationsList nestIndex={nestIndex} optionIndex={k} />
                    </div>
                </div>
            ))}
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ label: "", value: "", variations: [] })}
                className="w-full sm:w-auto mt-2 border-dashed border-slate-300 text-slate-600 hover:text-slate-900 bg-white"
            >
                <Plus className="mr-2 h-4 w-4" />
                Agregar Nueva Opción
            </Button>
        </div>
    );
}

function VariationsList({ nestIndex, optionIndex }: { nestIndex: number, optionIndex: number }) {
    const { control, register, setValue, watch } = useFormContext();
    const { fields, append, remove } = useFieldArray({
        control,
        name: `attributes.${nestIndex}.options.${optionIndex}.variations`
    });

    return (
        <div className="space-y-3">
            {fields.map((field, vIndex) => (
                <div key={field.id} className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-end border border-slate-100 p-3 rounded-lg bg-slate-50/50 relative">
                    <div className="absolute right-2 top-2 sm:hidden">
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(vIndex)} className="h-6 w-6 text-slate-400 hover:text-red-500 bg-white shadow-sm border border-slate-200">
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                    <div className="flex-1 w-full pt-4 sm:pt-0">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Producto</Label>
                        <ProductSelector
                            value={watch(`attributes.${nestIndex}.options.${optionIndex}.variations.${vIndex}.productId`)}
                            onChange={(val) => setValue(`attributes.${nestIndex}.options.${optionIndex}.variations.${vIndex}.productId`, val)}
                        />
                        <input type="hidden" {...register(`attributes.${nestIndex}.options.${optionIndex}.variations.${vIndex}.productId`, { required: true })} />
                    </div>
                    <div className="flex gap-3 sm:gap-4 w-full sm:w-auto items-end">
                        <div className="w-full sm:w-28 shrink-0">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Cant. Extra</Label>
                            <Input
                                type="number"
                                className="h-10 bg-white"
                                {...register(`attributes.${nestIndex}.options.${optionIndex}.variations.${vIndex}.quantityAdjustment`, { valueAsNumber: true })}
                                defaultValue={1}
                            />
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(vIndex)}
                            className="hidden sm:flex h-10 w-10 shrink-0 text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 bg-white"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            ))}
            <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => append({ productId: "", quantityAdjustment: 1 })}
                className="w-full sm:w-auto text-xs font-semibold h-8 bg-slate-100 hover:bg-slate-200 text-slate-600"
            >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Vincular Producto
            </Button>
        </div>
    )
}
