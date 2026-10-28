import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";
import { InstallPrompt, UpdateBanner } from "@/components/pwa";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-local",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Scott English Academy — Inglês para quem quer FALAR",
    template: "%s | Scott English Academy",
  },
  description:
    "Plataforma completa de ensino de inglês: aulas gravadas, aulas ao vivo, aulas particulares, provas e acompanhamento de progresso.",
  keywords: ["inglês", "curso de inglês", "conversação", "Scott English Academy"],
  manifest: "/manifest.webmanifest",
  applicationName: "Scott English Academy",
  appleWebApp: {
    capable: true,
    title: "Scott English",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: [{ url: "/icons/icon-96.png", sizes: "96x96" }],
  },
  openGraph: {
    title: "Scott English Academy",
    description: "Inglês para quem quer FALAR. Do básico à fluência.",
    type: "website",
    images: [{ url: "/brand/icon-512.jpg", width: 512, height: 512 }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${mono.variable} min-h-screen bg-canvas text-default antialiased`}
      >
        <ThemeProvider>
          {children}
          <Toaster />
          <ServiceWorkerRegistrar />
          <InstallPrompt />
          <UpdateBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}
