"use client";

import * as React from "react";
import { useEffect } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useInventoryStore } from "@/hooks/use-inventory-store";

export function ProductSelector({
    value,
    onChange,
}: {
    value: string;
    onChange: (value: string) => void;
}) {
    const [open, setOpen] = React.useState(false);
    const { products, fetchProducts, isLoading } = useInventoryStore();

    useEffect(() => {
        if (products.length === 0 && !isLoading) {
            fetchProducts();
        }
    }, [products.length, isLoading, fetchProducts]);
    const [searchTerm, setSearchTerm] = React.useState("");

    const selectedProduct = products.find((product) => product.id === value);

    const filteredProducts = products.filter((product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    {value
                        ? selectedProduct?.name || "Producto no encontrado"
                        : "Seleccionar producto..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0 bg-white">
                <div className="flex items-center border-b px-3">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <Input
                        placeholder="Buscar producto..."
                        className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-none shadow-none focus-visible:ring-0"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="max-h-[300px] overflow-y-auto p-1">
                    {filteredProducts.length === 0 && (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                            No se encontraron productos.
                        </div>
                    )}
                    {filteredProducts.map((product, index) => (
                        <div
                            key={`prod-sel-${product.id || index}-${index}`}
                            className={cn(
                                "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-slate-100 hover:text-slate-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                                value === product.id && "bg-slate-100"
                            )}
                            onClick={() => {
                                onChange(product.id);
                                setOpen(false);
                            }}
                        >
                            <Check
                                className={cn(
                                    "mr-2 h-4 w-4",
                                    value === product.id ? "opacity-100" : "opacity-0"
                                )}
                            />
                            {product.name}
                        </div>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
