import type { Metadata, Viewport } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

// The ultimate neominimalist/brutalist font
const spaceGrotesk = Space_Grotesk({
  variable: "--font-geist-sans", // Keeping the original variable name so Tailwind picks it up automatically!
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

// A premium, technical monospace font
const jetbrainsMono = JetBrains_Mono({
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
  
  metadataBase: new URL("https://exam-result-optimization.vercel.app"),
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
      className={`${jetbrainsMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-rose-50 text-black">
        {/* GLOBAL NAVBAR */}
        <nav className="w-full bg-white border-b-[3px] border-black p-4 md:px-8 flex justify-between items-center z-10 sticky top-0 shadow-sm">
          <Link href="/" className="text-2xl font-black tracking-tighter">
            ExamPortal<span className="text-gray-400">.</span>
          </Link>
          <div className="space-x-6 text-sm uppercase tracking-wider">
            <Link href="/" className="hover:text-gray-500 transition-colors">Home</Link>
            <Link href="/about" className="hover:text-gray-500 transition-colors">About </Link>
          </div>
        </nav>

        {/* PAGE CONTENT */}
        <div className="flex-1">
          {children}
        </div>

        {/* GLOBAL FOOTER */}
        <footer className="w-full grid grid-cols-1 gap-4 md:grid-cols-2 bg-black text-white p-8 text-center mt-auto border-t-[3px] border-black">
          <div>
          <p className="font-bold text-sm tracking-wider">
            © {new Date().getFullYear()} ExamPortal Research Project.
          </p>
          <p className="text-gray-400  text-xs mt-2 font-medium">
            Built with CQRS, Next.js, and Redis Edge Caching.
          </p>
          </div>
          <div >
          <p className="font-bold text-sm tracking-wider">
            Buit with curiosity
          </p>
          <p className="text-gray-400 text-xs mt-2 font-medium">
            Developer : Md Danish Raza
          </p>
          </div>
        </footer>
      </body>
    </html>
  );
}