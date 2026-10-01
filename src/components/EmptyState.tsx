import { cn } from '@/lib/utils';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type Props = {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Usually a call to action, e.g. an Add button. */
  children?: ReactNode;
  className?: string;
};

/** Centered placeholder for a view that has nothing to show. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
}: Props) {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-2 px-4 py-12 text-center',
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <p className="mt-1 text-sm font-medium">{title}</p>
      {description && (
        <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
      )}
      {children && (
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {children}
        </div>
      )}
    </div>
  );
}
