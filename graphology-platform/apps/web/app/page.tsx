import { HomeCta } from '../components/home/home-cta';
import { HeroSection } from '../components/home/hero-section';
import { SectionPlaceholder } from '../components/home/section-placeholder';

const placeholders = [
  {
    id: 'about',
    name: 'What is Graphology',
    description:
      'A clear introduction to handwriting analysis as a professional discipline—coming in a later task.',
  },
  {
    id: 'why-us',
    name: 'Why Choose Us',
    description: 'Differentiators and trust signals for the Graphology Platform will live here.',
  },
  {
    id: 'benefits',
    name: 'Benefits',
    description: 'Outcomes for students, parents, teachers, and professionals will be detailed here.',
  },
  {
    id: 'mentor',
    name: 'Meet the Mentor',
    description: 'Mentor profile, credentials, and teaching philosophy will appear in this section.',
  },
  {
    id: 'journey',
    name: 'Learning Journey',
    description: 'A step-by-step path from enrollment to mastery will be illustrated here.',
  },
  {
    id: 'transformations',
    name: 'Student Transformations',
    description: 'Before/after stories and measurable progress examples will be featured here.',
  },
  {
    id: 'testimonials',
    name: 'Testimonials',
    description: 'Verified student and parent testimonials will be curated in this block.',
  },
  {
    id: 'faq',
    name: 'FAQs',
    description: 'Common questions about courses, mentorship, and enrollment will be answered here.',
  },
] as const;

export default function HomePage(): React.JSX.Element {
  return (
    <>
      <HeroSection />
      {placeholders.map((section) => (
        <SectionPlaceholder
          key={section.id}
          id={section.id}
          name={section.name}
          description={section.description}
        />
      ))}
      {/* Courses anchor for nav / CTA until the courses section ships */}
      <div id="courses" className="sr-only" aria-hidden>
        Courses
      </div>
      <HomeCta />
    </>
  );
}
