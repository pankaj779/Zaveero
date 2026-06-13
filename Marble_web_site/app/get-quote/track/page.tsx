import { Suspense } from "react";
import { TrackQuoteClient } from "./TrackQuoteClient";

export default function TrackQuotePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 pt-24" />}>
      <TrackQuoteClient />
    </Suspense>
  );
}
