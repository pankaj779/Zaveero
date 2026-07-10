'use client';

import { cn } from '@graphology/utils';
import * as React from 'react';
import { Input } from '../ui/input';

export interface OtpInputProps {
  length?: number;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  'aria-label'?: string;
}

export function OtpInput({
  length = 6,
  value = '',
  onChange,
  disabled,
  invalid,
  className,
  'aria-label': ariaLabel = 'One-time password',
}: OtpInputProps): React.JSX.Element {
  const inputsRef = React.useRef<Array<HTMLInputElement | null>>([]);
  const chars = Array.from({ length }, (_, i) => value[i] ?? '');

  const update = (next: string[]): void => {
    onChange?.(next.join('').slice(0, length));
  };

  return (
    <div className={cn('flex gap-2', className)} role="group" aria-label={ariaLabel}>
      {chars.map((char, index) => (
        <Input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={char}
          disabled={disabled}
          invalid={invalid}
          className="h-11 w-11 px-0 text-center text-base"
          aria-label={`Digit ${String(index + 1)}`}
          onChange={(event) => {
            const digit = event.target.value.replace(/\D/g, '').slice(-1);
            const next = [...chars];
            next[index] = digit;
            update(next);
            if (digit && index < length - 1) {
              inputsRef.current[index + 1]?.focus();
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Backspace' && !chars[index] && index > 0) {
              inputsRef.current[index - 1]?.focus();
            }
          }}
        />
      ))}
    </div>
  );
}
