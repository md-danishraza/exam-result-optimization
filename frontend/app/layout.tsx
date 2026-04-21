import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// separate viewport settings from general metadata
export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Prevents zooming input fields on mobile
};

export const metadata: Metadata = {
  
  metadataBase: new URL("https://your-exam-portal-url.vercel.app"),
  title: {
    default: "ExamPortal | Fast & Secure Result Checking",
    template: "%s | ExamPortal",
  },
  description: "Check your examination results instantly. Built on a high-concurrency, edge-cached architecture for zero downtime during peak traffic.",
  keywords: ["exam results", "student portal", "board results", "university results", "fast results"],
  authors: [{ name: "Md Danish Raza" }],
  creator: "Md Danish Raza",
  publisher: "ExamPortal Inc.",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    title: "ExamPortal | Fast & Secure Result Checking",
    description: "Check your examination results instantly with zero downtime.",
    siteName: "ExamPortal",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "ExamPortal Dashboard preview",
      },
    ],
  },
 
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50 text-black">
        {children}
      </body>
    </html>
  );
}