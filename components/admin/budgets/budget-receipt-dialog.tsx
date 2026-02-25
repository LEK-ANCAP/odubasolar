"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { BudgetPDF } from "./budget-pdf"
import { pdf } from "@react-pdf/renderer"
import { Budget } from "@/hooks/use-budgets-store"
import { useSettingsStore } from "@/hooks/use-settings-store"
import { Share2, Download, Loader2, FileText, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface BudgetReceiptDialogProps {
    budget: Budget
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function BudgetReceiptDialog({ budget, trigger, open, onOpenChange }: BudgetReceiptDialogProps) {
    const router = useRouter()
    const {
        companyName,
        companyEmail,
        companyPhone,
        companyAddress,
        companyLogo
    } = useSettingsStore()

    const settings = {
        companyName,
        companyEmail,
        companyPhone,
        companyAddress,
        companyLogo
    }

    const [isGenerating, setIsGenerating] = useState(false)
    const [blobUrl, setBlobUrl] = useState<string | null>(null)

    useEffect(() => {
        if (open) {
            const generatePreview = async () => {
                try {
                    const blob = await pdf(<BudgetPDF budget={budget} settings={settings} />).toBlob()
                    const url = URL.createObjectURL(blob)
                    setBlobUrl(url)
                } catch (error) {
                    console.error("Error creating PDF preview:", error)
                }
            }
            generatePreview()
        } else {
            // Cleanup when dialog closes
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl)
                setBlobUrl(null)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, budget])

    const handleDownload = async () => {
        if (blobUrl) {
            const link = document.createElement('a')
            link.href = blobUrl
            link.download = `Presupuesto-${budget.displayId || budget.id}.pdf`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            toast.success("PDF descargado correctamente")
            return
        }

        setIsGenerating(true)
        try {
            const blob = await pdf(<BudgetPDF budget={budget} settings={settings} />).toBlob()
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `Presupuesto-${budget.displayId || budget.id}.pdf`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
            toast.success("PDF descargado correctamente")
        } catch (error) {
            console.error("Error generating PDF:", error)
            toast.error("Error al generar el PDF")
        } finally {
            setIsGenerating(false)
        }
    }

    const handleShare = async () => {
        setIsGenerating(true)
        try {
            let blob: Blob
            if (blobUrl) {
                blob = await fetch(blobUrl).then(r => r.blob())
            } else {
                blob = await pdf(<BudgetPDF budget={budget} settings={settings} />).toBlob()
            }

            const file = new File([blob], `Presupuesto-${budget.displayId || budget.id}.pdf`, { type: 'application/pdf' })

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: `Presupuesto ${budget.displayId}`,
                    text: `Adjunto presupuesto ${budget.displayId} de ${companyName}`,
                    files: [file]
                })
                toast.success("Compartido correctamente")
            } else {
                // Fallback for desktop or unsupported browsers
                toast.error("Tu dispositivo no soporta compartir archivos directamente. Descárgalo para compartirlo.")
                handleDownload()
            }
        } catch (error) {
            console.error("Error sharing PDF:", error)
            // Ignore abort errors (user cancelled share)
            if ((error as any).name !== 'AbortError') {
                toast.error("Error al compartir el PDF")
            }
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="w-screen h-screen max-w-none rounded-none flex flex-col p-0">
                <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle>Vista Previa del Recibo</DialogTitle>
                </DialogHeader>

                <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-100">
                    {/* Preview Section */}
                    <div className="flex-1 overflow-hidden relative flex items-center justify-center p-4">
                        {blobUrl ? (
                            <iframe
                                src={blobUrl}
                                className="w-full h-full rounded-lg shadow-sm bg-white"
                                title="Vista previa del recibo"
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center text-slate-400">
                                <Loader2 className="w-10 h-10 animate-spin mb-2" />
                                <p>Generando vista previa...</p>
                            </div>
                        )}
                    </div>

                    {/* Sidebar / Actions Section */}
                    <div className="w-full md:w-80 bg-white border-l p-6 flex flex-col gap-6 overflow-y-auto">
                        <div>
                            <h3 className="font-semibold text-slate-900 mb-1">Acciones</h3>
                            <p className="text-sm text-slate-500 mb-4">Descarga o comparte este documento.</p>

                            <div className="flex flex-col gap-3">
                                {/* Primary Action: Convert to Invoice */}
                                <Button onClick={() => {
                                    onOpenChange?.(false)
                                    router.push(`/invoices/new?budgetId=${budget.id}`)
                                }} className="w-full justify-start h-12 bg-slate-900 text-white hover:bg-slate-800" variant="default">
                                    <FileText className="mr-3 h-5 w-5" />
                                    Convertir a Factura
                                </Button>

                                <Button onClick={handleDownload} disabled={!blobUrl && isGenerating} className="w-full justify-start h-12" variant="outline">
                                    <Download className="mr-3 h-5 w-5" />
                                    {isGenerating && !blobUrl ? "Generando..." : "Imprimir / Descargar"}
                                </Button>

                                <Button onClick={handleShare} disabled={!blobUrl && isGenerating} className="w-full justify-start h-12" variant="outline">
                                    <Share2 className="mr-3 h-5 w-5" />
                                    {isGenerating && !blobUrl ? "Preparando..." : "Compartir"}
                                </Button>

                                {/* Exit Action */}
                                <Button onClick={() => {
                                    onOpenChange?.(false)
                                    // If we are in the receipts dialog, we likely want to go back to the list
                                    router.push('/budgets')
                                }} className="w-full justify-start h-12 text-slate-500 hover:text-slate-700 font-normal" variant="ghost">
                                    <ArrowLeft className="mr-3 h-5 w-5" />
                                    Salir
                                </Button>
                            </div>
                        </div>

                        {/* Optional: Add details summary later if needed */}
                        <div className="mt-auto pt-6 border-t">
                            <div className="text-xs text-center text-slate-400">
                                Documento generado el {new Date().toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
