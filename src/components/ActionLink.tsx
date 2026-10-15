import { Link, type LinkProps } from 'react-router';
import type { ReactNode } from 'react';
import { actionClassName } from './actionStyles';
import { Icon, type IconName } from './Icon';
import type { ButtonSize, ButtonVariant } from './Button';

interface ActionLinkProps extends Omit<LinkProps, 'children' | 'className'> {
  readonly children: ReactNode;
  readonly className?: string;
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly leadingIcon?: IconName;
  readonly trailingIcon?: IconName;
}

export function ActionLink({
  children,
  className = '',
  leadingIcon,
  size = 'standard',
  trailingIcon,
  variant = 'secondary',
  ...props
}: ActionLinkProps) {
  return (
    <Link {...props} className={actionClassName(variant, size, className)}>
      {leadingIcon && <Icon name={leadingIcon} />}
      {children}
      {trailingIcon && <Icon name={trailingIcon} />}
    </Link>
  );
}
