import { Segmented } from '@/components/ui/segmented';

import { useFamily } from '@/lib/family-store';
import { useT } from '@/lib/i18n';
import { REGIONS } from '@/lib/kinship';

/** Northern / Southern toggle for kinship terms; the choice is app-wide. */
export function RegionSwitch({ className }: { className?: string }) {
  const { t } = useT();
  const { region, setRegion } = useFamily();

  return (
    <Segmented
      className={className}
      value={region}
      onChange={setRegion}
      options={REGIONS.map((r) => ({ value: r, label: t(r) }))}
    />
  );
}
