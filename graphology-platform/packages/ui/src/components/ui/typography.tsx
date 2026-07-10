import { cn } from '@graphology/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

const typographyVariants = cva('text-foreground', {
  variants: {
    variant: {
      display: 'text-display',
      h1: 'text-h1',
      h2: 'text-h2',
      h3: 'text-h3',
      h4: 'text-h4',
      'body-lg': 'text-body-lg',
      body: 'text-body',
      small: 'text-small',
      caption: 'text-caption',
    },
  },
  defaultVariants: {
    variant: 'body',
  },
});

type TypographyTag = 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span';

export interface TypographyProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof typographyVariants> {
  as?: TypographyTag;
}

export function Typography({
  as,
  variant = 'body',
  className,
  ...props
}: TypographyProps): React.JSX.Element {
  const Comp: TypographyTag =
    as ??
    (variant === 'display' || variant === 'h1'
      ? 'h1'
      : variant === 'h2'
        ? 'h2'
        : variant === 'h3'
          ? 'h3'
          : variant === 'h4'
            ? 'h4'
            : variant === 'caption' || variant === 'small'
              ? 'span'
              : 'p');

  return React.createElement(Comp, {
    className: cn(typographyVariants({ variant }), className),
    ...props,
  });
}

export { typographyVariants };
