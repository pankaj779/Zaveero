export const siteConfig = {
  name: 'Graphology Platform',
  shortName: 'Graphology',
  description: 'Professional Graphology Education Platform',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  locale: 'en_US',
} as const;

export const mainNav = [
  { href: '/', label: 'Home' },
  { href: '/#courses', label: 'Courses' },
  { href: '/#about', label: 'About' },
  { href: '/#contact', label: 'Contact' },
] as const;

export const footerColumns = [
  {
    title: 'Company',
    links: [
      { href: '/#about', label: 'About' },
      { href: '/#mentor', label: 'Mentor' },
      { href: '/#contact', label: 'Contact' },
    ],
  },
  {
    title: 'Courses',
    links: [
      { href: '/#courses', label: 'All Courses' },
      { href: '/#journey', label: 'Learning Journey' },
      { href: '/#benefits', label: 'Benefits' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { href: '/#faq', label: 'FAQs' },
      { href: '/#testimonials', label: 'Testimonials' },
      { href: '#', label: 'Blog' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '#', label: 'Privacy Policy' },
      { href: '#', label: 'Terms of Service' },
      { href: '#', label: 'Refund Policy' },
    ],
  },
] as const;
