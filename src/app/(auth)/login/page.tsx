'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('登录成功');
      router.push('/dashboard');
    } catch {
      toast.error('登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="rounded-xl p-6"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      {/* 标题 */}
      <div className="mb-6">
        <h2
          className="text-xl font-bold"
          style={{ color: 'var(--text-primary)' }}
        >
          登录
        </h2>
        <p
          className="mt-1 text-sm"
          style={{ color: 'var(--text-muted)' }}
        >
          输入你的账号信息登录虚拟校园
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        {/* 邮箱 */}
        <div className="space-y-2">
          <Label
            htmlFor="email"
            style={{ color: 'var(--text-secondary)' }}
          >
            邮箱
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="请输入邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        {/* 密码 */}
        <div className="space-y-2">
          <Label
            htmlFor="password"
            style={{ color: 'var(--text-secondary)' }}
          >
            密码
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="请输入密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        {/* 登录按钮 */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-all duration-200 active:scale-[0.97] disabled:opacity-50"
          style={{
            backgroundColor: 'var(--accent-color)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent-color)';
          }}
        >
          {loading && <Loader2 className="animate-spin" />}
          登录
        </button>

        {/* 注册链接 */}
        <p
          className="text-center text-sm"
          style={{ color: 'var(--text-muted)' }}
        >
          没有账号？{' '}
          <Link
            href="/register"
            className="hover:underline"
            style={{ color: 'var(--accent-color)' }}
          >
            去注册
          </Link>
        </p>
      </form>
    </div>
  );
}
