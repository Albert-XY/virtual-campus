'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import {
  ChevronRight,
  ClipboardList,
  FileText,
  Star,
  Bell,
  Settings,
  Palette,
  LogOut,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

interface SidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userNickname: string
  unreadBroadcasts: number
}

// 导航菜单定义
const menuSections = [
  {
    title: '规划管理',
    icon: ClipboardList,
    items: [
      { label: '日规划', href: '/dashboard' },
      { label: '周规划', href: '/dashboard?tab=weekly' },
      { label: '月规划', href: '/dashboard?tab=monthly' },
    ],
  },
  {
    title: '总结',
    icon: FileText,
    items: [
      { label: '日总结', href: '/review/daily' },
      { label: '周总结', href: '/review/weekly' },
      { label: '月总结', href: '/review/monthly' },
    ],
  },
  { title: '积分详情', icon: Star, href: '/profile/points' },
  { title: '播报存档', icon: Bell, href: '/broadcasts' },
  { title: '外观设置', icon: Palette, href: '/profile/appearance' },
  { title: '个人设置', icon: Settings, href: '/profile/settings' },
]

export default function Sidebar({
  open,
  onOpenChange,
  userNickname,
  unreadBroadcasts,
}: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.auth.signOut()
    onOpenChange(false)
    router.push('/')
  }

  const isActive = (href: string) => {
    if (href.includes('?')) {
      const [path] = href.split('?')
      return pathname === path
    }
    return pathname === href
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-72 p-0"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderLeft: '1px solid var(--border-color)',
        }}
      >
        {/* 用户信息区域 */}
        <SheetHeader className="border-b px-4 py-4" style={{ borderColor: 'var(--border-color)' }}>
          <SheetTitle
            className="text-base font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            {userNickname}
          </SheetTitle>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            虚拟校园
          </p>
        </SheetHeader>

        {/* 导航列表 */}
        <nav className="flex-1 overflow-y-auto px-2 py-2">
          {menuSections.map((section) => {
            const SectionIcon = section.icon

            if ('items' in section && section.items) {
              // 分组导航
              return (
                <div key={section.title} className="mb-1">
                  <div
                    className="flex items-center gap-2 px-2 py-2 text-xs font-medium"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <SectionIcon className="size-3.5" />
                    {section.title}
                  </div>
                  {section.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => onOpenChange(false)}
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors"
                      style={{
                        color: isActive(item.href)
                          ? 'var(--accent-color)'
                          : 'var(--text-primary)',
                        backgroundColor: isActive(item.href)
                          ? 'var(--accent-light, rgba(0,0,0,0.05))'
                          : 'transparent',
                      }}
                    >
                      <span>{item.label}</span>
                      <ChevronRight
                        className="size-4"
                        style={{ color: 'var(--text-muted)' }}
                      />
                    </Link>
                  ))}
                </div>
              )
            }

            // 单项导航
            const href = (section as { href: string }).href
            return (
              <Link
                key={section.title}
                href={href}
                onClick={() => onOpenChange(false)}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors"
                style={{
                  color: isActive(href)
                    ? 'var(--accent-color)'
                    : 'var(--text-primary)',
                  backgroundColor: isActive(href)
                    ? 'var(--accent-light, rgba(0,0,0,0.05))'
                    : 'transparent',
                }}
              >
                <div className="flex items-center gap-3">
                  <SectionIcon className="size-4" />
                  <span>{section.title}</span>
                  {section.title === '播报存档' && unreadBroadcasts > 0 && (
                    <span
                      className="flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: 'var(--danger, #EF4444)' }}
                    >
                      {unreadBroadcasts > 9 ? '9+' : unreadBroadcasts}
                    </span>
                  )}
                </div>
                <ChevronRight
                  className="size-4"
                  style={{ color: 'var(--text-muted)' }}
                />
              </Link>
            )
          })}
        </nav>

        {/* 底部退出登录 */}
        <div className="border-t px-2 py-3" style={{ borderColor: 'var(--border-color)' }}>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors"
            style={{ color: 'var(--danger, #EF4444)' }}
          >
            <div className="flex items-center gap-3">
              <LogOut className="size-4" />
              <span>退出登录</span>
            </div>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
