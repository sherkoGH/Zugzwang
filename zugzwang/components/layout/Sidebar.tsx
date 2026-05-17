'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Swords,
  Brain,
  User,
  Trophy,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/',            label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/play',        label: 'Play',         icon: Swords          },
  { href: '/puzzles',     label: 'Puzzles',      icon: Brain           },
  { href: '/profile',     label: 'Profile',      icon: User            },
  { href: '/leaderboard', label: 'Leaderboard',  icon: Trophy          },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-[68px] lg:w-[220px] flex flex-col bg-[#21201d] border-r border-white/5 z-40">

      {/* ── Brand ── */}
      <div className="px-3 lg:px-4 py-5 border-b border-white/5">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-[#81b64c] flex items-center justify-center flex-shrink-0 group-hover:brightness-110 transition-[filter] duration-150">
            <span className="text-[#1c1a17] font-display text-xl font-bold leading-none select-none">
              Z
            </span>
          </div>
          <span className="hidden lg:block font-display text-[#eeeed2] text-[17px] tracking-tight font-semibold">
            Zugzwang
          </span>
        </Link>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 group relative',
                isActive
                  ? 'bg-[#81b64c]/12 text-[#81b64c]'
                  : 'text-[#eeeed2]/55 hover:bg-[#454340]/60 hover:text-[#eeeed2]'
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[#81b64c]" />
              )}
              <Icon
                className={cn(
                  'w-[18px] h-[18px] flex-shrink-0',
                  'transition-transform duration-150 group-hover:scale-105'
                )}
              />
              <span className="hidden lg:block text-sm font-medium tracking-tight">
                {label}
              </span>
              {isActive && (
                <ChevronRight className="hidden lg:block w-3.5 h-3.5 ml-auto opacity-40" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Upgrade CTA ── */}
      <div className="px-2 pb-4 pt-2 border-t border-white/5">
        <Link
          href="/upgrade"
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg',
            'bg-[#81b64c]/10 border border-[#81b64c]/20',
            'text-[#81b64c] hover:bg-[#81b64c]/18 hover:border-[#81b64c]/35',
            'transition-colors duration-150 group cursor-pointer'
          )}
        >
          <Zap className="w-[18px] h-[18px] flex-shrink-0 transition-transform duration-150 group-hover:scale-110" />
          <span className="hidden lg:block text-sm font-semibold tracking-tight">
            Upgrade to Pro
          </span>
        </Link>
      </div>
    </aside>
  );
}
