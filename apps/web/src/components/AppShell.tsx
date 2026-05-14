'use client';
import { usePathname } from 'next/navigation';
import { BottomNav } from './BottomNav';
import { Player } from './Player';
import { DesktopRails } from './DesktopFrame';

/**
 * Top-level shell.
 *
 * - Landing routes (`/`) render full-bleed — no phone frame, no app nav.
 *   That's where the desktop marketing page lives.
 * - Every other route renders inside the phone frame, with desktop rails,
 *   the fixed bottom nav, and the persistent audio player.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const isLanding = pathname === '/';

  if (isLanding) {
    return <>{children}</>;
  }

  return (
    <>
      <DesktopRails />
      <div className="phone relative z-10">
        <main className="screen">{children}</main>
      </div>
      <Player />
      <BottomNav />
    </>
  );
}
