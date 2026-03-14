import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/providers/query-provider";
import { SwRegisterGlobal } from "@/components/sw-register-global";
import { AxeDev } from "@/components/axe-dev";
import "./globals.css";
import { TooltipProvider } from "@comtammatu/ui";

export const metadata: Metadata = {
  title: "Cơm tấm Má Tư - CRM",
  description: "Restaurant management system for Cơm tấm Má Tư chain",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#09090b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : null;

  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        {supabaseHost && (
          <>
            <link rel="dns-prefetch" href={`//${supabaseHost}`} />
            <link rel="preconnect" href={supabaseUrl!} crossOrigin="anonymous" />
          </>
        )}
      </head>
      <body>
        <ThemeProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-foreground focus:shadow-lg focus:ring-2 focus:ring-ring"
          >
            Bỏ qua đến nội dung chính
          </a>
          <SwRegisterGlobal />
          <AxeDev />
          <QueryProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
