
"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { InvoicePDF } from "./invoice-pdf"
import { pdf } from "@react-pdf/renderer"
import { Invoice } from "@/hooks/use-invoices-store"
import { useSettingsStore } from "@/hooks/use-settings-store"
import { Share2, Download, Loader2, ArrowLeft, DollarSign } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { PaymentDialog } from "./payment-dialog"

interface InvoiceReceiptDialogProps {
    invoice: Invoice
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function InvoiceReceiptDialog({ invoice, trigger, open, onOpenChange }: InvoiceReceiptDialogProps) {
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
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)

    useEffect(() => {
        if (open) {
            const generatePreview = async () => {
                try {
                    const blob = await pdf(<InvoicePDF invoice={invoice} settings={settings} />).toBlob()
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
    }, [open, invoice])

    const handleDownload = async () => {
        if (blobUrl) {
            const link = document.createElement('a')
            link.href = blobUrl
            link.download = `Factura-${invoice.id}.pdf`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            toast.success("PDF descargado correctamente")
            return
        }

        setIsGenerating(true)
        try {
            const blob = await pdf(<InvoicePDF invoice={invoice} settings={settings} />).toBlob()
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `Factura-${invoice.id}.pdf`
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
                blob = await pdf(<InvoicePDF invoice={invoice} settings={settings} />).toBlob()
            }

            const file = new File([blob], `Factura-${invoice.id}.pdf`, { type: 'application/pdf' })

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: `Factura ${invoice.id}`,
                    text: `Adjunto factura ${invoice.id} de ${companyName}`,
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
                    <DialogTitle>Vista Previa de la Factura</DialogTitle>
                </DialogHeader>

                <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-100">
                    {/* Preview Section */}
                    <div className="flex-1 overflow-hidden relative flex items-center justify-center p-4">
                        {blobUrl ? (
                            <iframe
                                src={blobUrl}
                                className="w-full h-full rounded-lg shadow-sm bg-white"
                                title="Vista previa de la factura"
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
                                <Button onClick={handleDownload} disabled={!blobUrl && isGenerating} className="w-full justify-start h-12" variant="default">
                                    <Download className="mr-3 h-5 w-5" />
                                    {isGenerating && !blobUrl ? "Generando..." : "Imprimir / Descargar"}
                                </Button>

                                <Button onClick={handleShare} disabled={isGenerating} className="w-full justify-start h-12" variant="outline">
                                    <Share2 className="mr-3 h-5 w-5" />
                                    {isGenerating ? "Compartiendo..." : "Compartir"}
                                </Button>

                                <Button onClick={() => setIsPaymentDialogOpen(true)} className="w-full justify-start h-12" variant="outline">
                                    <DollarSign className="mr-3 h-5 w-5" />
                                    Registrar Pago
                                </Button>

                                <Button onClick={() => onOpenChange?.(false)} className="w-full justify-start h-12" variant="ghost">
                                    <ArrowLeft className="mr-3 h-5 w-5" />
                                    Salir
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>

            <PaymentDialog
                invoiceId={invoice.id}
                totalAmount={invoice.total}
                remainingBalance={invoice.total - (invoice.payments?.reduce((sum, p) => sum + p.amount, 0) || 0)}
                currency={invoice.currency}
                open={isPaymentDialogOpen}
                onOpenChange={setIsPaymentDialogOpen}
                onPaymentSuccess={() => {
                    setIsPaymentDialogOpen(false)
                    // Recalculate or refresh? The invoice object won't update automatically here unless parent updates it.
                    // But router.refresh() might trigger a re-fetch in parent.
                    router.refresh()
                    toast.success("Pago registrado. La vista previa se actualizará al recargar.")
                }}
            />
        </Dialog >
    )
}
