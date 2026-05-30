export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading...</p>
      </div>
    </div>
  );
}
