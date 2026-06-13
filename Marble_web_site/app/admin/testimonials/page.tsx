import { TestimonialsEditor } from "@/components/admin/TestimonialsEditor";
import { requireAdmin } from "@/lib/admin-auth";
import { getAllTestimonials } from "@/lib/data";

export default async function AdminTestimonialsPage() {
  await requireAdmin();

  const testimonials = await getAllTestimonials();

  return (
    <div className="p-6 md:p-10">
      <h1 className="font-serif text-3xl font-semibold text-black">Testimonials</h1>
      <p className="mt-1 text-sm text-gray-medium">
        Approve client reviews from the website, or add your own testimonials.
      </p>
      <div className="mt-8 max-w-3xl">
        <TestimonialsEditor initial={testimonials} />
      </div>
    </div>
  );
}
