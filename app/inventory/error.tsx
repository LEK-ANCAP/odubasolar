'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">Algo salió mal en el inventario</h2>
            <p className="text-slate-500 max-w-md text-center bg-slate-100 p-4 rounded-md font-mono text-xs">
                {error.message || "Error desconocido"}
            </p>
            <Button
                onClick={
                    // Attempt to recover by trying to re-render the segment
                    () => reset()
                }
            >
                Intentar de nuevo
            </Button>
        </div>
    )
}
