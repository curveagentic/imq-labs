'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Search, Plus, Chat, User } from './Icons';

const TABS = [
  { href: '/home',     icon: Home,   label: 'Home'     },
  { href: '/discover', icon: Search, label: 'Discover' },
  { href: '/messages', icon: Chat,   label: 'Messages' },
  { href: '/profile',  icon: User,   label: 'Profile'  },
];

export function BottomNav() {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const isActive = (href: string) =>
    href === '/home' ? (pathname === '/home' || pathname === '/') : pathname.startsWith(href);

  // Hide on auth/splash so the splash screens are full-bleed.
  if (pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/welcome')) {
    return null;
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 pointer-events-none"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
      <div className="phone-width pointer-events-auto">
        <div className="relative bg-ink-800/95 backdrop-blur-md border-t border-ink-500">
          <div className="grid grid-cols-5 h-16 items-center">
            {TABS.slice(0, 2).map((t) => {
              const Icon = t.icon;
              const active = isActive(t.href);
              return (
                <Link key={t.href} href={t.href} className="flex flex-col items-center gap-1">
                  <Icon className={active ? 'text-wave-500' : 'text-text-muted'} />
                  <span className={`text-[10px] ${active ? 'text-wave-500' : 'text-text-muted'}`}>{t.label}</span>
                </Link>
              );
            })}

            {/* Center FAB */}
            <button
              onClick={() => router.push('/create')}
              className="flex items-center justify-center"
              aria-label="Create"
            >
              <span className="grid place-items-center w-14 h-14 rounded-full bg-wave-500 shadow-fab -mt-6">
                <Plus className="text-white w-7 h-7" />
              </span>
            </button>

            {TABS.slice(2).map((t) => {
              const Icon = t.icon;
              const active = isActive(t.href);
              return (
                <Link key={t.href} href={t.href} className="flex flex-col items-center gap-1">
                  <Icon className={active ? 'text-wave-500' : 'text-text-muted'} />
                  <span className={`text-[10px] ${active ? 'text-wave-500' : 'text-text-muted'}`}>{t.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
