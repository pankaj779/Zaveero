"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PRICING_CATEGORIES, PRICING_TABS } from "@/lib/constants";
import type { PricingItemRecord } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type PricingEditorProps = {
  items: PricingItemRecord[];
  onItemsChange?: (items: PricingItemRecord[]) => void;
  embedded?: boolean;
};

export function PricingEditor({
  items: initialItems,
  onItemsChange,
  embedded = false,
}: PricingEditorProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [materialTab, setMaterialTab] = useState("with_material");
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const [form, setForm] = useState({
    itemName: "",
    unit: "SFT",
    rate: "",
    category: "marble",
  });

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  function updateItems(next: PricingItemRecord[]) {
    setItems(next);
    onItemsChange?.(next);
  }

  const filtered = items.filter((i) => i.materialType === materialTab);

  async function handleSave() {
    if (!form.itemName.trim()) {
      setMessage({ type: "error", text: "Item name is required." });
      return;
    }
    if (!form.rate || isNaN(parseFloat(form.rate))) {
      setMessage({ type: "error", text: "Valid rate is required." });
      return;
    }

    setLoading(true);
    setMessage(null);

    const payload = {
      ...form,
      materialType: materialTab,
      rate: parseFloat(form.rate),
    };

    try {
      if (editing) {
        const res = await fetch("/api/pricing", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ id: editing, ...payload }),
        });
        if (!res.ok) throw new Error("Failed to update item");
        const updated = await res.json();
        updateItems(items.map((i) => (i.id === editing ? updated : i)));
        setMessage({ type: "success", text: "Item updated — live on website now!" });
      } else {
        const res = await fetch("/api/pricing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to add item");
        const created = await res.json();
        updateItems([...items, created]);
        setMessage({ type: "success", text: "New item added — live on website now!" });
      }

      setEditing(null);
      setForm({ itemName: "", unit: "SFT", rate: "", category: "marble" });
      if (!embedded) router.refresh();
    } catch {
      setMessage({
        type: "error",
        text: "Failed to save. Please login first using the form above.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this pricing item?")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/pricing", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      updateItems(items.filter((i) => i.id !== id));
      setMessage({ type: "success", text: "Item deleted." });
      if (!embedded) router.refresh();
    } catch {
      setMessage({ type: "error", text: "Failed to delete. Please login first." });
    } finally {
      setLoading(false);
    }
  }

  function startEdit(item: PricingItemRecord) {
    setEditing(item.id);
    setForm({
      itemName: item.itemName,
      unit: item.unit,
      rate: String(item.rate),
      category: item.category,
    });
    setMessage(null);
  }

  return (
    <div className={embedded ? "" : "mt-8"}>
      <div className="mb-6 flex flex-wrap gap-2">
        {PRICING_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => {
              setMaterialTab(tab.value);
              setMessage(null);
            }}
            className={`px-4 py-2 text-sm font-medium ${
              materialTab === tab.value
                ? "bg-gold text-black"
                : "border border-gray-300 hover:border-gold"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mb-8 border-2 border-gold bg-white p-6 shadow-sm">
        <h3 className="mb-1 flex items-center gap-2 font-serif text-lg font-semibold text-black">
          <Plus size={18} className="text-gold" />
          {editing ? "Edit Item / संपादित करें" : "Add New Item / नया आइटम जोड़ें"}
        </h3>
        <p className="mb-4 text-sm text-gray-medium">
          Fill in Item Name, Unit (SFT/RFT/SQM), Rate (₹), and Category — then click Add Item.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Input
            label="Item Name / वस्तु का नाम"
            value={form.itemName}
            onChange={(e) => setForm({ ...form, itemName: e.target.value })}
            placeholder="Marble Flooring"
          />
          <Input
            label="Unit / इकाई"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
            placeholder="SFT"
          />
          <Input
            label="Rate ₹ / दर"
            type="number"
            min="0"
            step="0.01"
            value={form.rate}
            onChange={(e) => setForm({ ...form, rate: e.target.value })}
            placeholder="120"
          />
          <div>
            <label className="mb-2 block text-sm font-medium text-charcoal">
              Category / श्रेणी
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full border border-gray-300 bg-white px-4 py-3 text-sm"
            >
              {PRICING_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Saving..." : editing ? "Update" : "+ Add Item"}
            </Button>
          </div>
        </div>
        {editing && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => {
              setEditing(null);
              setForm({ itemName: "", unit: "SFT", rate: "", category: "marble" });
              setMessage(null);
            }}
          >
            Cancel
          </Button>
        )}
        {message && (
          <p
            className={`mt-4 text-sm font-medium ${message.type === "success" ? "text-green-600" : "text-red-500"}`}
          >
            {message.text}
          </p>
        )}
      </div>

      {PRICING_CATEGORIES.map((cat) => {
        const catItems = filtered.filter((i) => i.category === cat.value);

        return (
          <div key={cat.value} className="mb-6 border border-gray-200 bg-white">
            <div className="border-b bg-charcoal px-4 py-3 font-semibold text-white">
              {cat.label}
              <span className="ml-2 text-xs font-normal text-gray-300">
                ({catItems.length} items)
              </span>
            </div>
            {catItems.length === 0 ? (
              <p className="p-4 text-sm text-gray-medium">
                No items yet — use the form above to add {cat.label.toLowerCase()} rates.
              </p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-medium">
                    <th className="px-4 py-2">Item</th>
                    <th className="px-4 py-2">Unit</th>
                    <th className="px-4 py-2">Rate</th>
                    <th className="px-4 py-2">Edit / Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {catItems.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{item.itemName}</td>
                      <td className="px-4 py-3 text-sm">{item.unit}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gold-dark">
                        {formatCurrency(item.rate)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(item)}
                            className="rounded border border-gray-300 px-2 py-1 text-xs hover:border-gold hover:text-gold"
                          >
                            <Pencil size={14} className="inline" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="rounded border border-gray-300 px-2 py-1 text-xs hover:border-red-500 hover:text-red-500"
                          >
                            <Trash2 size={14} className="inline" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
}
