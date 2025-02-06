import type { Metadata } from "next"
import type React from "react"; // Import React
import "./globals.css"

export const metadata: Metadata = {
  title: "Student Dashboard",
  description: "AI-driven academic advisor dashboard",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

