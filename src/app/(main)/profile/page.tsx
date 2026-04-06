'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types'
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Star,
  Clock,
  Moon,
  BarChart3,
  CalendarDays,
  Settings,
  Palette,
  HelpCircle,
  LogOut,
  Loader2,
  Pencil,
  ChevronRight,
} from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [todayFocus, setTodayFocus] = useState<number>(0)
  const [sleepStreak, setSleepStreak] = useState<number>(0)

  // 编辑昵称
  const [editOpen, setEditOpen] = useState(false)
  const [newNickname, setNewNickname] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/profile')
      const data = await res.json()
      if (res.ok && data.profile) {
        setProfile(data.profile)
        setNewNickname(data.profile.nickname)
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      // 今日专注
      const pomRes = await fetch('/api/pomodoro')
      const pomData = await pomRes.json()
      if (pomRes.ok) {
        setTodayFocus(pomData.total_focus_minutes ?? 0)
      }

      // 连续早睡
      const sleepRes = await fetch('/api/sleep?action=streak')
      const sleepData = await sleepRes.json()
      if (sleepRes.ok) {
        setSleepStreak(sleepData.streak ?? 0)
      }
    } catch (error) {
      console.error('获取统计数据失败:', error)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      await fetchProfile()
      await fetchStats()
      setLoading(false)
    }
    init()
  }, [fetchProfile, fetchStats])

  const handleSaveNickname = async () => {
    if (!newNickname.trim()) {
      toast.error('昵称不能为空')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: newNickname }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('昵称更新成功')
        setEditOpen(false)
        await fetchProfile()
      } else {
        toast.error(data.error || '更新失败')
      }
    } catch {
      toast.error('网络错误')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const getJoinedDays = (createdAt: string) => {
    const created = new Date(createdAt)
    const now = new Date()
    const diffMs = now.getTime() - created.getTime()
    return Math.floor(diffMs / (1000 * 60 * 60 * 24))
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[var(--accent)]" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">无法加载用户信息</p>
      </div>
    )
  }

  const joinedDays = getJoinedDays(profile.created_at)
  const initial = profile.nickname ? profile.nickname.charAt(0).toUpperCase() : '?'

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
      {/* 用户信息卡片 */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] px-4 pt-6 pb-8 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="size-16 ring-2 ring-white/30">
                {profile.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt={profile.nickname} />
                ) : null}
                <AvatarFallback className="bg-white/20 text-white text-xl font-bold">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-bold">{profile.nickname}</h2>
                <p className="text-sm text-white/70">{profile.email}</p>
              </div>
            </div>
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-white hover:bg-white/20"
                  />
                }
              >
                <Pencil className="size-4" />
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>编辑昵称</DialogTitle>
                  <DialogDescription>修改你的显示昵称（1-20个字符）</DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <Label htmlFor="nickname">昵称</Label>
                  <Input
                    id="nickname"
                    value={newNickname}
                    onChange={(e) => setNewNickname(e.target.value)}
                    maxLength={20}
                    placeholder="请输入昵称"
                  />
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setEditOpen(false)}
                    disabled={saving}
                  >
                    取消
                  </Button>
                  <Button
                    onClick={handleSaveNickname}
                    disabled={saving}
                    className="bg-[var(--accent)] hover:bg-[var(--accent-hover)]"
                  >
                    {saving && <Loader2 className="size-4 animate-spin" />}
                    保存
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className="text-white border-0" style={{ backgroundColor: 'var(--accent-color)' }}>
                Lv.{profile.current_level}
              </Badge>
              <span className="text-sm text-muted-foreground">
                已加入 {joinedDays} 天
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 数据概览 */}
      <div className="grid grid-cols-3 gap-3">
        <Card size="sm">
          <CardContent className="flex flex-col items-center gap-1 py-2">
            <div
              className="flex items-center justify-center size-9 rounded-full"
              style={{ backgroundColor: 'var(--points-bg)' }}
            >
              <Star className="size-5" style={{ color: 'var(--points-color)' }} />
            </div>
            <span className="text-lg font-bold" style={{ color: 'var(--points-text)' }}>
              {profile.total_points}
            </span>
            <span className="text-xs text-muted-foreground">总积分</span>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent className="flex flex-col items-center gap-1 py-2">
            <div
              className="flex items-center justify-center size-9 rounded-full"
              style={{ backgroundColor: 'var(--scene-library-bg)' }}
            >
              <Clock className="size-5" style={{ color: 'var(--scene-library)' }} />
            </div>
            <span className="text-lg font-bold" style={{ color: 'var(--scene-library)' }}>
              {todayFocus}
            </span>
            <span className="text-xs text-muted-foreground">今日专注(分)</span>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent className="flex flex-col items-center gap-1 py-2">
            <div
              className="flex items-center justify-center size-9 rounded-full"
              style={{ backgroundColor: 'var(--scene-dorm-bg)' }}
            >
              <Moon className="size-5" style={{ color: 'var(--scene-dorm)' }} />
            </div>
            <span className="text-lg font-bold" style={{ color: 'var(--scene-dorm)' }}>
              {sleepStreak}
            </span>
            <span className="text-xs text-muted-foreground">连续早睡(天)</span>
          </CardContent>
        </Card>
      </div>

      {/* 功能菜单 */}
      <Card>
        <CardHeader>
          <CardTitle>功能菜单</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="divide-y">
            <Link href="/profile/points">
              <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <BarChart3 className="size-5 text-[var(--accent)]" />
                  <span className="text-sm">积分详情</span>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            </Link>

            <button
              onClick={() => toast.info('学习记录功能即将开放，敬请期待')}
              className="w-full"
            >
              <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <CalendarDays className="size-5 text-[var(--accent)]" />
                  <span className="text-sm">学习记录</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">即将开放</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </div>
            </button>

            <Link href="/profile/appearance">
              <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <Palette className="size-5 text-[var(--accent)]" />
                  <span className="text-sm">外观设置</span>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            </Link>

            <Link href="/profile/settings">
              <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <Settings className="size-5 text-[var(--accent)]" />
                  <span className="text-sm">设置</span>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            </Link>

            <button
              onClick={() => toast.info('帮助与反馈功能即将开放，敬请期待')}
              className="w-full"
            >
              <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <HelpCircle className="size-5 text-[var(--accent)]" />
                  <span className="text-sm">帮助与反馈</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">即将开放</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* 退出登录 */}
      <Button
        variant="outline"
        className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={handleLogout}
      >
        <LogOut className="size-4" />
        退出登录
      </Button>
    </div>
  )
}
