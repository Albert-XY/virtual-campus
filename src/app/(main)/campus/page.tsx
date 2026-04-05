'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Lock, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { SceneType } from '@/types'

// ============================================================
// 场景配置
// ============================================================
interface SceneConfig {
  id: SceneType
  name: string
  emoji: string
  description: string
  color: string
  href: string
  available: boolean
}

const scenes: SceneConfig[] = [
  {
    id: 'library',
    name: '图书馆',
    emoji: '\u{1F4DA}',
    description: '观看学习视频，掌握知识点',
    color: '#1E40AF',
    href: '/campus/library',
    available: true,
  },
  {
    id: 'study-room',
    name: '自习室',
    emoji: '\u270F\uFE0F',
    description: '完成练习任务，检验学习成果',
    color: '#16A34A',
    href: '/campus/study-room',
    available: true,
  },
  {
    id: 'dormitory',
    name: '宿舍',
    emoji: '\u{1F319}',
    description: '记录睡眠时间，养成早睡习惯',
    color: '#7C3AED',
    href: '/campus/dormitory',
    available: true,
  },
  {
    id: 'exam-center',
    name: '考试中心',
    emoji: '\u{1F3EB}',
    description: '综合测评',
    color: '#6B7280',
    href: '/campus/exam-center',
    available: false,
  },
  {
    id: 'sports',
    name: '运动场',
    emoji: '\u26BD',
    description: '运动健身',
    color: '#6B7280',
    href: '/campus/sports',
    available: false,
  },
  {
    id: 'canteen',
    name: '食堂',
    emoji: '\u{1F35C}',
    description: '休息餐饮',
    color: '#6B7280',
    href: '/campus/canteen',
    available: false,
  },
  {
    id: 'bulletin',
    name: '公告栏',
    emoji: '\u{1F4CB}',
    description: '校园公告',
    color: '#6B7280',
    href: '/campus/bulletin',
    available: false,
  },
  {
    id: 'shop',
    name: '校园商店',
    emoji: '\u{1F3EA}',
    description: '积分兑换',
    color: '#6B7280',
    href: '/campus/shop',
    available: false,
  },
]

// ============================================================
// 场景卡片组件
// ============================================================
function SceneCard({
  scene,
  locked,
}: {
  scene: SceneConfig
  locked: boolean
}) {
  const isAvailable = scene.available && !locked

  return (
    <div className="relative">
      {isAvailable ? (
        <Link href={scene.href} className="block">
          <div
            className="flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all active:scale-[0.97]"
            style={{
              borderColor: scene.color,
              backgroundColor: `${scene.color}08`,
            }}
          >
            <span className="text-3xl">{scene.emoji}</span>
            <span className="text-sm font-semibold" style={{ color: scene.color }}>
              {scene.name}
            </span>
            <span className="text-xs text-muted-foreground text-center leading-tight">
              {scene.description}
            </span>
            <Badge
              className="mt-1"
              style={{
                backgroundColor: `${scene.color}15`,
                color: scene.color,
                border: `1px solid ${scene.color}30`,
              }}
            >
              可进入
            </Badge>
          </div>
        </Link>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-gray-200 bg-gray-50 p-4 opacity-70">
          <span className="text-3xl grayscale">{scene.emoji}</span>
          <span className="text-sm font-semibold text-gray-400">
            {scene.name}
          </span>
          <span className="text-xs text-gray-400 text-center leading-tight">
            {scene.description}
          </span>
          <Badge variant="secondary" className="mt-1 text-gray-400">
            {locked ? (
              <>
                <Lock className="size-3 mr-1" />
                锁定
              </>
            ) : (
              '即将开放'
            )}
          </Badge>
        </div>
      )}
    </div>
  )
}

// ============================================================
// 主页面
// ============================================================
export default function CampusPage() {
  const [loading, setLoading] = useState(true)
  const [hasPlan, setHasPlan] = useState(false)

  useEffect(() => {
    const checkPlan = async () => {
      try {
        const res = await fetch('/api/plan/check')
        if (res.ok) {
          const data = await res.json()
          setHasPlan(data.has_plan)
        }
      } catch (error) {
        console.error('检查规划失败:', error)
      } finally {
        setLoading(false)
      }
    }

    checkPlan()
  }, [])

  // 加载状态
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#1E40AF]" />
      </div>
    )
  }

  // 获取今日日期
  const today = new Date()
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  const weekDay = `星期${weekDays[today.getDay()]}`

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      {/* 页面标题区域 */}
      {hasPlan ? (
        <div className="mb-6 space-y-1">
          <h2 className="text-xl font-bold text-[#1E40AF]">虚拟校园</h2>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="size-4" />
            <span>{dateStr} {weekDay}</span>
          </div>
        </div>
      ) : (
        <div className="mb-6 rounded-xl border border-[#F97316]/20 bg-[#F97316]/5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F97316]/10">
              <Lock className="size-5 text-[#F97316]" />
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-[#F97316]">
                请先完成今日规划才能进入校园
              </p>
              <p className="text-xs text-muted-foreground">
                完成每日学习规划后，即可解锁校园中的各个场景
              </p>
              <Link href="/dashboard">
                <Button
                  size="sm"
                  className="bg-[#F97316] hover:bg-[#F97316]/90 text-white"
                >
                  去规划
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 场景网格 */}
      <div className="grid grid-cols-2 gap-3">
        {scenes.map((scene) => (
          <SceneCard
            key={scene.id}
            scene={scene}
            locked={!hasPlan}
          />
        ))}
      </div>
    </div>
  )
}
