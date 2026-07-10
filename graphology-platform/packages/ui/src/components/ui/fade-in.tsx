'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import * as React from 'react';

const ease = [0.22, 1, 0.36, 1] as const;

/** Subtle fade/slide entrance — max 250ms, no bounce. */
export function FadeIn({
  children,
  className,
  delay = 0,
  ...props
}: HTMLMotionProps<'div'> & { delay?: number }): React.JSX.Element {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay, ease }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
