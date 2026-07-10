'use client';

import { Badge, Button } from '@graphology/ui';
import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { icons, ROUTES } from '../../lib/constants';
import { HeroIllustrationPlaceholder } from './hero-illustration-placeholder';

const CheckIcon = icons.check;

const trustItems = [
  'Live Interactive Classes',
  'Mentor-led Learning',
  'Practical Skill Development',
] as const;

const ease = [0.22, 1, 0.36, 1] as const;
const duration = 0.25;

export function HeroContent(): React.JSX.Element {
  const reduceMotion = useReducedMotion();

  return (
    <div className="grid items-center gap-10 tablet:grid-cols-[1.5fr_1fr] tablet:gap-10 laptop:grid-cols-2 laptop:gap-16">
      <div className="space-y-6 text-left">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration, ease }}
        >
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            Modern Learning Platform
          </Badge>
        </motion.div>

        <motion.h1
          id="hero-heading"
          className="text-display max-w-xl text-foreground"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration, ease, delay: reduceMotion ? 0 : 0.04 }}
        >
          Learn Today.
          <br />
          Lead Tomorrow.
        </motion.h1>

        <motion.p
          className="max-w-xl text-body-lg text-muted-foreground"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration, ease, delay: reduceMotion ? 0 : 0.08 }}
        >
          Master practical skills through structured learning, expert mentorship, and thoughtfully
          designed educational experiences.
        </motion.p>

        <motion.div
          className="flex w-full flex-col gap-3 phone:flex-col tablet:flex-row tablet:flex-wrap"
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration, ease, delay: reduceMotion ? 0 : 0.1 }}
        >
          <Button variant="primary" size="lg" className="w-full tablet:w-auto" asChild>
            <Link href={ROUTES.courses}>Explore Programs</Link>
          </Button>
          <Button variant="outline" size="lg" className="w-full tablet:w-auto" asChild>
            <Link href={ROUTES.contact}>Talk to an Expert</Link>
          </Button>
        </motion.div>

        <ul className="flex flex-col gap-2.5 pt-1" aria-label="Learning highlights">
          {trustItems.map((item, index) => (
            <motion.li
              key={item}
              className="flex items-center gap-2 text-small text-muted-foreground"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration,
                ease,
                delay: reduceMotion ? 0 : 0.14 + index * 0.05,
              }}
            >
              <CheckIcon className="h-4 w-4 shrink-0 text-success" aria-hidden />
              <span>{item}</span>
            </motion.li>
          ))}
        </ul>
      </div>

      <div className="order-last flex justify-center tablet:justify-end">
        <motion.div
          className="w-full max-w-md"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration, ease, delay: reduceMotion ? 0 : 0.08 }}
        >
          <HeroIllustrationPlaceholder />
        </motion.div>
      </div>
    </div>
  );
}
