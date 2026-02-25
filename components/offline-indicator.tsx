"use client"

import { useEffect, useState } from "react"
import { WifiOff, RotateCw, X, AlertOctagon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSyncStore } from "@/hooks/use-sync-store"

export function OfflineIndicator() {
    const [isOffline, setIsOffline] = useState(false)
    const { isSyncing, queue, setOnlineStatus, purgeStaleEntries, clearQueue, processQueue, isSessionExpired } = useSyncStore()

    useEffect(() => {
        // Clean up stale failed actions from previous sessions
        purgeStaleEntries()

        // If there are pending items, try to process them now
        if (queue.length > 0 && navigator.onLine) {
            processQueue()
        }

        function handleOnline() {
            setIsOffline(false)
            setOnlineStatus(true)
        }

        function handleOffline() {
            setIsOffline(true)
            setOnlineStatus(false)
        }

        // Set initial state
        setIsOffline(!navigator.onLine)
        setOnlineStatus(navigator.onLine)

        window.addEventListener("online", handleOnline)
        window.addEventListener("offline", handleOffline)

        return () => {
            window.removeEventListener("online", handleOnline)
            window.removeEventListener("offline", handleOffline)
        }
    }, [setOnlineStatus, purgeStaleEntries, processQueue])

    if (!isOffline && queue.length === 0 && !isSessionExpired) return null

    if (isSessionExpired && queue.length > 0) {
        return (
            <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border transition-all duration-300 bg-red-50 border-red-200 text-red-800">
                <AlertOctagon className="h-5 w-5 shrink-0" />
                <div className="flex flex-col">
                    <span className="font-medium text-sm">Sesión expirada</span>
                    <span className="text-xs opacity-90 max-w-xs">
                        Tienes {queue.length} cambio{queue.length !== 1 ? 's' : ''} pendiente{queue.length !== 1 ? 's' : ''}. Por favor, <a href="/login" className="underline font-medium hover:text-red-900">inicia sesión</a> para guardarlos.
                    </span>
                </div>
            </div>
        )
    }

    return (
        <div className={cn(
            "fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border transition-all duration-300",
            isOffline ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-blue-50 border-blue-200 text-blue-800"
        )}>
            {isOffline ? (
                <>
                    <WifiOff className="h-5 w-5" />
                    <div className="flex flex-col">
                        <span className="font-medium text-sm">Sin conexión</span>
                        <span className="text-xs opacity-80">
                            {queue.length > 0
                                ? `${queue.length} cambio${queue.length !== 1 ? 's' : ''} pendiente${queue.length !== 1 ? 's' : ''} de sincronización`
                                : "Los cambios se guardarán localmente"
                            }
                        </span>
                    </div>
                </>
            ) : (
                <>
                    <RotateCw className={cn("h-5 w-5", isSyncing && "animate-spin")} />
                    <div className="flex flex-col">
                        <span className="font-medium text-sm">Sincronizando...</span>
                        <span className="text-xs opacity-80">
                            Procesando {queue.length} cambio{queue.length !== 1 ? 's' : ''} pendiente{queue.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                    {/* Manual clear button in case the queue gets stuck */}
                    <button
                        onClick={() => clearQueue()}
                        title="Limpiar cola de sincronización"
                        className="ml-1 p-1 rounded hover:bg-blue-100 transition-colors opacity-60 hover:opacity-100"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </>
            )}
        </div>
    )
}
