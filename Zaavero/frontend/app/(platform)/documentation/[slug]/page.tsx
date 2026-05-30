import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProductDoc, PRODUCT_DOCS } from "@/lib/product-docs";

export function generateStaticParams() {
  return Object.keys(PRODUCT_DOCS).map((slug) => ({ slug }));
}

export default function ProductDocumentationPage({ params }: { params: { slug: string } }) {
  const doc = getProductDoc(params.slug);
  if (!doc) notFound();

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-8">
      <Link href="/documentation" className="text-sm text-[hsl(var(--primary))] flex items-center gap-1 hover:underline">
        <ArrowLeft className="h-4 w-4" /> All documentation
      </Link>

      <div>
        <div className="flex items-center gap-2 text-[hsl(var(--primary))] mb-2">
          <BookOpen className="h-5 w-5" />
          <span className="text-sm font-medium">Product guide</span>
        </div>
        <h1 className="text-3xl font-bold">{doc.title}</h1>
        <p className="mt-3 text-[hsl(var(--muted-foreground))] leading-relaxed">{doc.summary}</p>
      </div>

      <div className="space-y-6">
        {doc.sections.map((section) => (
          <Card key={section.heading}>
            <CardHeader>
              <CardTitle className="text-lg">{section.heading}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-[hsl(var(--muted-foreground))]">
              <p className="leading-relaxed">{section.body}</p>
              {section.steps && (
                <ol className="space-y-2">
                  {section.steps.map((step, i) => (
                    <li key={step} className="flex gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[hsl(var(--primary))] mt-0.5" />
                      <span>
                        <span className="font-medium text-[hsl(var(--foreground))]">Step {i + 1}. </span>
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href={`/products/${doc.slug}`}>
          <Button>Open in Products</Button>
        </Link>
        <Link href="/marketplace">
          <Button variant="outline">Marketplace</Button>
        </Link>
      </div>
    </div>
  );
}
