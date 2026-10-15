import type { ButtonSize, ButtonVariant } from './Button';

const variantClasses: Readonly<Record<ButtonVariant, string>> = {
  primary: 'border-transparent bg-primary font-semibold text-on-primary hover:bg-primary-hover',
  secondary: 'border-outline bg-surface font-medium text-primary hover:bg-surface-container',
  danger: 'border-danger bg-danger font-semibold text-on-primary hover:bg-danger-hover',
  text: 'border-transparent bg-transparent font-medium text-primary hover:bg-surface-container',
};

const sizeClasses: Readonly<Record<ButtonSize, string>> = {
  compact: 'min-h-10 px-3 text-label-medium',
  standard: 'min-h-11 px-4 text-label-large',
  large: 'min-h-12 px-6 text-label-large',
  icon: 'min-h-11 min-w-11 px-2 text-label-large',
};

export function actionClassName(variant: ButtonVariant, size: ButtonSize, className = ''): string {
  return `inline-flex items-center justify-center gap-2 rounded-control border text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${variantClasses[variant]} ${sizeClasses[size]} ${className}`.trim();
}
