import type { Metadata } from "next";

import { Providers } from "@/app/providers";

import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "DataWhisper",
  description: "Natural language to SQL, safe execution, and charts for your databases.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
