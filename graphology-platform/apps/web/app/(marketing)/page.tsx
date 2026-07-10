import dynamic from 'next/dynamic';
import { HeroSection } from '../../components/home/hero-section';
import { WhatIsGraphologySection } from '../../components/home/what-is-graphology-section';
import { WhyLearnSection } from '../../components/home/why-learn-section';
import { BenefitsSection } from '../../components/home/benefits-section';
import { LearningJourneySection } from '../../components/home/learning-journey-section';
import { MeetMentorSection } from '../../components/home/meet-mentor-section';
import { ProgramsSection } from '../../components/home/programs-section';
import { StudentSuccessSection } from '../../components/home/student-success-section';

const FaqSection = dynamic(() =>
  import('../../components/home/faq-section').then((mod) => mod.FaqSection),
);

const ContactSection = dynamic(() =>
  import('../../components/home/contact-section').then((mod) => mod.ContactSection),
);

export default function HomePage(): React.JSX.Element {
  return (
    <>
      <HeroSection />
      <WhatIsGraphologySection />
      <WhyLearnSection />
      <BenefitsSection />
      <LearningJourneySection />
      <MeetMentorSection />
      <ProgramsSection />
      <StudentSuccessSection />
      <FaqSection />
      <ContactSection />
    </>
  );
}
