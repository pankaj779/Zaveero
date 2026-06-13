"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Logo } from "@/components/brand/Logo";
import { COMPANY } from "@/lib/constants";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { FormEvent, useState } from "react";

export function AdminLoginForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid owner email or password");
      setLoading(false);
      return;
    }

    window.location.href = "/admin";
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-charcoal px-4 py-10">
      <div className="w-full max-w-md border border-gray-700 bg-black p-8">
        <div className="mb-8 flex justify-center">
          <Logo theme="light" />
        </div>

        <h1 className="mb-2 text-center font-serif text-2xl text-white">Owner Login</h1>
        <p className="mb-6 text-center text-xs text-gray-400">
          Manage photos, rates, and quotation submissions.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            name="email"
            label="Owner Email"
            type="email"
            required
            defaultValue={COMPANY.email}
          />
          <Input name="password" label="Password" type="password" required />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-500">
          <Link href="/" className="hover:text-gold">
            ← Back to website
          </Link>
        </p>
      </div>
    </div>
  );
}
