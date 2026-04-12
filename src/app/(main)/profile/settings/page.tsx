'use client'

import Link from 'next/link'
import { toast } from 'sonner'
import { resetGuide } from '@/lib/guide'
// TODO: 引导系统暂时停用，后续重新适配
// import { useGuide } from '@/components/GuideProvider'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useTheme } from '@/hooks/useTheme'
import { themes, type ThemeId } from '@/lib/themes'
import {
  Bell,
  Moon,
  Info,
  ArrowLeft,
  ChevronRight,
  Palette,
  Check,
  RotateCcw,
} from 'lucide-react'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  // TODO: 引导系统暂时停用，后续重新适配
  // const { startGuide } = useGuide()

  const handleThemeChange = (themeId: ThemeId) => {
    setTheme(themeId)
    toast.success(`已切换到「${themes[themeId].name}」主题`)
  }

  const handleResetGuide = () => {
    resetGuide()
    toast.success('引导已重置，重新适配后可用')
    // TODO: 引导系统暂时停用，后续重新适配
    // setTimeout(() => {
    //   startGuide()
    // }, 500)
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
      {/* Top navigation */}
      <div className="flex items-center gap-3">
        <Link href="/profile">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-bold">设置</h1>
      </div>

      {/* Theme selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="size-4" style={{ color: 'var(--accent-color)' }} />
            主题风格
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(themes) as ThemeId[]).map((themeId) => {
              const themeConfig = themes[themeId]
              const isActive = theme === themeId

              return (
                <button
                  key={themeId}
                  onClick={() => handleThemeChange(themeId)}
                  className="relative p-4 text-left transition-all duration-300 active:scale-[0.97]"
                  style={{
                    borderRadius: 'var(--radius-md)',
                    border: isActive
                      ? '2px solid var(--accent-color)'
                      : '2px solid var(--border-color)',
                    backgroundColor: isActive
                      ? 'var(--accent-light)'
                      : 'var(--bg-card)',
                    boxShadow: isActive ? 'var(--shadow-lg)' : 'var(--shadow)',
                  }}
                >
                  {/* Active check indicator */}
                  {isActive && (
                    <div
                      className="absolute top-2 right-2 flex size-5 items-center justify-center"
                      style={{
                        borderRadius: '50%',
                        backgroundColor: 'var(--accent-color)',
                      }}
                    >
                      <Check className="size-3 text-white" />
                    </div>
                  )}

                  <div className="text-3xl mb-2">{themeConfig.preview}</div>
                  <h3
                    className="text-sm font-bold mb-0.5"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {themeConfig.name}
                  </h3>
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {themeConfig.description}
                  </p>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Notification settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="size-4" style={{ color: 'var(--accent-color)' }} />
            通知设置
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="divide-y">
            <button
              onClick={() => toast.info('通知设置功能即将开放，敬请期待')}
              className="w-full"
            >
              <div className="flex items-center justify-between px-4 py-3 transition-colors" style={{ color: 'var(--text-primary)' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span className="text-sm">学习提醒</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>即将开放</span>
                  <ChevronRight className="size-4" style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>
            </button>
            <button
              onClick={() => toast.info('通知设置功能即将开放，敬请期待')}
              className="w-full"
            >
              <div className="flex items-center justify-between px-4 py-3 transition-colors"
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span className="text-sm">打卡提醒</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>即将开放</span>
                  <ChevronRight className="size-4" style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="size-4" style={{ color: 'var(--accent-color)' }} />
            外观
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="divide-y">
            <button
              onClick={() => toast.info('深色模式功能即将开放，敬请期待')}
              className="w-full"
            >
              <div className="flex items-center justify-between px-4 py-3 transition-colors"
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span className="text-sm">深色模式</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>即将开放</span>
                  <ChevronRight className="size-4" style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="size-4" style={{ color: 'var(--accent-color)' }} />
            关于
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>应用名称</span>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>虚拟校园</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>版本号</span>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>v0.1.0</span>
          </div>
          <Separator />
          <div className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            虚拟校园是一款面向学生的自主学习平台，通过游戏化的方式帮助学生养成良好学习习惯。包含每日规划、番茄钟专注、场景打卡、睡眠管理等核心功能。
          </div>
        </CardContent>
      </Card>

      {/* Guide reset */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="size-4" style={{ color: 'var(--accent-color)' }} />
            新手引导
          </CardTitle>
        </CardHeader>
        <CardContent>
          <button
            onClick={handleResetGuide}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all active:scale-[0.98]"
            style={{
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
            }}
          >
            <RotateCcw className="size-4" />
            重新查看引导教程
          </button>
          <p className="mt-2 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
            重新体验新手引导，了解平台各项功能
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
