"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <SessionProvider>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
