'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Map, User } from 'lucide-react'

/**
 * BottomNav - 底部导航栏
 *
 * 只有3个Tab：看板、校园、我的
 *
 * 设计理念：
 * - 看板 = 你的课桌，一眼看到今天要做什么
 * - 校园 = 从这里走到各个场景（图书馆/自习室/宿舍）
 * - 我的 = 个人相关（设置、外观、积分）
 *
 * 规划和积分不再作为独立Tab，避免功能碎片化
 */

const navItems = [
  {
    href: '/',
    label: '看板',
    icon: LayoutDashboard,
    guideId: 'guide-nav-today',
  },
  {
    href: '/campus',
    label: '校园',
    icon: Map,
    guideId: 'guide-nav-campus',
  },
  {
    href: '/profile',
    label: '我的',
    icon: User,
    guideId: 'guide-nav-profile',
  },
]

export default function BottomNav() {
  const pathname = usePathname()

  // 在沉浸式场景中隐藏底部导航
  if (typeof document !== 'undefined' && document.body.classList.contains('immersive-mode')) {
    return null
  }

  return (
    <nav
      className="bottom-nav fixed bottom-0 left-0 right-0 z-50 border-t"
      style={{
        backgroundColor: 'var(--nav-bg)',
        borderColor: 'var(--border-color)',
      }}
    >
      <div className="mx-auto flex h-14 max-w-lg items-center justify-around">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              id={item.guideId}
              className="relative flex flex-1 flex-col items-center gap-0.5 py-1 text-xs transition-colors"
              style={{
                color: isActive ? 'var(--nav-active)' : 'var(--nav-inactive)',
              }}
            >
              <Icon className="size-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
