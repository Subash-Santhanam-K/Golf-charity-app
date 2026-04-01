import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });

export const metadata: Metadata = {
  title: "Play Your Shot | Charity Platform",
  description: "Every round you play helps change lives.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} min-h-screen antialiased relative overflow-x-hidden`}>
        {/* Environmental sunlight and floating nodes representing open golf spaces */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]">
           <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#86EFAC] bg-opacity-30 rounded-full blur-[120px] mix-blend-multiply opacity-50 animate-pulse"></div>
           <div className="absolute top-[30%] right-[-10%] w-[40%] h-[40%] bg-[#38BDF8] bg-opacity-20 rounded-full blur-[140px] mix-blend-multiply opacity-50"></div>
           <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[40%] bg-[#FEF08A] bg-opacity-30 rounded-full blur-[150px] mix-blend-multiply opacity-40"></div>
        </div>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
