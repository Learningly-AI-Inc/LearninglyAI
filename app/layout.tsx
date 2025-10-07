import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import "@/components/writing/editor-styles.css"; // Import the editor styles
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";
import { GlobalLoadingProvider } from "@/hooks/use-global-loading";
import { GlobalSync } from "@/components/global-sync";
import { ToastProvider } from "@/hooks/use-toast";

const fontSans = Inter({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

const fontHeading = Inter({
  subsets: ["latin"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: {
    default: "Learningly - Smarter Learning Platform",
    template: "%s | Learningly",
  },
  description:
    "Generate interactive study materials like summaries, quizzes, and flashcards from your documents and videos.",
  keywords: [
    "learning assistant",
    "study tools",
    "quiz generator",
    "summary generator",
    "flashcard maker",
    "e-learning",
    "edtech",
  ],
  authors: [{ name: "Learningly Team" }],
  creator: "Learningly",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "Learningly - Smarter Learning Platform",
    description:
      "Transform your study materials into interactive content.",
    siteName: "Learningly",
    images: [
      {
        url: "/learningly_logo.jpg",
        width: 1200,
        height: 630,
        alt: "Learningly Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Learningly - Smarter Learning Platform",
    description:
      "Generate quizzes, summaries, and flashcards in seconds with Learningly.",
    creator: "@learninglyai",
    images: ["/learningly_logo.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={cn(fontSans.variable, fontHeading.variable)}
      suppressHydrationWarning
    >
      <head>
        {/* Use standard 1.0 scale for better 13" laptop rendering and allow scaling */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="icon" href="/learningly_logo.jpg" type="image/jpeg" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/learningly_logo.jpg" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.className,
        )}
        suppressHydrationWarning
      >
        <GlobalLoadingProvider>
          <ToastProvider>
            <GlobalSync />
            <div className="relative flex min-h-screen flex-col">
              <Suspense fallback={null}>
                <div className="flex-1">{children}</div>
              </Suspense>
            </div>
            <Toaster />
          </ToastProvider>
        </GlobalLoadingProvider>
      </body>
    </html>
  );
}
