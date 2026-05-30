import Link from "next/link";
import { ArrowLeft, BookOpen, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PLATFORM_DOC_SECTIONS, PRODUCT_DOCS } from "@/lib/product-docs";

const productLinks = Object.values(PRODUCT_DOCS).map((d) => ({
  title: `${d.title} guide`,
  description: d.summary,
  href: `/documentation/${d.slug}`,
}));

export default function DocumentationPage() {
  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-10">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6" /> Documentation
        </h1>
        <p className="text-[hsl(var(--muted-foreground))] mt-1">
          Platform guides and product integration docs — hosted inside Zaavero
        </p>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-4">Product guides</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {productLinks.map((doc) => (
            <Card key={doc.href}>
              <CardHeader>
                <CardTitle className="text-base">{doc.title}</CardTitle>
                <CardDescription className="line-clamp-2">{doc.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={doc.href}>
                  <Button variant="outline" size="sm" className="gap-1">
                    Read guide <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-lg font-semibold">Platform reference</h2>
        {PLATFORM_DOC_SECTIONS.map((section) => (
          <Card key={section.id} id={section.id}>
            <CardHeader>
              <CardTitle className="text-base">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-[hsl(var(--muted-foreground))] space-y-3">
              <p>{section.body}</p>
              {"steps" in section && section.steps && (
                <ol className="list-decimal list-inside space-y-1">
                  {section.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        ))}
      </section>

      <Link href="/dashboard">
        <Button variant="ghost" className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Button>
      </Link>
    </div>
  );
}
