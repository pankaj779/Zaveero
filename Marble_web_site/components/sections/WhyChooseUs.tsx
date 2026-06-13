import { FadeIn } from "@/components/ui/FadeIn";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { WHY_CHOOSE_US } from "@/lib/constants";
import {
  Award,
  Clock,
  IndianRupee,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Users,
  Sparkles,
  ShieldCheck,
  Clock,
  IndianRupee,
  Award,
};

export function WhyChooseUs() {
  return (
    <section className="bg-white py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <SectionHeading
          subtitle="Why Choose Us"
          title="The Sanjana Stone Arts Difference"
          description="We combine skilled craftsmanship with professional project management to deliver results that exceed expectations."
        />

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {WHY_CHOOSE_US.map((item, index) => {
            const Icon = ICON_MAP[item.icon] ?? ShieldCheck;
            return (
              <FadeIn key={item.title} delay={index * 0.08}>
                <div className="group border border-gray-200 p-8 transition-all duration-300 hover:border-gold hover:shadow-lg">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center border border-gold/30 bg-gold/5 transition-colors group-hover:bg-gold/10">
                    <Icon size={22} className="text-gold" />
                  </div>
                  <h3 className="font-serif text-xl font-semibold text-black">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-medium">
                    {item.description}
                  </p>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
