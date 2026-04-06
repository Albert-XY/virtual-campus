'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import ProtectedRoute from '@/components/ProtectedRoute';
import BottomNav from '@/components/BottomNav';
import { Star } from 'lucide-react';
import Link from 'next/link';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [points, setPoints] = useState<number | null>(null);

  useEffect(() => {
    const fetchPoints = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('total_points')
          .eq('id', user.id)
          .single();
        if (data) {
          setPoints(data.total_points);
        }
      }
    };

    fetchPoints();
  }, []);

  return (
    <ProtectedRoute>
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="mx-auto flex h-12 max-w-lg items-center justify-between px-4">
          <h1 className="text-lg font-bold text-foreground">
            虚拟校园
          </h1>
          <Link
            href="/profile/points"
            className="flex items-center gap-1 text-sm transition-colors"
            style={{ color: 'var(--points-color)' }}
          >
            <Star className="size-4" style={{ color: 'var(--points-color)' }} />
            <span>{points ?? '--'}</span>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="pb-16">{children}</main>

      {/* Bottom navigation */}
      <BottomNav />
    </ProtectedRoute>
  );
}
