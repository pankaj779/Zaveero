import { cn } from '@graphology/utils';
import * as React from 'react';
import { Label } from '../ui/label';

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  htmlFor?: string;
  helperText?: string;
  error?: string;
  success?: string;
  required?: boolean;
}

export function FormField({
  label,
  htmlFor,
  helperText,
  error,
  success,
  required,
  className,
  children,
  ...props
}: FormFieldProps): React.JSX.Element {
  const describedBy = error
    ? `${htmlFor ?? 'field'}-error`
    : success
      ? `${htmlFor ?? 'field'}-success`
      : helperText
        ? `${htmlFor ?? 'field'}-helper`
        : undefined;

  return (
    <div className={cn('space-y-2', className)} {...props}>
      {label ? (
        <Label htmlFor={htmlFor}>
          {label}
          {required ? <span className="text-danger"> *</span> : null}
        </Label>
      ) : null}
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<{ 'aria-describedby'?: string }>, {
            'aria-describedby': describedBy,
          })
        : children}
      {helperText && !error && !success ? (
        <p id={`${htmlFor ?? 'field'}-helper`} className="text-caption">
          {helperText}
        </p>
      ) : null}
      {error ? (
        <p id={`${htmlFor ?? 'field'}-error`} className="text-caption text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {success && !error ? (
        <p id={`${htmlFor ?? 'field'}-success`} className="text-caption text-success">
          {success}
        </p>
      ) : null}
    </div>
  );
}
