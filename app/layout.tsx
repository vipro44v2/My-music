import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin", "latin-ext"],
  variable: "--font-geist",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "My Chilling",
  description: "Relax with music and calming moods",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${geist.variable} ${geistMono.variable} h-full`} suppressHydrationWarning>
      <body className="h-full overflow-hidden antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
