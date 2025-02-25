import type { Metadata } from "next";
import type React from "react"; // Import React
import "./globals.css";

export const metadata: Metadata = {
  title: "Advisor MVP",
  description: "Your personal academic advisor",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}

