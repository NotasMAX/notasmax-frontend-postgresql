import type { ReactNode } from 'react';
import { Button } from './Button';

export function CenteredSubmitButton({
  children,
  disabled = false,
  icon,
}: {
  readonly children: ReactNode;
  readonly disabled?: boolean;
  readonly icon: 'add' | 'search';
}) {
  return (
    <div className="flex justify-center">
      <Button disabled={disabled} leadingIcon={icon} size="large" type="submit">
        {children}
      </Button>
    </div>
  );
}
