'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Map, ClipboardList, Star, User } from 'lucide-react';

const navItems = [
  { href: '/campus', label: '校园', icon: Map },
  { href: '/dashboard', label: '规划', icon: ClipboardList },
  { href: '/profile/points', label: '积分', icon: Star },
  { href: '/profile', label: '我的', icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-around">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-1 text-xs transition-colors ${
                isActive ? 'text-primary' : 'text-gray-400'
              }`}
            >
              <Icon className="size-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
