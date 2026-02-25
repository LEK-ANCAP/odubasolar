"use client";

import { useState, useEffect, Suspense } from "react";
import { useForm, useFieldArray, FormProvider, useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Save, ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { AttributeOptions } from "./attribute-options";
import { useRouter, useSearchParams } from "next/navigation";
import { useKitsStore } from "@/hooks/use-kits-store";
import { ProductSelector } from "@/components/admin/product-selector";
import { AttributeCard } from "./attribute-card";
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Variation = {
    productId: string;
    quantityAdjustment: number;
};

type AttributeOption = {
    label: string;
    value: string;
    variations: Variation[];
};

type Attribute = {
    name: string;
    options: AttributeOption[];
};

type KitFormValues = {
    name: string;
    description: string;
    basePrice: number;
    attributes: Attribute[];
    products: { productId: string; quantity: number }[];
    type: 'purchase' | 'sale' | 'manufacture';
};

function KitBuilderContent() {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get("edit");
    const { addKit, updateKit, kits } = useKitsStore();

    const methods = useForm<KitFormValues>({
        defaultValues: {
            name: "",
            description: "",
            basePrice: 0,
            attributes: [],
            products: [],
            type: 'sale',
        },
    });

    const { control, handleSubmit, register, reset, watch } = methods;

    const { fields: attributeFields, append: appendAttribute, remove: removeAttribute } = useFieldArray({
        control,
        name: "attributes",
    });

    // Load kit data if editing
    useEffect(() => {
        if (editId) {
            const kitToEdit = kits.find(k => k.id === editId);
            if (kitToEdit) {
                reset({
                    name: kitToEdit.name,
                    description: kitToEdit.description,
                    basePrice: kitToEdit.basePrice,
                    attributes: kitToEdit.attributes || [],
                    products: kitToEdit.products || [],
                    type: kitToEdit.type || 'sale'
                });
            }
        }
    }, [editId, kits, reset]);

    const onSubmit = async (data: KitFormValues) => {
        // Validate: manufacture kits must have a price
        if (data.type === 'manufacture' && (!data.basePrice || data.basePrice <= 0)) {
            methods.setError('basePrice', {
                type: 'manual',
                message: 'Los kits de fabricación deben tener un precio obligatorio'
            })
            return
        }

        setIsLoading(true);
        try {
            if (editId) {
                // Update existing kit
                updateKit(editId, {
                    name: data.name,
                    description: data.description,
                    basePrice: data.basePrice,
                    attributes: data.attributes,
                    products: data.products || [],
                    totalPrice: data.basePrice,
                    type: data.type || 'sale'
                });
            } else {
                // Create new kit
                addKit({
                    id: `KIT-${Date.now()}`,
                    name: data.name,
                    description: data.description,
                    basePrice: data.basePrice,
                    attributes: data.attributes,
                    products: data.products || [], // Include base products
                    totalPrice: data.basePrice, // Initial total price logic
                    type: data.type || 'sale' // Default to sale if not specified
                });
            }

            // Simulate delay for better UX
            await new Promise(resolve => setTimeout(resolve, 500));
            router.push("/kits");
        } catch (e) {
            console.error(e);
            alert("Error al guardar el kit");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <FormProvider {...methods}>
            <div className="space-y-4 md:space-y-6 max-w-4xl mx-auto pb-24 md:pb-20">
                <div className="flex items-center justify-between mb-2 px-4 md:px-0 mt-4 md:mt-0">
                    <h1 className="text-2xl font-bold tracking-tight">{editId ? "Editar Kit" : "Nuevo Kit"}</h1>
                </div>

                <div className="grid gap-2 md:gap-6">
                    <Card className="border-y md:border-x border-slate-200 shadow-none md:shadow-sm rounded-none md:rounded-xl">
                        <CardHeader className="px-4 md:px-6 pt-4 md:pt-6 pb-2 md:pb-6">
                            <CardTitle className="text-lg md:text-xl">Información Básica</CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 md:px-6 pb-6 md:pb-6">
                            <div className="grid grid-cols-12 gap-4 md:gap-6">
                                {/* First Row: Name (6) | Price (3) | Type (3) */}
                                <div className="col-span-12 md:col-span-6 space-y-2">
                                    <Label htmlFor="name" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre del Kit</Label>
                                    <Input id="name" {...register("name", { required: true })} placeholder="Ej: Kit Solar 3kW" className="font-medium" />
                                </div>

                                <div className="col-span-6 md:col-span-3 space-y-2">
                                    <Label htmlFor="basePrice" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Precio Base
                                        {watch('type') === 'manufacture' && (
                                            <span className="ml-1 text-red-500">*</span>
                                        )}
                                    </Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-slate-400">$</span>
                                        <Input
                                            id="basePrice"
                                            type="number"
                                            step="0.01"
                                            className={cn(
                                                "pl-7",
                                                methods.formState.errors.basePrice && "border-red-500 focus-visible:ring-red-500"
                                            )}
                                            {...register("basePrice", { valueAsNumber: true })}
                                        />
                                    </div>
                                    {methods.formState.errors.basePrice && (
                                        <p className="text-xs text-red-600">{methods.formState.errors.basePrice.message}</p>
                                    )}
                                </div>

                                <div className="col-span-6 md:col-span-3 space-y-2">
                                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Tipo</Label>
                                    <Select
                                        value={watch('type')}
                                        onValueChange={(val: 'sale' | 'purchase' | 'manufacture') => methods.setValue('type', val, { shouldDirty: true })}
                                    >
                                        <SelectTrigger className="h-10 bg-white border-slate-200 text-sm shadow-sm focus:ring-slate-900 font-medium">
                                            <SelectValue placeholder="Seleccionar tipo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="sale" className="text-sm cursor-pointer">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                    Venta
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="purchase" className="text-sm cursor-pointer">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                                    Compra
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="manufacture" className="text-sm cursor-pointer">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                                                    Fabricación
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Second Row: Description (12) */}
                                <div className="col-span-12 space-y-2">
                                    <Label htmlFor="description" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Descripción</Label>
                                    <Input id="description" {...register("description")} placeholder="Descripción breve para referencia interna..." />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-y md:border-x border-slate-200 shadow-none md:shadow-sm rounded-none md:rounded-xl">
                        <CardHeader className="px-4 md:px-6 pt-4 md:pt-6 pb-2 md:pb-6">
                            <CardTitle className="text-lg md:text-xl">Productos Base del Kit</CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 md:px-6 pb-6 md:pb-6">
                            <div className="text-sm text-muted-foreground mb-4">
                                Estos productos se añadirán automáticamente al presupuesto cuando se seleccione este kit.
                            </div>
                            <BaseProductsList />
                        </CardContent>
                    </Card>

                    <div className="border-t border-slate-200 mt-6 pt-6">
                        <div className="flex flex-row items-center justify-between px-4 md:px-0 pb-4">
                            <h2 className="text-lg md:text-xl font-semibold tracking-tight">Lógica Condicional</h2>
                            <Button type="button" variant="outline" size="sm" onClick={() => appendAttribute({ name: "", options: [] })} className="hidden sm:flex rounded-xl md:rounded-md bg-white">
                                <Plus className="mr-2 h-4 w-4" />
                                Agregar Atributo
                            </Button>
                            <Button type="button" variant="outline" size="icon" onClick={() => appendAttribute({ name: "", options: [] })} className="sm:hidden h-10 w-10 shrink-0 rounded-xl bg-white shadow-sm">
                                <Plus className="h-5 w-5 text-slate-600" />
                            </Button>
                        </div>
                        <div className="px-4 md:px-0 space-y-4 md:space-y-6">
                            {attributeFields.map((field, index) => (
                                <AttributeCard
                                    key={field.id}
                                    index={index}
                                    remove={removeAttribute}
                                />
                            ))}
                            {attributeFields.length === 0 && (
                                <p className="text-sm text-slate-500 text-center py-6 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                                    No hay atributos condicionales. El kit solo incluirá los productos base.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:static md:shadow-none md:border md:rounded-xl flex justify-end gap-3 md:mt-6">
                    <Button type="button" variant="outline" onClick={() => router.push('/kits')} className="w-full md:w-auto h-12 md:h-10 text-base md:text-sm rounded-xl md:rounded-lg">
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit(onSubmit)} disabled={isLoading} size="lg" className="w-full md:w-auto h-12 md:h-10 text-base md:text-sm shadow-md md:shadow-sm bg-slate-900 hover:bg-slate-800 rounded-xl md:rounded-lg">
                        <Save className="mr-2 h-5 w-5 md:h-4 md:w-4" />
                        {isLoading ? "Guardando..." : "Guardar Kit"}
                    </Button>
                </div>
            </div>
        </FormProvider>
    );
}

export default function KitBuilderPage() {
    return (
        <Suspense fallback={<div className="p-6">Cargando...</div>}>
            <KitBuilderContent />
        </Suspense>
    )
}

function BaseProductsList() {
    const { control, register, setValue, watch } = useFormContext();
    const { fields, append, remove } = useFieldArray({
        control,
        name: "products",
    });

    return (
        <div className="space-y-3 md:space-y-4">
            {fields.map((field, index) => (
                <div key={field.id} className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-end border border-slate-200 p-3 md:p-4 rounded-xl bg-slate-50/50">
                    <div className="flex-1 w-full">
                        <Label className="text-xs font-semibold mb-1.5 block">Producto</Label>
                        <ProductSelector
                            value={watch(`products.${index}.productId`)}
                            onChange={(val) => {
                                const currentProducts = watch("products") || [];
                                const isDuplicate = currentProducts.some((p: any, i: number) => i !== index && p.productId === val);

                                if (isDuplicate) {
                                    toast.error("Este producto ya está en el kit");
                                    return;
                                }
                                setValue(`products.${index}.productId`, val);
                            }}
                        />
                        <input type="hidden" {...register(`products.${index}.productId`, { required: true })} />
                    </div>
                    <div className="flex items-end gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-start">
                        <div className="w-24 shrink-0">
                            <Label className="text-xs font-semibold mb-1.5 block">Cantidad</Label>
                            <Input
                                type="number"
                                min="1"
                                {...register(`products.${index}.quantity`, { valueAsNumber: true, min: 1 })}
                                placeholder="1"
                                className="h-10 bg-white"
                            />
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 h-10 w-10 shrink-0 bg-white border border-slate-200"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            ))}
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ productId: "", quantity: 1 })}
                className="border-dashed w-full sm:w-auto mt-2 h-10"
            >
                <Plus className="mr-2 h-4 w-4" />
                Agregar Producto Base
            </Button>
        </div>
    );
}
