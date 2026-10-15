import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { actionClassName } from './actionStyles';
import { Icon, type IconName } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'text';
export type ButtonSize = 'compact' | 'standard' | 'large' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly children?: ReactNode;
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly leadingIcon?: IconName;
  readonly trailingIcon?: IconName;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className = '',
    disabled = false,
    leadingIcon,
    size = 'standard',
    trailingIcon,
    type = 'button',
    variant = 'primary',
    ...props
  },
  ref,
) {
  return (
    <button
      {...props}
      className={`${actionClassName(variant, size, className)} disabled:cursor-not-allowed disabled:opacity-60`}
      disabled={disabled}
      ref={ref}
      type={type}
    >
      {leadingIcon && <Icon name={leadingIcon} />}
      {children}
      {trailingIcon && <Icon name={trailingIcon} />}
    </button>
  );
});
