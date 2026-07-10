import type { IconName } from '../constants/icons';
import { ROUTES } from '../constants/routes';

export const heroContent = {
  headline: 'Learn Skills That Create Meaningful Change.',
  subheading:
    'Expert-led education designed to help individuals, families, and professionals build practical knowledge through structured learning experiences.',
  primaryCta: { label: 'Explore Programs', href: ROUTES.programs },
  secondaryCta: { label: 'Talk to an Expert', href: ROUTES.contact },
  trustIndicators: ['Live Learning', 'Expert Mentors', 'Interactive Sessions'] as const,
} as const;

export const whatIsGraphologyContent = {
  id: 'about',
  title: 'What is Graphology?',
  description:
    'Graphology is the study of handwriting and writing patterns. It is taught as a skill for understanding writing characteristics and is explored in educational, personal development, and observational contexts.',
  whereUsedTitle: 'Where it is used',
  whereUsed: [
    'Personal Development',
    'Education',
    'Handwriting Improvement',
    'Self Awareness',
    'Observation Skills',
  ] as const,
  whatItIsNotTitle: 'What it is not',
  whatItIsNot: [
    'Graphology is not a medical science.',
    'Graphology is not a replacement for psychological or clinical evaluation.',
    'It should be presented only as an educational discipline.',
  ] as const,
  callout:
    'Graphology is a skill that encourages careful observation, structured thinking, and continuous learning.',
  illustrationLabel: 'Illustration placeholder',
  illustrationHelper: 'Custom artwork will be added in a future release.',
} as const;

export const whyLearnContent = {
  id: 'why-learn',
  title: 'Why Learn Graphology',
  cards: [
    {
      title: 'Self Awareness',
      description: 'Better understand your own writing habits and personal development journey.',
      icon: 'eye' as IconName,
    },
    {
      title: 'Communication',
      description: 'Learn how handwriting reflects communication styles and expression.',
      icon: 'message' as IconName,
    },
    {
      title: 'Child Development',
      description: 'Observe writing development and encourage healthy handwriting habits.',
      icon: 'users' as IconName,
    },
    {
      title: 'Leadership',
      description: 'Strengthen observation, patience, and interpersonal understanding.',
      icon: 'compass' as IconName,
    },
    {
      title: 'Education',
      description: 'Add a valuable skill that complements teaching and lifelong learning.',
      icon: 'graduation' as IconName,
    },
    {
      title: 'Observation Skills',
      description: 'Develop structured observation techniques useful in everyday situations.',
      icon: 'search' as IconName,
    },
  ],
} as const;

export const benefitsContent = {
  id: 'benefits',
  title: 'Benefits',
  steps: [
    {
      title: 'Discover',
      description: 'Understand the foundations before moving into practical learning.',
      icon: 'lightbulb' as IconName,
    },
    {
      title: 'Practice',
      description: 'Apply concepts through guided exercises.',
      icon: 'pen' as IconName,
    },
    {
      title: 'Understand',
      description: 'Build deeper knowledge through mentor feedback.',
      icon: 'book' as IconName,
    },
    {
      title: 'Apply',
      description: 'Use your learning in real-world situations.',
      icon: 'target' as IconName,
    },
    {
      title: 'Improve',
      description: 'Continue refining your skills with consistent practice.',
      icon: 'trending' as IconName,
    },
  ],
} as const;

export const learningJourneyContent = {
  id: 'journey',
  title: 'Learning Journey',
  steps: [
    {
      step: 1,
      title: 'Register',
      description: 'Create your learning account.',
      icon: 'user' as IconName,
    },
    {
      step: 2,
      title: 'Attend Live Classes',
      description: 'Join scheduled interactive sessions.',
      icon: 'video' as IconName,
    },
    {
      step: 3,
      title: 'Assignments',
      description: 'Complete practical exercises.',
      icon: 'clipboard' as IconName,
    },
    {
      step: 4,
      title: 'Feedback',
      description: 'Receive personalized mentor guidance.',
      icon: 'message' as IconName,
    },
    {
      step: 5,
      title: 'Certification',
      description: 'Earn a course completion certificate.',
      icon: 'award' as IconName,
    },
  ],
} as const;

export const mentorContent = {
  id: 'mentor',
  title: 'Meet Your Mentor',
  name: 'Professional Mentor',
  experienceLabel: 'Experience',
  experience: 'Profile Coming Soon',
  certificationsLabel: 'Certifications',
  certifications: 'Details Coming Soon',
  biographyLabel: 'Biography',
  biography: 'Mentor information will be published before the official platform launch.',
  photoLabel: 'Mentor photo placeholder',
} as const;

export const programsContent = {
  id: 'programs',
  title: 'Programs',
  cards: [
    {
      id: 'foundations',
      title: 'Graphology Foundations',
      duration: '8 Weeks',
      level: 'Beginner',
      format: 'Live Online',
      ctaLabel: 'View Details',
      ctaHref: '#',
      comingSoon: false,
    },
    {
      id: 'advanced',
      title: 'Advanced Graphology',
      duration: '12 Weeks',
      level: 'Intermediate',
      format: 'Live Online',
      ctaLabel: 'View Details',
      ctaHref: '#',
      comingSoon: false,
    },
    {
      id: 'handwriting',
      title: 'Handwriting Improvement',
      duration: '6 Weeks',
      level: 'All Levels',
      format: 'Hybrid',
      ctaLabel: 'View Details',
      ctaHref: '#',
      comingSoon: false,
    },
    {
      id: 'future',
      title: 'Future Programs',
      description: 'New professional learning programs are currently being designed.',
      ctaLabel: 'Coming Soon',
      ctaHref: '#',
      comingSoon: true,
    },
  ],
} as const;

export const studentSuccessContent = {
  id: 'testimonials',
  title: 'Student Success Stories',
  cards: [
    {
      id: 'story-1',
      photoLabel: 'Photo Placeholder',
      nameLabel: 'Student Name Placeholder',
      experienceLabel: 'Learning Experience Placeholder',
      transformationLabel: 'Transformation Placeholder',
    },
    {
      id: 'story-2',
      photoLabel: 'Photo Placeholder',
      nameLabel: 'Student Name Placeholder',
      experienceLabel: 'Learning Experience Placeholder',
      transformationLabel: 'Transformation Placeholder',
    },
    {
      id: 'story-3',
      photoLabel: 'Photo Placeholder',
      nameLabel: 'Student Name Placeholder',
      experienceLabel: 'Learning Experience Placeholder',
      transformationLabel: 'Transformation Placeholder',
    },
  ],
} as const;

export const faqContent = {
  id: 'faq',
  title: 'Frequently Asked Questions',
  answerPlaceholder: 'Detailed information will be published before the official launch.',
  items: [
    'What is Graphology?',
    'Who can join the program?',
    'Do I need previous experience?',
    'Are classes live or recorded?',
    'How long is each program?',
    'Will I receive a certificate?',
    'Can students join from any country?',
    'Will assignments be provided?',
    'How do I contact a mentor?',
    'How do I enroll?',
  ] as const,
} as const;

export const contactSectionContent = {
  id: 'contact',
  title: 'Contact',
  mapLabel: 'Map placeholder',
  form: {
    fullName: 'Full Name',
    email: 'Email Address',
    phone: 'Phone Number',
    subject: 'Subject',
    message: 'Message',
    privacyLabel: 'I agree to the Privacy Policy.',
    submitLabel: 'Send Message',
  },
} as const;
