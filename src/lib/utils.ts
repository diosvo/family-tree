import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import type { ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Shared control styles: thin 1px border, background tint on hover. */
export const btn =
  'rounded-md border bg-card px-3 py-1.5 text-xs transition-colors hover:bg-accent';
export const btnPrimary =
  'rounded-md border border-primary bg-primary px-3 py-1.5 text-xs text-primary-foreground transition-colors hover:bg-primary/90';
export const chip =
  'rounded-full border bg-card px-2.5 py-1 text-xs transition-colors hover:bg-accent';
export const input =
  'w-full rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring';
