"use client"

import { useState, useCallback, useMemo } from "react"
import { useDropzone } from "react-dropzone"
import * as XLSX from "xlsx"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { FileUp, UploadCloud, ArrowRight, Loader2 } from "lucide-react"

import { useInventoryStore, Product } from "@/hooks/use-inventory-store"

// Steps of the Import Wizard
type Step = "UPLOAD" | "MAPPING" | "REVIEW" | "IMPORTING" | "SUCCESS"

const DB_FIELDS = [
    { value: "ignore", label: "-- Ignorar Columna --" },
    { value: "name", label: "Nombre del Producto" },
    { value: "price", label: "Precio de Venta (USD)" },
    { value: "costPrice", label: "Precio de Costo (USD)" },
    { value: "stock", label: "Cantidad en Stock" },
    { value: "category", label: "Categoría" }
]

interface PreparedRow {
    action: "CREATE" | "UPDATE"
    targetId?: string
    data: any
    ignored: boolean
    originalRow: any
    index: number
}

export function ImportWizard() {
    const [isOpen, setIsOpen] = useState(false)
    const [currentStep, setCurrentStep] = useState<Step>("UPLOAD")

    // File data
    const [fileName, setFileName] = useState<string>("")
    const [headers, setHeaders] = useState<string[]>([])
    const [rawRows, setRawRows] = useState<any[]>([])

    // Mapping state: { [excelHeader]: dbField }
    const [columnMap, setColumnMap] = useState<Record<string, string>>({})

    // Review state
    const [preparedRows, setPreparedRows] = useState<PreparedRow[]>([])
    const [isImporting, setIsImporting] = useState(false)

    const [error, setError] = useState<string>("")

    // Store
    const products = useInventoryStore(state => state.products)
    const addProduct = useInventoryStore(state => state.addProduct)
    const updateProduct = useInventoryStore(state => state.updateProduct)

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open)
        if (!open && !isImporting) {
            setTimeout(() => {
                setCurrentStep("UPLOAD")
                setHeaders([])
                setRawRows([])
                setColumnMap({})
                setPreparedRows([])
                setError("")
                setFileName("")
            }, 200)
        }
    }

    // --- STEP 1: UPLOAD ---
    const onDrop = useCallback((acceptedFiles: File[]) => {
        setError("")
        if (acceptedFiles.length === 0) return

        const file = acceptedFiles[0]
        setFileName(file.name)

        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const data = e.target?.result
                const workbook = XLSX.read(data, { type: "binary" })
                const firstSheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[firstSheetName]

                const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
                if (json.length < 2) {
                    setError("El archivo parece estar vacío o no tiene suficientes datos.")
                    return
                }

                const extractedHeaders = json[0] as string[]
                const dataRows = json.slice(1).map(row => {
                    const rowData: Record<string, any> = {}
                    extractedHeaders.forEach((header, index) => {
                        rowData[header] = row[index]
                    })
                    return rowData
                }).filter(row => Object.keys(row).length > 0)

                setHeaders(extractedHeaders)
                setRawRows(dataRows)

                // Auto-Map heuristics
                const initialMap: Record<string, string> = {}
                extractedHeaders.forEach(header => {
                    if (!header) return
                    const lowerHeader = header.toString().toLowerCase()
                    let matchedField = "ignore"

                    if (lowerHeader.includes("producto") || lowerHeader.includes("nombre")) {
                        matchedField = "name"
                    } else if (lowerHeader.includes("venta") || lowerHeader.includes("precio")) {
                        matchedField = "price"
                    } else if (lowerHeader.includes("coste") || lowerHeader.includes("costo")) {
                        matchedField = "costPrice"
                    } else if (lowerHeader.includes("cantidad") || lowerHeader.includes("stock")) {
                        matchedField = "stock"
                    } else if (lowerHeader.includes("categoria") || lowerHeader.includes("categoría")) {
                        matchedField = "category"
                    }

                    initialMap[header] = matchedField
                })

                setColumnMap(initialMap)
                setCurrentStep("MAPPING")
            } catch (err: any) {
                setError("Error leyendo el archivo Excel. Asegúrate de que no esté corrupto.")
                console.error(err)
            }
        }
        reader.onerror = () => setError("Error al leer el archivo.")
        reader.readAsArrayBuffer(file)
    }, [])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls'],
            'text/csv': ['.csv']
        },
        maxFiles: 1
    })

    // --- STEP 2: MAPPING ---
    const handleMapChange = (header: string, dbField: string) => {
        setColumnMap(prev => ({ ...prev, [header]: dbField }))
    }

    const handleProceedToReview = () => {
        // Validate mapping: At least "name" should be mapped.
        const mappedValues = Object.values(columnMap)
        if (!mappedValues.includes("name")) {
            setError("Debes mapear al menos una columna al campo 'Nombre del Producto'.")
            return
        }
        setError("")

        // Prepare Rows
        const newPreparedRows: PreparedRow[] = rawRows.map((row, index) => {
            const productData: any = {}

            // Build productData based on map
            Object.entries(columnMap).forEach(([excelHeader, dbField]) => {
                if (dbField !== "ignore" && row[excelHeader] !== undefined) {
                    productData[dbField] = row[excelHeader]
                }
            })

            // Ensure name exists
            if (!productData.name) {
                return { action: "CREATE", data: productData, ignored: true, originalRow: row, index }
            }

            // Format numbers (handle commas as decimals)
            const parseNumber = (val: any) => {
                if (val === undefined || val === null || val === '') return undefined;
                if (typeof val === 'number') return val;
                const parsed = Number(String(val).replace(',', '.'));
                return isNaN(parsed) ? 0 : parsed;
            }

            if (productData.price !== undefined) productData.saleUsd = parseNumber(productData.price)
            if (productData.costPrice !== undefined) productData.costUsd = parseNumber(productData.costPrice)
            if (productData.stock !== undefined) productData.stock = parseNumber(productData.stock)

            // Conflict resolution: Check if product already exists by name
            const existingProduct = products.find(p =>
                (p.name.toLowerCase() === String(productData.name).toLowerCase())
            )

            if (existingProduct) {
                return {
                    action: "UPDATE",
                    targetId: existingProduct.id,
                    data: productData,
                    ignored: false,
                    originalRow: row,
                    index
                }
            }

            return {
                action: "CREATE",
                data: productData,
                ignored: false,
                originalRow: row,
                index
            }
        })

        setPreparedRows(newPreparedRows)
        setCurrentStep("REVIEW")
    }

    // --- STEP 3: REVIEW ---
    const toggleIgnoreRow = (index: number) => {
        setPreparedRows(prev => prev.map(row => row.index === index ? { ...row, ignored: !row.ignored } : row))
    }

    const createCount = preparedRows.filter(r => !r.ignored && r.action === "CREATE").length
    const updateCount = preparedRows.filter(r => !r.ignored && r.action === "UPDATE").length
    const ignoredCount = preparedRows.filter(r => r.ignored).length

    // --- STEP 4: IMPORT execution ---
    const handleExecuteImport = async () => {
        setIsImporting(true)
        setError("")

        const rowsToProcess = preparedRows.filter(r => !r.ignored)

        try {
            // Process sequentially to avoid overwhelming the store/DB sync
            for (const row of rowsToProcess) {
                if (row.action === "CREATE") {
                    await addProduct(row.data)
                } else if (row.action === "UPDATE" && row.targetId) {
                    await updateProduct(row.targetId, row.data)
                }
            }

            setCurrentStep("SUCCESS")
        } catch (err: any) {
            setError("Ocurrió un error parcial durante la importación. Algunos productos pueden no haberse guardado.")
        } finally {
            setIsImporting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <FileUp className="w-4 h-4" />
                    Importar Excel
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-11/12 max-w-[95vw] md:max-w-5xl">
                <DialogHeader>
                    <DialogTitle>Asistente de Importación</DialogTitle>
                    <DialogDescription>
                        Importa productos masivamente desde un archivo Excel o CSV.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-2">
                    {error && <div className="text-red-500 font-medium mb-4 bg-red-50 p-3 rounded-md border border-red-200">{error}</div>}

                    {currentStep === "UPLOAD" && (
                        <div
                            {...getRootProps()}
                            className={`flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg transition-colors cursor-pointer mt-4
                    ${isDragActive ? 'border-primary bg-primary/10' : 'border-slate-300 hover:border-primary hover:bg-slate-50'}`}
                        >
                            <input {...getInputProps()} />
                            <UploadCloud className={`w-12 h-12 mb-4 ${isDragActive ? 'text-primary' : 'text-slate-400'}`} />
                            <p className="text-slate-600 text-center font-medium">
                                {isDragActive ? "Suelta el archivo aquí" : "Arrastra y suelta tu archivo Excel (.xlsx, .csv)"}
                            </p>
                            <p className="text-slate-400 text-sm mt-2 text-center">
                                o haz clic para buscar en tus carpetas
                            </p>
                        </div>
                    )}

                    {currentStep === "MAPPING" && (
                        <div className="space-y-4">
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <h3 className="font-medium text-slate-800">Paso 2: Mapeo de Columnas</h3>
                                <p className="text-sm text-slate-500">
                                    Archivo: <span className="font-semibold">{fileName}</span> ({rawRows.length} filas detectadas).
                                    El sistema ha intentado emparejar las columnas automáticamente. Revisa y corrige antes de continuar.
                                </p>
                            </div>

                            <div className="border rounded-md max-h-[50vh] overflow-y-auto">
                                <Table>
                                    <TableHeader className="bg-slate-50 sticky top-0 z-10">
                                        <TableRow>
                                            <TableHead className="w-1/2">Columna en Excel</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                            <TableHead className="w-1/2">Campo en Base de Datos</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {headers.map(header => {
                                            if (!header) return null;
                                            return (
                                                <TableRow key={header}>
                                                    <TableCell className="font-medium">{header.toString()}</TableCell>
                                                    <TableCell><ArrowRight className="w-4 h-4 text-slate-400" /></TableCell>
                                                    <TableCell>
                                                        <Select
                                                            value={columnMap[header] || "ignore"}
                                                            onValueChange={(val) => handleMapChange(header, val)}
                                                        >
                                                            <SelectTrigger className="w-full">
                                                                <SelectValue placeholder="Seleccionar campo..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {DB_FIELDS.map(field => (
                                                                    <SelectItem key={field.value} value={field.value}>
                                                                        {field.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button onClick={handleProceedToReview}>Siguiente: Revisar Conflictos</Button>
                            </div>
                        </div>
                    )}

                    {currentStep === "REVIEW" && (
                        <div className="space-y-4">
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                <div>
                                    <h3 className="font-medium text-slate-800">Paso 3: Revisión de Datos</h3>
                                    <p className="text-sm text-slate-500">
                                        Elige qué productos importar. Si un producto ya existe en el inventario, se actualizará.
                                    </p>
                                </div>
                                <div className="flex gap-4 text-sm font-medium">
                                    <div className="flex flex-col items-center"><span className="text-blue-600 text-lg">{createCount}</span>Nuevos</div>
                                    <div className="flex flex-col items-center"><span className="text-amber-600 text-lg">{updateCount}</span>Actualizar</div>
                                    <div className="flex flex-col items-center"><span className="text-slate-400 text-lg">{ignoredCount}</span>Omitidos</div>
                                </div>
                            </div>

                            <div className="border rounded-md max-h-[50vh] overflow-y-auto">
                                <Table>
                                    <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                        <TableRow>
                                            <TableHead className="w-[80px]">Importar</TableHead>
                                            <TableHead className="w-[100px]">Acción</TableHead>
                                            <TableHead>Nombre</TableHead>
                                            <TableHead className="text-right">Precio ($)</TableHead>
                                            <TableHead className="text-right">Stock</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {preparedRows.map((row) => (
                                            <TableRow key={row.index} className={row.ignored ? "opacity-40 bg-slate-50" : ""}>
                                                <TableCell>
                                                    <Switch
                                                        checked={!row.ignored}
                                                        onCheckedChange={() => toggleIgnoreRow(row.index)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {row.action === "CREATE" ? (
                                                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-none">Nuevo</Badge>
                                                    ) : (
                                                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-none">Actualizar</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-medium">{row.data.name || "Sin nombre"}</TableCell>
                                                <TableCell className="text-right">{row.data.saleUsd !== undefined ? `$${row.data.saleUsd}` : "-"}</TableCell>
                                                <TableCell className="text-right">{row.data.stock !== undefined ? row.data.stock : "-"}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="flex justify-between pt-4">
                                <Button variant="outline" onClick={() => setCurrentStep("MAPPING")} disabled={isImporting}>Volver al Mapeo</Button>
                                <Button onClick={handleExecuteImport} disabled={isImporting || (createCount + updateCount === 0)}>
                                    {isImporting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Importando...
                                        </>
                                    ) : (
                                        `Importar ${createCount + updateCount} Productos`
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}

                    {currentStep === "SUCCESS" && (
                        <div className="flex flex-col items-center justify-center p-12 text-center bg-green-50 rounded-lg text-emerald-800 border border-green-200 mt-4">
                            <div className="w-16 h-16 bg-green-200 rounded-full flex items-center justify-center mb-4">
                                <svg className="w-8 h-8 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                            </div>
                            <h3 className="text-xl font-bold mb-2">¡Importación Completada Exitosamente!</h3>
                            <p className="text-green-700/80 mb-6 max-w-md">
                                Los productos han sido procesados y guardados en el inventario. Se sincronizarán en segundo plano.
                            </p>
                            <Button onClick={() => setIsOpen(false)} size="lg">Ir al Inventario</Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
