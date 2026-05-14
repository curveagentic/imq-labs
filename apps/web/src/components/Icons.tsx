// Tiny inline icons (no external dep). Stroke-based to match IMQ Labs mock.
import type { SVGProps } from 'react';

const base = 'w-6 h-6';
const I = (props: SVGProps<SVGSVGElement>) => (
  <svg
    fill="none" stroke="currentColor" strokeWidth={1.6}
    strokeLinecap="round" strokeLinejoin="round"
    viewBox="0 0 24 24"
    {...props}
    className={(props.className ?? '') + ' ' + base}
  />
);

export const Home = (p: SVGProps<SVGSVGElement>) => (
  <I {...p}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></I>
);
export const Search = (p: SVGProps<SVGSVGElement>) => (
  <I {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></I>
);
export const Plus = (p: SVGProps<SVGSVGElement>) => (
  <I {...p}><path d="M12 5v14M5 12h14" /></I>
);
export const Chat = (p: SVGProps<SVGSVGElement>) => (
  <I {...p}><path d="M4 5h16v11H8l-4 4z" /></I>
);
export const User = (p: SVGProps<SVGSVGElement>) => (
  <I {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-7 8-7s8 3 8 7" /></I>
);
export const Mic = (p: SVGProps<SVGSVGElement>) => (
  <I {...p}><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" /></I>
);
export const Music = (p: SVGProps<SVGSVGElement>) => (
  <I {...p}><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></I>
);
export const Pencil = (p: SVGProps<SVGSVGElement>) => (
  <I {...p}><path d="M4 20h4l11-11-4-4L4 16z" /></I>
);
export const Globe = (p: SVGProps<SVGSVGElement>) => (
  <I {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></I>
);
export const Users = (p: SVGProps<SVGSVGElement>) => (
  <I {...p}><circle cx="9" cy="8" r="3.5" /><path d="M3 20c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5" /><circle cx="17" cy="9" r="2.5" /><path d="M15 20c0-2 1.5-3.5 4-3.5" /></I>
);
export const Dollar = (p: SVGProps<SVGSVGElement>) => (
  <I {...p}><circle cx="12" cy="12" r="9" /><path d="M9 14a3 3 0 0 0 3 2c2 0 3-1 3-2.4 0-3.2-6-2.1-6-5C9 7 10 6 12 6a3 3 0 0 1 3 2" /><path d="M12 4v3M12 17v3" /></I>
);
export const Bell = (p: SVGProps<SVGSVGElement>) => (
  <I {...p}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5z" /><path d="M10 21h4" /></I>
);
export const Play = (p: SVGProps<SVGSVGElement>) => (
  <I {...p}><polygon points="6 4 20 12 6 20 6 4" fill="currentColor" /></I>
);
export const Pause = (p: SVGProps<SVGSVGElement>) => (
  <I {...p}><rect x="6" y="4" width="4" height="16" fill="currentColor" /><rect x="14" y="4" width="4" height="16" fill="currentColor" /></I>
);
export const Heart = (p: SVGProps<SVGSVGElement>) => (
  <I {...p}><path d="M12 21s-7-4.5-9.5-9C1 9 3 5 6.5 5c2 0 3.5 1 5.5 3 2-2 3.5-3 5.5-3C21 5 23 9 21.5 12 19 16.5 12 21 12 21z" /></I>
);
export const Diamond = (p: SVGProps<SVGSVGElement>) => (
  <I {...p}><path d="M6 3h12l3 5-9 13L3 8z" /><path d="M3 8h18M9 3l-3 5 6 13M15 3l3 5-6 13" /></I>
);
export const Send = (p: SVGProps<SVGSVGElement>) => (
  <I {...p}><path d="M3 11l18-7-7 18-3-7z" /></I>
);
export const ChevronLeft = (p: SVGProps<SVGSVGElement>) => (
  <I {...p}><path d="M15 6l-6 6 6 6" /></I>
);
export const ChevronRight = (p: SVGProps<SVGSVGElement>) => (
  <I {...p}><path d="M9 6l6 6-6 6" /></I>
);
export const MoreVertical = (p: SVGProps<SVGSVGElement>) => (
  <I {...p}><circle cx="12" cy="5" r="1.5" fill="currentColor" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /><circle cx="12" cy="19" r="1.5" fill="currentColor" /></I>
);
export const Filter = (p: SVGProps<SVGSVGElement>) => (
  <I {...p}><path d="M3 5h18l-7 8v6l-4-2v-4z" /></I>
);
export const Verified = (p: SVGProps<SVGSVGElement>) => (
  <I {...p} className="w-4 h-4 text-wave-500"><path d="M12 2l2.4 2.4 3.4-.6.6 3.4L20.8 9.6 18.4 12l2.4 2.4-2.4 1.4-.6 3.4-3.4-.6L12 20.8 9.6 18.4l-3.4.6-.6-3.4L3.2 14.4 5.6 12 3.2 9.6l2.4-1.4.6-3.4 3.4.6L12 3.2z" fill="#FF1A2E" stroke="none" /><path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" /></I>
);
export const Star = (p: SVGProps<SVGSVGElement>) => (
  <I {...p}><polygon points="12 3 14.4 9 21 9.6 16 14 17.5 21 12 17.5 6.5 21 8 14 3 9.6 9.6 9" fill="currentColor" /></I>
);
export const Edit = (p: SVGProps<SVGSVGElement>) => (
  <I {...p}><path d="M4 20h4l10-10-4-4L4 16z" /></I>
);
export const TrendUp = (p: SVGProps<SVGSVGElement>) => (
  <I {...p}><polyline points="3 17 9 11 13 15 21 7" /><polyline points="14 7 21 7 21 14" /></I>
);
