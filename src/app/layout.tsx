import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SigmaMail | Your Campus Inbox, Under Control",
  description:
    "SigmaMail organizes your college emails into clear categories, highlights important announcements, tracks deadlines, and groups placement opportunities in one workspace.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-[#F7F8F4] text-[#252923] antialiased selection:bg-[#E5EBE1] selection:text-[#244A3A]`}>
        {children}
      </body>
    </html>
  );
}
