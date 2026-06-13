"use client";

import { Button } from "@/components/ui/Button";
import { FadeIn } from "@/components/ui/FadeIn";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useLanguage } from "@/contexts/LanguageContext";
import { COMPANY, CONTACT_SERVICES } from "@/lib/constants";
import { Mail, MapPin, Phone, User } from "lucide-react";
import { FormEvent, useState } from "react";

export function Contact() {
  const { t } = useLanguage();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    setSuccessMsg("");

    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      phone: (form.elements.namedItem("phone") as HTMLInputElement).value,
      service: (form.elements.namedItem("service") as HTMLSelectElement).value,
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value,
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error ?? "Failed to send message");
      }

      setStatus("success");
      setSuccessMsg(result.message ?? t.contact.success);
      form.reset();
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <section id="contact" className="bg-white py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <SectionHeading
          subtitle={t.contact.subtitle}
          title={t.contact.title}
          description={t.contact.description}
        />

        <div className="grid gap-12 lg:grid-cols-2">
          <FadeIn direction="left">
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-gold/30 bg-gold/5">
                  <User size={20} className="text-gold" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-medium">
                    {t.contact.owner}
                  </p>
                  <p className="mt-1 font-serif text-lg text-black">
                    {COMPANY.owner}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-gold/30 bg-gold/5">
                  <Mail size={20} className="text-gold" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-medium">
                    {t.contact.email}
                  </p>
                  <a
                    href={`mailto:${COMPANY.email}`}
                    className="mt-1 block font-serif text-lg text-black hover:text-gold"
                  >
                    {COMPANY.email}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-gold/30 bg-gold/5">
                  <Phone size={20} className="text-gold" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-medium">
                    {t.contact.phone}
                  </p>
                  <a
                    href={COMPANY.phoneTel}
                    className="mt-1 block font-serif text-lg text-black hover:text-gold"
                  >
                    {COMPANY.phone}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-gold/30 bg-gold/5">
                  <MapPin size={20} className="text-gold" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-medium">
                    {t.contact.address}
                  </p>
                  <p className="mt-1 font-serif text-lg text-black">
                    {COMPANY.address}
                  </p>
                </div>
              </div>
            </div>
          </FadeIn>

          <FadeIn direction="right" delay={0.2}>
            <form onSubmit={handleSubmit} className="space-y-5 border border-gray-200 p-8">
              <Input name="name" label={t.contact.yourName} required placeholder={t.contact.placeholderName} />
              <Input
                name="email"
                label={t.contact.emailAddress}
                type="email"
                required
                placeholder={t.contact.placeholderEmail}
              />
              <Input
                name="phone"
                label={t.contact.phoneNumber}
                type="tel"
                required
                placeholder={t.contact.placeholderPhone}
              />
              <Select
                name="service"
                label={t.contact.serviceInterest}
                options={CONTACT_SERVICES}
              />
              <Textarea
                name="message"
                label={t.contact.message}
                required
                rows={5}
                placeholder={t.contact.placeholderMessage}
              />

              {status === "success" && (
                <p className="text-sm text-green-600">{successMsg || t.contact.success}</p>
              )}
              {status === "error" && (
                <p className="text-sm text-red-500">{errorMsg}</p>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={status === "loading"}
              >
                {status === "loading" ? t.contact.sending : t.contact.send}
              </Button>

              <p className="border-t border-gray-200 pt-5 text-center text-sm text-gray-medium">
                {t.contact.quotationCta}{" "}
                <a href="#get-quote" className="font-medium text-gold hover:underline">
                  {t.contact.quotationLink}
                </a>
              </p>
            </form>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
