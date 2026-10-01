import { cn } from '@/lib/utils';

type Props<T extends string> = {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
  className?: string;
};

/** Row of mutually exclusive buttons; the active one is tinted. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: Props<T>) {
  return (
    <div
      role="group"
      className={cn(
        'inline-flex overflow-hidden rounded-md border bg-card text-xs',
        className,
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'px-2.5 py-1.5 transition-colors hover:bg-accent',
            o.value === value ? 'bg-accent' : 'text-muted-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
