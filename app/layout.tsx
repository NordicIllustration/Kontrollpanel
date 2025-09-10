// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// app/layout.tsx
import Script from "next/script";
// import CastInit from "@/components/CastInit";    // ⬅️ ta bort denna
import CastInitGate from "@/components/CastInitGate"; // ⬅️ lägg till denna

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body>
        <Script
          src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1"
          strategy="afterInteractive"
        />
        {/* Kör inte CastInit på /display, bara på övriga sidor */}
        <CastInitGate />

        {children}
      </body>
    </html>
  );
}
