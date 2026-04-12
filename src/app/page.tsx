'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  BookOpen,
  Timer,
  ClipboardList,
  Target,
  Loader2,
  ArrowRight,
} from 'lucide-react';

const features = [
  {
    icon: BookOpen,
    title: '虚拟场景学习',
    description: '沉浸式虚拟校园场景，让学习更有趣',
  },
  {
    icon: Timer,
    title: '番茄钟专注管理',
    description: '科学时间管理，提升学习效率',
  },
  {
    icon: ClipboardList,
    title: '智能规划系统',
    description: 'AI辅助制定个性化学习计划',
  },
  {
    icon: Target,
    title: '积分行为规范',
    description: '积分激励体系，培养良好习惯',
  },
];

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        router.push('/');
        return;
      }

      setLoading(false);
    };

    checkAuth();
    // Trigger fade-in animation after mount
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--accent-color)' }} />
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center px-4 py-12 transition-opacity duration-700 ease-out"
      style={{
        backgroundColor: 'var(--bg-primary)',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(12px)',
      }}
    >
      {/* 主标题区域 */}
      <div className="mb-10 text-center">
        <h1
          className="text-5xl font-bold tracking-tight"
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--accent-color)',
          }}
        >
          虚拟校园
        </h1>
        <p
          className="mt-3 text-xl"
          style={{ color: 'var(--text-secondary)' }}
        >
          先规划，再行动
        </p>
        <p
          className="mt-1 text-sm"
          style={{ color: 'var(--text-muted)' }}
        >
          假期自主学习平台
        </p>
      </div>

      {/* 功能介绍卡片 */}
      <div className="mb-10 grid w-full max-w-md grid-cols-2 gap-3">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className="flex flex-col items-center rounded-xl p-4 text-center transition-all duration-300 ease-out cursor-default"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(16px)',
                transitionDelay: `${150 + index * 80}ms`,
                transitionProperty: 'opacity, transform, box-shadow',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow)';
              }}
            >
              <div
                className="mb-2 flex size-10 items-center justify-center rounded-full"
                style={{ backgroundColor: 'var(--accent-light)' }}
              >
                <Icon className="size-5" style={{ color: 'var(--accent-color)' }} />
              </div>
              <h3
                className="text-sm font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                {feature.title}
              </h3>
              <p
                className="mt-1 text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                {feature.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* 操作按钮 */}
      <div className="flex w-full max-w-md gap-3">
        <Link href="/login" className="flex-1">
          <button
            className="w-full rounded-xl py-3 text-base font-semibold text-white transition-all duration-200 active:scale-[0.97]"
            style={{
              backgroundColor: 'var(--accent-color)',
              boxShadow: 'var(--shadow-lg)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--accent-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--accent-color)';
            }}
          >
            登录
          </button>
        </Link>
        <Link href="/register" className="flex-1">
          <button
            className="w-full rounded-xl border-2 py-3 text-base font-semibold transition-all duration-200 active:scale-[0.97]"
            style={{
              backgroundColor: 'transparent',
              borderColor: 'var(--accent-color)',
              color: 'var(--accent-color)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--accent-light)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            注册
          </button>
        </Link>
      </div>

      {/* 底部说明 */}
      <p
        className="mt-auto pt-12 text-xs"
        style={{ color: 'var(--text-muted)' }}
      >
        完全免费 · 面向学生
      </p>
    </div>
  );
}
