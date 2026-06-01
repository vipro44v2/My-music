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
  title: "Gibli Chill",
  description: "Chill with Ghibli melodies",
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
