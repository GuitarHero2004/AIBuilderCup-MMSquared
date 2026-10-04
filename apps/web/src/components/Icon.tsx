import type { CSSProperties } from 'react';

type IconName = 'leaf' | 'grid' | 'arrow' | 'plus' | 'shield' | 'fabric' | 'check' | 'refresh' | 'close' | 'chevron';

export function Icon({ name, size = 20, style }: { name: IconName; size?: number; style?: CSSProperties }) {
  const paths: Record<IconName, React.ReactNode> = {
    leaf: <><path d="M20 4c-8-1-16 3-15 10 1 7 13 7 15-10Z" /><path d="M4 21 15 10M8 16v-5M8 16h5" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    arrow: <><path d="M4 12h16m-6-6 6 6-6 6" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9S4 17 4 12V6l8-3Z" /><path d="m8 12 3 3 5-6" /></>,
    fabric: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M4 8h16M4 13h16M4 18h16M9 3v18M15 3v18" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    refresh: <><path d="M20 10a8 8 0 1 0-2 8M20 4v6h-6" /></>,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    chevron: <path d="m9 5 7 7-7 7" />,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" style={style}>{paths[name]}</svg>;
}
