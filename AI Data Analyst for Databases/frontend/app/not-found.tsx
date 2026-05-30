import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="max-w-md text-center space-y-4">
        <div className="text-6xl font-bold text-[hsl(var(--primary))]">404</div>
        <p className="text-lg text-[hsl(var(--foreground))]">Page not found</p>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-block rounded-md bg-[hsl(var(--primary))] px-4 py-2 text-sm text-[hsl(var(--primary-foreground))] hover:opacity-90 transition"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
