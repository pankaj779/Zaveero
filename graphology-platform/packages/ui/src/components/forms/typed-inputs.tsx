import * as React from 'react';
import { Input, type InputProps } from '../ui/input';

export const PasswordInput = React.forwardRef<HTMLInputElement, InputProps>((props, ref) => (
  <Input ref={ref} type="password" autoComplete={props.autoComplete ?? 'current-password'} {...props} />
));
PasswordInput.displayName = 'PasswordInput';

export const EmailInput = React.forwardRef<HTMLInputElement, InputProps>((props, ref) => (
  <Input ref={ref} type="email" autoComplete={props.autoComplete ?? 'email'} {...props} />
));
EmailInput.displayName = 'EmailInput';

export const PhoneInput = React.forwardRef<HTMLInputElement, InputProps>((props, ref) => (
  <Input ref={ref} type="tel" autoComplete={props.autoComplete ?? 'tel'} {...props} />
));
PhoneInput.displayName = 'PhoneInput';
