"use client";

import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="max-w-md text-center space-y-4">
        <div className="text-4xl">Something went wrong</div>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          {error.message || "An unexpected error occurred."}
        </p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
