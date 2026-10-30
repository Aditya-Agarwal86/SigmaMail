import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

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
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const app = localStorage.getItem('sigmamail_appearance') || 'system';
                const theme = localStorage.getItem('sigmamail_theme') || 'sigma-green';
                const isDark = app === 'dark' || (app === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (isDark) document.documentElement.classList.add('dark');
                document.documentElement.setAttribute('data-theme', theme);
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`${inter.className} h-full bg-background text-foreground antialiased selection:bg-secondary selection:text-secondary-foreground transition-colors duration-200`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
