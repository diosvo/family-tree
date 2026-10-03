import { Heart, createLucideIcon } from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useT } from '@/lib/i18n';
import { AUTHOR } from '@/lib/site';

import type { LinkKind } from '@/lib/site';
import type { LucideIcon } from 'lucide-react';

// Brand icons dropped in lucide-react 1.x; using last versions (ISC). Nodes require a `key`.
const Github = createLucideIcon('github', [
  [
    'path',
    {
      d: 'M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4',
      key: 'k1',
    },
  ],
  ['path', { d: 'M9 18c-4.51 2-5-2-7-2', key: 'k2' }],
]);

const Linkedin = createLucideIcon('linkedin', [
  [
    'path',
    {
      d: 'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z',
      key: 'k3',
    },
  ],
  ['rect', { width: '4', height: '12', x: '2', y: '9', key: 'k4' }],
  ['circle', { cx: '4', cy: '4', r: '2', key: 'k5' }],
]);

const Facebook = createLucideIcon('facebook', [
  [
    'path',
    {
      d: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z',
      key: 'k6',
    },
  ],
]);

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
