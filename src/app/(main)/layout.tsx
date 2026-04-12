'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ProtectedRoute from '@/components/ProtectedRoute'
import Sidebar from '@/components/navigation/Sidebar'
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
        // 获取未读播报数量（容错：表不存在时跳过）
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
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="mx-auto flex h-12 max-w-lg items-center justify-between px-4">
          <h1
            className="text-lg font-bold"
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--text-primary)',
            }}
          >
            虚拟校园
          </h1>
          <div className="flex items-center gap-3">
            <button
              className="flex items-center gap-1 text-sm"
              style={{ color: 'var(--points-color, var(--accent-color))' }}
            >
              <Star className="size-4" />
              <span>{points ?? '--'}</span>
            </button>
            <button
              className="relative"
              onClick={() => {
                /* TODO: 打开播报弹窗 */
              }}
            >
              <Bell
                className="size-5"
                style={{ color: 'var(--text-secondary)' }}
              />
              {unreadBroadcasts > 0 && (
                <span
                  className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: 'var(--danger, #EF4444)' }}
                >
                  {unreadBroadcasts > 9 ? '9+' : unreadBroadcasts}
                </span>
              )}
            </button>
            <button onClick={() => setSidebarOpen(true)}>
              <Menu
                className="size-5"
                style={{ color: 'var(--text-secondary)' }}
              />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-lg">{children}</main>
      <Sidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        userNickname={nickname}
        unreadBroadcasts={unreadBroadcasts}
      />
    </ProtectedRoute>
  )
}
