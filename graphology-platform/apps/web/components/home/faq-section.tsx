'use client';

import { Container, Section } from '@graphology/ui';
import { cn } from '@graphology/utils';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useId, useState } from 'react';
import { faqContent } from '../../lib/config';
import { icons } from '../../lib/constants';

const ChevronIcon = icons.chevronDown;

export function FaqSection(): React.JSX.Element {
  const content = faqContent;
  const baseId = useId();
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const reduceMotion = useReducedMotion();

  return (
    <Section id={content.id} aria-labelledby="faq-heading" className="bg-surface">
      <Container>
        <div className="mx-auto mb-10 max-w-2xl text-center laptop:mb-14">
          <h2 id="faq-heading" className="text-h2 text-foreground">
            {content.title}
          </h2>
        </div>

        <div className="mx-auto max-w-3xl divide-y divide-border rounded-xl border border-border bg-card shadow-sm">
          {content.items.map((question, index) => {
            const isOpen = openIndex === index;
            const panelId = `${baseId}-panel-${String(index)}`;
            const buttonId = `${baseId}-button-${String(index)}`;

            return (
              <div key={question} className="px-4 tablet:px-6">
                <h3>
                  <button
                    type="button"
                    id={buttonId}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium text-foreground transition-colors duration-normal hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => {
                      setOpenIndex(isOpen ? null : index);
                    }}
                  >
                    <span>{question}</span>
                    <ChevronIcon
                      className={cn(
                        'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-normal',
                        isOpen && 'rotate-180',
                      )}
                      aria-hidden
                    />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                      transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="pb-4 text-small text-muted-foreground">
                        {content.answerPlaceholder}
                      </p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
