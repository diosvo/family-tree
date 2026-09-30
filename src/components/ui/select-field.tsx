import { cn } from '@/lib/utils';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';

const NONE = '__none__';

type Props = {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  /** Label for an extra "no selection" option; when set, '' means none. */
  emptyLabel?: string;
  placeholder?: string;
  className?: string;
};

/** Styled dropdown wrapping the shadcn Select for simple string options. */
export function SelectField({
  value,
  onChange,
  options,
  emptyLabel,
  placeholder,
  className,
}: Props) {
  const all = emptyLabel
    ? [{ value: NONE, label: emptyLabel }, ...options]
    : options;

  return (
    <Select
      value={value || (emptyLabel ? NONE : '')}
      onValueChange={(v) => onChange(v === NONE ? '' : v)}
    >
      <SelectTrigger
        size="sm"
        className={cn('w-full bg-background', className)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper">
        {all.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
