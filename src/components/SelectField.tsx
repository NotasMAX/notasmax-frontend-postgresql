import type { SelectHTMLAttributes } from 'react';
import { Icon } from './Icon';

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  readonly density?: 'comfortable' | 'compact';
};

const densityClasses = {
  comfortable: 'min-h-12 w-full text-body-large',
  compact: 'min-h-11 w-auto text-body-medium',
} as const;

export function SelectField({
  className = '',
  density = 'comfortable',
  ...props
}: SelectFieldProps) {
  return (
    <span className={`relative ${density === 'compact' ? 'inline-flex w-auto' : 'block w-full'}`}>
      <select
        {...props}
        className={`select-field-control appearance-none rounded-lg border border-outline bg-surface py-2 pl-3 pr-10 text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${densityClasses[density]} ${className}`.trim()}
      />
      <Icon className="select-field-chevron" name="expandMore" />
    </span>
  );
}
