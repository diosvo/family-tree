import {
  Facebook,
  Github,
  Heart,
  Linkedin,
  type LucideIcon,
} from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { useT } from '@/lib/i18n';
import type { LinkKind } from '@/lib/site';
import { AUTHOR } from '@/lib/site';

const ICONS: Record<LinkKind, LucideIcon> = {
  github: Github,
  linkedin: Linkedin,
  facebook: Facebook,
};

export function Footer() {
  const { t } = useT();
  const links = AUTHOR.links.filter((l) => l.url);

  return (
    <footer className="flex shrink-0 flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t bg-card px-4 py-2 text-xs leading-none text-muted-foreground">
      <span className="flex items-center gap-1">
        {t('madeWith')}
        <Heart className="h-3 w-3 fill-(--female) text-(--female)" />
      </span>
      |
      {links.length > 0 && (
        <ul className="flex items-center gap-3">
          {links.map((l) => {
            const Icon = ICONS[l.kind];

            return (
              <li key={l.kind} className="flex items-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={l.label}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>{l.label}</TooltipContent>
                </Tooltip>
              </li>
            );
          })}
        </ul>
      )}
    </footer>
  );
}
