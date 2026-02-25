import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Oduba Solar | Admin",
  description: "Panel de administración de Oduba Solar.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Oduba Solar",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: "#0f172a",
}

import { OfflineIndicator } from "@/components/offline-indicator";
import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${outfit.variable} ${inter.variable} font-sans antialiased bg-background text-foreground`}
      >
        <div className="flex h-screen bg-sidebar overflow-hidden font-sans text-slate-800">
          {/* Sidebar - sits on the bone white background */}
          <div className="hidden md:block h-full shrink-0 z-20">
            <AdminSidebar />
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col h-full relative overflow-hidden">
            {/* Header - sits on the bone white background */}
            <div className="shrink-0 bg-sidebar z-10">
              <AdminHeader />
            </div>

            {/* Content Card Wrapper */}
            {/* We create a "floating" feel for the page content */}
            <div className="flex-1 overflow-hidden px-2 md:px-3 pb-2 md:pb-3 pt-1">
              <main className="h-full w-full bg-white rounded-2xl border border-slate-200/60 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] overflow-y-auto relative">
                {/* Inner padding for the content */}
                <div className="p-4 md:p-6 min-h-full">
                  {children}
                </div>
              </main>
            </div>

            <OfflineIndicator />
          </div>
        </div>

        <Toaster />
      </body>
    </html>
  );
}
