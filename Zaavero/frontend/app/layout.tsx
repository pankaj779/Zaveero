import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import { Providers } from "@/components/providers";
import { BRAND } from "@/lib/brand";
import "@/styles/globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: BRAND.metaTitle,
  description: BRAND.metaDescription,
  metadataBase: new URL("https://zaavero.com"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={jakarta.variable}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
