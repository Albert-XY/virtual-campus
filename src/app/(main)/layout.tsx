'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ProtectedRoute from '@/components/ProtectedRoute'
import Sidebar from '@/components/navigation/Sidebar'
import BottomNav from '@/components/BottomNav'
import OnboardingFlow from '@/components/onboarding/OnboardingFlow'
import ThemeDecorations from '@/components/theme/ThemeDecorations'
import { getStoredTheme } from '@/lib/themes'
import { Star, Bell, Menu } from 'lucide-react'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [points, setPoints] = useState<number | null>(null)
  const [nickname, setNickname] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unreadBroadcasts, setUnreadBroadcasts] = useState(0)
  const [currentTheme, setCurrentTheme] = useState<string>('journal')

  // 获取当前主题
  useEffect(() => {
    const theme = getStoredTheme()
    setCurrentTheme(theme)

    const handleThemeChange = () => {
      setCurrentTheme(getStoredTheme())
    }
    window.addEventListener('themechange', handleThemeChange)
    return () => window.removeEventListener('themechange', handleThemeChange)
  }, [])

  // 获取用户积分和昵称
  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('total_points, nickname')
          .eq('id', user.id)
          .single()
        if (profile) {
          setPoints(profile.total_points)
          setNickname(profile.nickname || '同学')
        }
        try {
          const { count } = await supabase
            .from('broadcasts')
            .select('*', { count: 'exact', head: true })
            .eq('is_published', true)
            .not('broadcast_views', 'broadcast_id', { user_id: user.id })
          setUnreadBroadcasts(count || 0)
        } catch {
          // broadcasts 表可能尚未创建，忽略
        }
      }
    }
    fetchData()
  }, [])

  return (
    <ProtectedRoute>
      {/* 主题装饰层 */}
      <ThemeDecorations theme={currentTheme} />

      {/* 顶部栏 */}
      <header className="app-header sticky top-0 z-40 border-b">
        <div className="mx-auto flex h-12 max-w-lg items-center justify-between px-4">
          <h1 className="page-title text-lg font-bold">
            虚拟校园
          </h1>
          <div className="flex items-center gap-3">
            <button className="points-display flex items-center gap-1 text-sm">
              <Star className="size-4" />
              <span>{points ?? '--'}</span>
            </button>
            <button
              className="notification-btn relative"
              onClick={() => {
                /* TODO: 打开播报弹窗 */
              }}
            >
              <Bell className="size-5 text-muted" />
              {unreadBroadcasts > 0 && (
                <span className="notification-badge absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full text-[10px] font-bold text-white">
                  {unreadBroadcasts > 9 ? '9+' : unreadBroadcasts}
                </span>
              )}
            </button>
            <button onClick={() => setSidebarOpen(true)} className="menu-btn">
              <Menu className="size-5 text-muted" />
            </button>
          </div>
        </div>
      </header>

      {/* 主内容区 - 底部留出导航栏空间 */}
      <main className="mx-auto max-w-lg pb-14">{children}</main>

      {/* 底部导航栏 */}
      <BottomNav />

      {/* 侧边栏 */}
      <Sidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        userNickname={nickname}
        unreadBroadcasts={unreadBroadcasts}
      />

      {/* 新用户引导 */}
      <OnboardingFlow />
    </ProtectedRoute>
  )
}
