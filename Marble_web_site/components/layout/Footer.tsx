import { Logo } from "@/components/brand/Logo";
import { COMPANY, NAV_LINKS, SERVICES } from "@/lib/constants";
import { Globe, Mail, MapPin, MessageCircle, Phone, Share2 } from "lucide-react";
import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-black text-white">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 md:grid-cols-2 lg:grid-cols-4 md:px-8">
        <div>
          <Logo theme="light" />
          <p className="mt-4 text-sm leading-relaxed text-gray-400">
            {COMPANY.description}
          </p>
          <div className="mt-6 flex gap-4">
            <a
              href="#"
              aria-label="Social media"
              className="text-gray-400 transition-colors hover:text-gold"
            >
              <Share2 size={20} />
            </a>
            <a
              href="#"
              aria-label="Website"
              className="text-gray-400 transition-colors hover:text-gold"
            >
              <Globe size={20} />
            </a>
            <a
              href={COMPANY.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="text-gray-400 transition-colors hover:text-gold"
            >
              <MessageCircle size={20} />
            </a>
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            Quick Links
          </h3>
          <ul className="space-y-2">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-sm text-gray-400 transition-colors hover:text-gold"
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href="#get-quote"
                className="text-sm text-gray-400 transition-colors hover:text-gold"
              >
                Get Quote
              </a>
            </li>
            <li>
              <Link
                href="/get-quote/track"
                className="text-sm text-gray-400 transition-colors hover:text-gold"
              >
                Track Quote
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            Our Services
          </h3>
          <ul className="space-y-2">
            {SERVICES.slice(0, 6).map((service) => (
              <li key={service.title}>
                <span className="text-sm text-gray-400">{service.title}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            Contact
          </h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3 text-sm text-gray-400">
              <MapPin size={16} className="mt-0.5 shrink-0 text-gold" />
              {COMPANY.address}
            </li>
            <li className="flex items-center gap-3 text-sm text-gray-400">
              <Phone size={16} className="shrink-0 text-gold" />
              <a href={COMPANY.phoneTel} className="hover:text-gold">
                {COMPANY.phone}
              </a>
            </li>
            <li className="flex items-center gap-3 text-sm text-gray-400">
              <MessageCircle size={16} className="shrink-0 text-gold" />
              <a href={COMPANY.whatsapp} target="_blank" rel="noopener noreferrer" className="hover:text-gold">
                WhatsApp
              </a>
            </li>
            <li className="flex items-center gap-3 text-sm text-gray-400">
              <Mail size={16} className="shrink-0 text-gold" />
              <a href={`mailto:${COMPANY.email}`} className="hover:text-gold">
                {COMPANY.email}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-800">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 text-center text-xs text-gray-500 md:flex-row md:px-8 md:text-left">
          <p>
            &copy; {currentYear} {COMPANY.name}. All rights reserved.
          </p>
          <p>
            Owned by {COMPANY.owner}{" "}
            <Link href="/admin/login" className="ml-2 text-gray-600 hover:text-gold">
              Owner
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
