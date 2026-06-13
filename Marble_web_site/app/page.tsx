import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { About } from "@/components/sections/About";
import { Contact } from "@/components/sections/Contact";
import { GetQuote } from "@/components/sections/GetQuote";
import { Hero } from "@/components/sections/Hero";
import { Portfolio } from "@/components/sections/Portfolio";
import { Pricing } from "@/components/sections/Pricing";
import { Services } from "@/components/sections/Services";
import { Testimonials } from "@/components/sections/Testimonials";
import { WhyChooseUs } from "@/components/sections/WhyChooseUs";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { getPricingItems, getProjects, getTestimonials } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [projects, pricingItems, testimonials] = await Promise.all([
    getProjects(),
    getPricingItems(),
    getTestimonials(),
  ]);

  return (
    <>
      <Header />
      <main>
        <Hero />
        <About />
        <Services />
        <Portfolio projects={projects} />
        <WhyChooseUs />
        <Pricing items={pricingItems} />
        <GetQuote pricingItems={pricingItems} />
        <Testimonials testimonials={testimonials} />
        <Contact />
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
