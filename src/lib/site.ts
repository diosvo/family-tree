export type LinkKind = 'github' | 'linkedin' | 'facebook';
export type SiteLink = { kind: LinkKind; label: string; url: string };

export const AUTHOR: { name: string; links: SiteLink[] } = {
  name: 'Dios Vo',
  links: [
    { kind: 'github', label: 'Github', url: 'https://github.com/diosvo' },
    {
      kind: 'linkedin',
      label: 'LinkedIn',
      url: 'https://www.linkedin.com/in/diosvo/',
    },
    {
      kind: 'facebook',
      label: 'Facebook',
      url: 'https://www.facebook.com/diosvo',
    },
  ],
};
