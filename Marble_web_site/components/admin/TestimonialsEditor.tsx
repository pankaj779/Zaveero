"use client";

import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import type { TestimonialRecord } from "@/lib/types";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";

type TestimonialsEditorProps = {
  initial: TestimonialRecord[];
};

export function TestimonialsEditor({ initial }: TestimonialsEditorProps) {
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", role: "", quote: "", rating: 5 });

  async function handleSave() {
    const payload = { ...form, rating: Number(form.rating) };

    if (editing) {
      const res = await fetch("/api/testimonials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: editing, ...payload }),
      });
      const updated = await res.json();
      setItems((prev) => prev.map((i) => (i.id === editing ? updated : i)));
    } else {
      const res = await fetch("/api/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const created = await res.json();
      setItems((prev) => [...prev, created]);
    }

    setEditing(null);
    setForm({ name: "", role: "", quote: "", rating: 5 });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this testimonial?")) return;
    await fetch("/api/testimonials", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id }),
    });
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleApprove(id: string) {
    const res = await fetch(`/api/testimonials/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "approve" }),
    });
    const updated = await res.json();
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
  }

  async function handleReject(id: string) {
    if (!confirm("Reject and delete this review?")) return;
    await fetch(`/api/testimonials/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "reject" }),
    });
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function startEdit(item: TestimonialRecord) {
    setEditing(item.id);
    setForm({
      name: item.name,
      role: item.role,
      quote: item.quote,
      rating: item.rating,
    });
  }

  const pending = items.filter((i) => i.status === "pending");
  const approved = items.filter((i) => i.status !== "pending");

  return (
    <div>
      {pending.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-amber-700">
            Pending client reviews ({pending.length})
          </h3>
          <div className="space-y-4">
            {pending.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between border border-amber-200 bg-amber-50 p-4"
              >
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-gold">{item.role}</p>
                  <p className="text-xs text-gray-medium">
                    {item.rating}/5 stars ·{" "}
                    {new Date(item.createdAt).toLocaleString("en-IN")}
                  </p>
                  <p className="mt-2 text-sm text-gray-medium italic">
                    &ldquo;{item.quote}&rdquo;
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleApprove(item.id)}
                    className="flex items-center gap-1 text-sm text-green-700 hover:underline"
                  >
                    <Check size={16} /> Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(item.id)}
                    className="flex items-center gap-1 text-sm text-red-600 hover:underline"
                  >
                    <X size={16} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-8 border border-gray-200 p-4">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider">
          {editing ? "Edit Testimonial" : "Add Testimonial (shows immediately)"}
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          />
          <div className="md:col-span-2">
            <Textarea
              label="Quote"
              rows={3}
              value={form.quote}
              onChange={(e) => setForm({ ...form, quote: e.target.value })}
            />
          </div>
          <Input
            label="Rating (1-5)"
            type="number"
            min={1}
            max={5}
            value={form.rating}
            onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
          />
        </div>
        <div className="mt-4 flex gap-2">
          <Button type="button" variant="primary" size="sm" onClick={handleSave}>
            {editing ? "Update" : "Add"}
          </Button>
          {editing && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditing(null);
                setForm({ name: "", role: "", quote: "", rating: 5 });
              }}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider">Published</h3>
        {approved.map((item) => (
          <div key={item.id} className="flex items-start justify-between border border-gray-200 p-4">
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-xs text-gold">{item.role}</p>
              <p className="mt-2 text-sm text-gray-medium italic">
                &ldquo;{item.quote}&rdquo;
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => startEdit(item)}
                className="text-gray-medium hover:text-gold"
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="text-gray-medium hover:text-red-500"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
