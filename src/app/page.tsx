'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  Timer,
  ClipboardList,
  Target,
  Loader2,
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

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        router.push('/today');
        return;
      }

      setLoading(false);
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-12">
      {/* 主标题区域 */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight">虚拟校园</h1>
        <p className="mt-3 text-xl text-muted-foreground">先规划，再行动</p>
        <p className="mt-1 text-sm text-muted-foreground">
          假期自主学习平台
        </p>
      </div>

      {/* 功能介绍卡片 */}
      <div className="mb-12 grid w-full max-w-md grid-cols-2 gap-3">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className="flex flex-col items-center rounded-xl border bg-card p-4 text-center"
            >
              <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-primary/10">
                <Icon className="size-5 text-primary" />
              </div>
              <h3 className="text-sm font-medium">{feature.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {feature.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* 操作按钮 */}
      <div className="flex w-full max-w-md gap-3">
        <Link href="/login" className="flex-1">
          <Button className="w-full" size="lg">
            登录
          </Button>
        </Link>
        <Link href="/register" className="flex-1">
          <Button className="w-full" variant="outline" size="lg">
            注册
          </Button>
        </Link>
      </div>

      {/* 底部说明 */}
      <p className="mt-auto pt-12 text-xs text-muted-foreground">
        完全免费 · 面向学生
      </p>
    </div>
  );
}
