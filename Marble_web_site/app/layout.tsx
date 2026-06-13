import { Providers } from "@/components/Providers";
import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { COMPANY } from "@/lib/constants";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: `${COMPANY.name} | Premium Marble, Granite & Tile Contractor`,
    template: `%s | ${COMPANY.name}`,
  },
  description: COMPANY.description,
  keywords: [
    "marble flooring",
    "granite installation",
    "tile fixing",
    "stone contractor",
    "marble contractor Jaipur",
    "Sanjana Stone Arts",
    "Devisingh Prajapathi",
    "luxury interior stone work",
  ],
  authors: [{ name: COMPANY.owner }],
  openGraph: {
    title: `${COMPANY.name} | Premium Stone & Tile Contractor`,
    description: COMPANY.description,
    type: "website",
    locale: "en_IN",
    siteName: COMPANY.name,
  },
  twitter: {
    card: "summary_large_image",
    title: COMPANY.name,
    description: COMPANY.description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "GeneralContractor",
  name: COMPANY.name,
  description: COMPANY.description,
  founder: {
    "@type": "Person",
    name: COMPANY.owner,
  },
  email: COMPANY.email,
  url: "https://sanjanastonearts.com",
  areaServed: "India",
  serviceType: [
    "Marble Flooring",
    "Granite Installation",
    "Tile Fixing",
    "Wall Cladding",
    "Marble Staircases",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable} scroll-smooth`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
