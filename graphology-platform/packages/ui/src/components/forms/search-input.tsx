'use client';

import { cn } from '@graphology/utils';
import { Search } from 'lucide-react';
import * as React from 'react';
import { Input, type InputProps } from '../ui/input';

export const SearchInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        ref={ref}
        type="search"
        className={cn('pl-9', className)}
        placeholder={props.placeholder ?? 'Search…'}
        {...props}
      />
    </div>
  ),
);

SearchInput.displayName = 'SearchInput';
