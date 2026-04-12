'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Map, ClipboardList, Star, User } from 'lucide-react';

const navItems = [
  { href: '/today', label: '今日', icon: Home },
  { href: '/campus', label: '校园', icon: Map },
  { href: '/dashboard', label: '规划', icon: ClipboardList },
  { href: '/profile/points', label: '积分', icon: Star },
  { href: '/profile', label: '我的', icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [showReviewDot, setShowReviewDot] = useState(false);

  useEffect(() => {
    const checkReviewStatus = async () => {
      const hour = new Date().getHours();
      // Only show dot after 20:00
      if (hour < 20) {
        setShowReviewDot(false);
        return;
      }

      try {
        const res = await fetch('/api/reviews?period=daily');
        if (res.ok) {
          const json = await res.json();
          // Show dot if no review yet
          setShowReviewDot(!json.has_review);
        }
      } catch {
        // Silently fail
      }
    };

    checkReviewStatus();
  }, [pathname]);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t"
      style={{
        backgroundColor: 'var(--nav-bg)',
        borderColor: 'var(--border-color)',
      }}
    >
      <div className="mx-auto flex h-14 max-w-lg items-center justify-around">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          // Show review dot on the "规划" tab
          const shouldShowDot = item.href === '/dashboard' && showReviewDot;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-1 flex-col items-center gap-0.5 py-1 text-xs transition-colors"
              style={{
                color: isActive
                  ? 'var(--nav-active)'
                  : 'var(--nav-inactive)',
              }}
            >
              <div className="relative">
                <Icon className="size-5" />
                {shouldShowDot && (
                  <span
                    className="absolute -top-1 -right-1 size-2"
                    style={{
                      borderRadius: '50%',
                      backgroundColor: 'var(--danger)',
                      border: '1.5px solid var(--nav-bg)',
                    }}
                  />
                )}
              </div>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
