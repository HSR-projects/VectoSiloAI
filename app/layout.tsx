import type { Metadata, Viewport } from "next";
import "highlight.js/styles/github-dark.css";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { AuthGate } from "@/components/auth/AuthGate";

export const metadata: Metadata = {
  title: "Incogni AI — Private AI Search & Code",
  description:
    "Privacy-first AI search, chat, and coding engine by Incogni AI. 100% Zero-Data-Leak Privacy.",
  icons: { icon: "/incogni-logo.svg" },
};

// `viewport-fit=cover` lets the app extend under the iOS notch/home indicator so
// our `env(safe-area-inset-*)` padding can keep content clear of them.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#212121",
};

import { ThemeProvider } from "next-themes";
import { GlobalModals } from "@/components/layout/GlobalModals";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark">
          <AuthProvider>
            <TooltipProvider delayDuration={150}>
              <AuthGate>
                {children}
                <GlobalModals />
              </AuthGate>
            </TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
