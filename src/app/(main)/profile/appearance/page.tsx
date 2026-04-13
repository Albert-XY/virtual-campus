'use client'

import { useTheme } from '@/hooks/useTheme'
import { themes, themeIds, type ThemeId } from '@/lib/themes'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Check } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

const themeDescriptions: Record<ThemeId, string> = {
  journal: '暖色调纸张质感，像贴在手账上的纸片，温馨治愈',
  pixel: '8-bit复古游戏世界，像素网格与霓虹色彩',
  zen: '留白与克制，和纸质感，无印良品般的宁静',
  magazine: '大胆撞色与霓虹发光，Z世代潮流视觉',
  'star-citizen': '深空全息投影，蓝色辉光与半透明面板，沉浸式科幻座舱',
  'mirrors-edge': '极简纯净与高对比红色指引，跑者视角的极致克制美学',
}

const themeColorBars: Record<ThemeId, { colors: string[]; label: string }> = {
  journal: {
    colors: ['#FBF7F0', '#C4704B', '#5B7B6F', '#8B6F4E', '#7B6B8A'],
    label: '暖米 / 赤陶 / 墨绿 / 棕 / 薰衣草',
  },
  pixel: {
    colors: ['#1A1A2E', '#E94560', '#4ECCA3', '#FFE66D', '#533483'],
    label: '深蓝 / 游戏红 / 像素绿 / 金黄 / 紫',
  },
  zen: {
    colors: ['#FAFAF8', '#C73E3A', '#2C2C2C', '#5B8C5A', '#E0DCD5'],
    label: '和纸 / 朱红 / 墨 / 和绿 / 素边',
  },
  magazine: {
    colors: ['#0D0D0D', '#FF3D00', '#00E5FF', '#AA00FF', '#00E676'],
    label: '纯黑 / 亮橙红 / 青 / 霓虹紫 / 霓虹绿',
  },
  'star-citizen': {
    colors: ['#0A1628', '#0099DD', '#00CC66', '#FF8800', '#AA00FF'],
    label: '深空 / 全息蓝 / 就绪绿 / 警告橙 / 扫描紫',
  },
  'mirrors-edge': {
    colors: ['#F5F5F5', '#E8302A', '#F5A623', '#4A90D9', '#1A1A1A'],
    label: '纯白 / 跑者红 / 辅助橙 / 天空蓝 / 墨黑',
  },
}

export default function AppearancePage() {
  const { theme, setTheme } = useTheme()

  const handleThemeChange = (id: ThemeId) => {
    setTheme(id)
    toast.success(`已切换到「${themes[id].name}」`)
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/profile">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">外观设置</h1>
          <p className="text-sm text-muted-foreground">选择你喜欢的视觉风格</p>
        </div>
      </div>

      {/* Theme cards */}
      <div className="space-y-4">
        {themeIds.map((id) => {
          const config = themes[id]
          const isActive = theme === id
          const colorBar = themeColorBars[id]

          return (
            <Card
              key={id}
              className={`relative overflow-hidden transition-all cursor-pointer ${
                isActive
                  ? 'ring-2 ring-[var(--accent-color)]'
                  : 'hover:ring-1 hover:ring-[var(--border-color)]'
              }`}
              onClick={() => handleThemeChange(id)}
            >
              {isActive && (
                <div className="absolute top-3 right-3 z-10">
                  <div
                    className="flex items-center justify-center size-6 rounded-full text-white text-xs"
                    style={{ backgroundColor: 'var(--accent-color)' }}
                  >
                    <Check className="size-4" />
                  </div>
                </div>
              )}

              <CardContent className="p-4">
                {/* Theme name and preview */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{config.preview}</span>
                  <div>
                    <h3 className="font-bold text-base">{config.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {themeDescriptions[id]}
                    </p>
                  </div>
                </div>

                {/* Color preview bar */}
                <div className="flex gap-1 mb-2">
                  {colorBar.colors.map((color, i) => (
                    <div
                      key={i}
                      className="h-8 flex-1 rounded-sm transition-transform hover:scale-105"
                      style={{
                        backgroundColor: color,
                        border: '1px solid var(--border-color)',
                      }}
                    />
                  ))}
                </div>

                {/* Color labels */}
                <p className="text-xs text-muted-foreground">
                  {colorBar.label}
                </p>

                {/* Font info */}
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>标题: {config.fonts.display.split(',')[0].replace(/'/g, '')}</span>
                  <span className="text-border">|</span>
                  <span>正文: {config.fonts.body.split(',')[0].replace(/'/g, '')}</span>
                </div>

                {/* Apply button */}
                <div className="mt-3">
                  <Button
                    variant={isActive ? 'secondary' : 'outline'}
                    size="sm"
                    className="w-full"
                    disabled={isActive}
                  >
                    {isActive ? '当前使用中' : '应用此主题'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
