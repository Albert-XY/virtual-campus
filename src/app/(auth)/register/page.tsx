'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (password !== confirmPassword) {
      toast.error('两次输入的密码不一致');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      toast.error('密码长度至少为6位');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nickname: nickname || null,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('注册成功，请查收验证邮件');
    } catch {
      toast.error('注册失败，请稍后重试');
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
          注册
        </h2>
        <p
          className="mt-1 text-sm"
          style={{ color: 'var(--text-muted)' }}
        >
          创建你的虚拟校园账号
        </p>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
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

        {/* 昵称 */}
        <div className="space-y-2">
          <Label
            htmlFor="nickname"
            style={{ color: 'var(--text-secondary)' }}
          >
            昵称（可选）
          </Label>
          <Input
            id="nickname"
            type="text"
            placeholder="给自己取个名字"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
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
            placeholder="至少6位密码"
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

        {/* 确认密码 */}
        <div className="space-y-2">
          <Label
            htmlFor="confirmPassword"
            style={{ color: 'var(--text-secondary)' }}
          >
            确认密码
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="再次输入密码"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        {/* 注册按钮 */}
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
          注册
        </button>

        {/* 登录链接 */}
        <p
          className="text-center text-sm"
          style={{ color: 'var(--text-muted)' }}
        >
          已有账号？{' '}
          <Link
            href="/login"
            className="hover:underline"
            style={{ color: 'var(--accent-color)' }}
          >
            去登录
          </Link>
        </p>
      </form>
    </div>
  );
}
