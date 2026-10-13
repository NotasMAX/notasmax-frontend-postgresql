const buttonBase =
  'inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-label-large focus-visible:outline-2 focus-visible:outline-offset-2';

const disabledButtonState = 'disabled:cursor-wait disabled:opacity-70';

export const primaryButtonClass = `${buttonBase} ${disabledButtonState} bg-primary font-semibold text-on-primary hover:bg-primary-hover focus-visible:outline-primary`;
export const secondaryButtonClass = `${buttonBase} border border-panel-outline bg-surface font-medium text-primary hover:bg-surface-container focus-visible:outline-primary`;
export const secondaryDisabledButtonClass = `${secondaryButtonClass} ${disabledButtonState}`;
export const dangerButtonClass = `${buttonBase} ${disabledButtonState} bg-danger font-semibold text-on-primary hover:opacity-90 focus-visible:outline-danger`;
