import { PricingEditor } from "@/components/admin/PricingEditor";
import { requireAdmin } from "@/lib/admin-auth";
import { getPricingItems } from "@/lib/data";

export default async function AdminPricingPage() {
  await requireAdmin();

  const items = await getPricingItems();

  return (
    <div className="p-6 md:p-10">
      <h1 className="font-serif text-3xl font-semibold text-black">
        Pricing / दर सूची
      </h1>
      <p className="mt-1 text-sm text-gray-medium">
        Add new items or edit item name, unit (SFT/RFT/SQM), and rate (₹) for Marble, Granite &
        Tiles — with or without material.
      </p>
      <div className="mt-4 rounded border border-gold/30 bg-gold/5 px-4 py-3 text-sm text-gray-medium">
        <strong className="text-black">How to use:</strong> Select With/Without Material tab → fill
        the gold form → choose category (Marble/Granite/Tile) → click <strong>+ Add Item</strong>.
        Use <strong>Edit</strong> on any row to update rates.
      </div>
      <div className="mt-8">
        <PricingEditor items={items} />
      </div>
    </div>
  );
}
