'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Loader2, Lock, Clock, Flame, Star, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SceneType } from '@/types'

// ============================================================
// 场景配置
// ============================================================
interface SceneConfig {
  id: SceneType
  name: string
  emoji: string
  description: string
  href: string
  available: boolean
  gradient: string
  borderColor: string
  glowColor: string
  textColor: string
}

const availableScenes: SceneConfig[] = [
  {
    id: 'library',
    name: '图书馆',
    emoji: '\u{1F4DA}',
    description: '观看学习视频，掌握知识点',
    href: '/campus/library',
    available: true,
    gradient: 'from-blue-50 to-blue-100',
    borderColor: 'border-blue-300',
    glowColor: 'shadow-blue-200 shadow-lg',
    textColor: 'text-blue-700',
  },
  {
    id: 'study-room',
    name: '自习室',
    emoji: '\u270F\uFE0F',
    description: '完成练习任务，检验学习成果',
    href: '/campus/study-room',
    available: true,
    gradient: 'from-green-50 to-green-100',
    borderColor: 'border-green-300',
    glowColor: 'shadow-green-200 shadow-lg',
    textColor: 'text-green-700',
  },
  {
    id: 'dormitory',
    name: '宿舍',
    emoji: '\u{1F319}',
    description: '记录睡眠时间，养成早睡习惯',
    href: '/campus/dormitory',
    available: true,
    gradient: 'from-purple-50 to-purple-100',
    borderColor: 'border-purple-300',
    glowColor: 'shadow-purple-200 shadow-lg',
    textColor: 'text-purple-700',
  },
]

const upcomingScenes: SceneConfig[] = [
  {
    id: 'exam-center',
    name: '考试中心',
    emoji: '\u{1F3EB}',
    description: '综合测评',
    href: '/campus/exam-center',
    available: false,
    gradient: '',
    borderColor: '',
    glowColor: '',
    textColor: '',
  },
  {
    id: 'sports',
    name: '运动场',
    emoji: '\u26BD',
    description: '运动健身',
    href: '/campus/sports',
    available: false,
    gradient: '',
    borderColor: '',
    glowColor: '',
    textColor: '',
  },
  {
    id: 'canteen',
    name: '食堂',
    emoji: '\u{1F35C}',
    description: '休息餐饮',
    href: '/campus/canteen',
    available: false,
    gradient: '',
    borderColor: '',
    glowColor: '',
    textColor: '',
  },
  {
    id: 'bulletin',
    name: '公告栏',
    emoji: '\u{1F4CB}',
    description: '校园公告',
    href: '/campus/bulletin',
    available: false,
    gradient: '',
    borderColor: '',
    glowColor: '',
    textColor: '',
  },
  {
    id: 'shop',
    name: '校园商店',
    emoji: '\u{1F3EA}',
    description: '积分兑换',
    href: '/campus/shop',
    available: false,
    gradient: '',
    borderColor: '',
    glowColor: '',
    textColor: '',
  },
]

// ============================================================
// 工具函数
// ============================================================
function getTimeGreeting(): { emoji: string; greeting: string } {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 12) {
    return { emoji: '\u2600\uFE0F', greeting: '早上好，新的一天开始了' }
  } else if (hour >= 12 && hour < 14) {
    return { emoji: '\u{1F324}\uFE0F', greeting: '中午好，记得午休哦' }
  } else if (hour >= 14 && hour < 18) {
    return { emoji: '\u{1F324}\uFE0F', greeting: '下午好，继续加油' }
  } else if (hour >= 18 && hour < 22) {
    return { emoji: '\u{1F305}', greeting: '晚上好，今天辛苦了' }
  } else {
    return { emoji: '\u{1F319}', greeting: '夜深了，注意休息' }
  }
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}分钟`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}小时${m}分钟` : `${h}小时`
}

function getDormitoryHint(): string {
  const hour = new Date().getHours()
  if (hour >= 22 || hour < 6) {
    return '该休息了'
  }
  if (hour >= 21) {
    return '快到打卡时间了'
  }
  return '打卡时间未到'
}

// ============================================================
// 主页面
// ============================================================
export default function CampusPage() {
  const [loading, setLoading] = useState(true)
  const [hasPlan, setHasPlan] = useState(false)
  const [activeScene, setActiveScene] = useState<SceneType | null>(null)
  const [todayPoints, setTodayPoints] = useState(0)
  const [focusMinutes, setFocusMinutes] = useState(0)
  const [sleepStreak, setSleepStreak] = useState(0)
  const [pendingTasks, setPendingTasks] = useState<Record<string, number>>({
    library: 0,
    'study-room': 0,
  })

  const fetchAllData = useCallback(async () => {
    try {
      // 并行请求所有数据
      const [planRes, sceneRes, pointsRes, pomodoroRes, sleepRes, tasksRes] =
        await Promise.allSettled([
          fetch('/api/plan/check'),
          fetch('/api/scene'),
          fetch('/api/points'),
          fetch('/api/pomodoro'),
          fetch('/api/sleep?action=streak'),
          fetch('/api/tasks'),
        ])

      // 规划状态
      if (planRes.status === 'fulfilled' && planRes.value.ok) {
        const data = await planRes.value.json()
        setHasPlan(data.has_plan)
      }

      // 活跃场景
      if (sceneRes.status === 'fulfilled' && sceneRes.value.ok) {
        const data = await sceneRes.value.json()
        if (data.active_checkin?.scene) {
          setActiveScene(data.active_checkin.scene as SceneType)
        }
      }

      // 今日积分
      if (pointsRes.status === 'fulfilled' && pointsRes.value.ok) {
        const data = await pointsRes.value.json()
        setTodayPoints(data.today_earned ?? 0)
      }

      // 专注时长
      if (pomodoroRes.status === 'fulfilled' && pomodoroRes.value.ok) {
        const data = await pomodoroRes.value.json()
        setFocusMinutes(data.total_focus_minutes ?? 0)
      }

      // 连续早睡
      if (sleepRes.status === 'fulfilled' && sleepRes.value.ok) {
        const data = await sleepRes.value.json()
        setSleepStreak(data.streak ?? 0)
      }

      // 待完成任务数
      if (tasksRes.status === 'fulfilled' && tasksRes.value.ok) {
        const data = await tasksRes.value.json()
        const tasks = data.tasks ?? []
        const pending = tasks.filter(
          (t: { status: string }) => t.status !== 'completed'
        )
        const libraryCount = pending.filter(
          (t: { task_type: string }) => t.task_type === 'knowledge'
        ).length
        const studyRoomCount = pending.filter(
          (t: { task_type: string }) => t.task_type === 'practice'
        ).length
        setPendingTasks({
          library: libraryCount,
          'study-room': studyRoomCount,
        })
      }
    } catch (error) {
      console.error('获取数据失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  // 加载状态
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-blue-500" />
      </div>
    )
  }

  const { emoji: timeEmoji, greeting } = getTimeGreeting()
  const now = new Date()
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 via-sky-50 to-green-50">
      <div className="mx-auto max-w-lg px-4 py-6">
        {/* ====== 顶部问候区域 ====== */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-sky-600">
              <span className="text-lg">{timeEmoji}</span>
              <span>{timeStr}</span>
            </div>
            <h1 className="mt-1 text-xl font-bold text-gray-800">
              {greeting}
            </h1>
          </div>
          <div className="flex size-12 items-center justify-center rounded-full bg-white/60 text-2xl shadow-sm backdrop-blur-sm">
            {'\u{1F3EB}'}
          </div>
        </div>

        {/* ====== 未规划遮罩 ====== */}
        {!hasPlan && (
          <div className="relative mb-6">
            <div className="rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 p-5 text-center">
              <div className="mb-3 text-4xl">{'\u{1F512}'}</div>
              <p className="text-base font-semibold text-orange-700">
                请先完成今日规划
              </p>
              <p className="mt-1 text-sm text-orange-500">
                完成规划后即可进入校园各个场景
              </p>
              <Link href="/dashboard" className="mt-4 inline-block">
                <Button className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-6 shadow-md shadow-orange-200">
                  去规划
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* ====== 可用场景区域 ====== */}
        <div className="mb-6 space-y-3">
          <h2 className="text-sm font-medium text-gray-500 pl-1">
            {'\u{1F3D7}\uFE0F'} 校园场景
          </h2>
          {availableScenes.map((scene) => {
            const isActive = activeScene === scene.id
            const taskCount = pendingTasks[scene.id] ?? 0
            const isLocked = !hasPlan

            return (
              <div key={scene.id} className="relative">
                {isLocked ? (
                  /* 锁定状态 - 灰色但可见 */
                  <div
                    className={`relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 p-4 opacity-60 transition-all duration-200`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-white/60 text-3xl">
                        {scene.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-500">
                            {scene.name}
                          </span>
                          <Lock className="size-3.5 text-gray-400" />
                        </div>
                        <p className="mt-0.5 text-sm text-gray-400">
                          {scene.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* 可用状态 */
                  <Link href={scene.href} className="block">
                    <div
                      className={`relative overflow-hidden rounded-2xl border-2 bg-gradient-to-br ${scene.gradient} ${scene.borderColor} p-4 transition-all duration-200 active:scale-[0.97] ${
                        isActive
                          ? `${scene.glowColor} ring-2 ring-offset-2 ring-${scene.textColor.replace('text-', '')}`
                          : 'hover:shadow-md'
                      }`}
                    >
                      {/* 活跃场景脉冲指示 */}
                      {isActive && (
                        <div className="absolute right-3 top-3 flex items-center gap-1.5">
                          <span className="relative flex size-2.5">
                            <span
                              className={`absolute inline-flex size-full animate-ping rounded-full bg-${scene.textColor.replace('text-', '')} opacity-75`}
                            />
                            <span
                              className={`relative inline-flex size-2.5 rounded-full bg-${scene.textColor.replace('text-', '')}`}
                            />
                          </span>
                          <span className="text-xs font-medium text-gray-500">
                            正在学习中...
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-4">
                        <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-white/70 text-3xl shadow-sm">
                          {scene.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span
                            className={`text-base font-bold ${scene.textColor}`}
                          >
                            {scene.name}
                          </span>
                          <p className="mt-0.5 text-sm text-gray-500">
                            {scene.description}
                          </p>
                          {/* 底部提示 */}
                          <div className="mt-2 flex items-center gap-1">
                            {scene.id === 'dormitory' ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-white/60 px-2 py-0.5 text-xs text-gray-500">
                                <Moon className="size-3" />
                                {getDormitoryHint()}
                              </span>
                            ) : taskCount > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-white/60 px-2 py-0.5 text-xs text-gray-500">
                                {taskCount}个任务待完成
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-white/60 px-2 py-0.5 text-xs text-green-600">
                                {'\u2705'} 已完成
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                )}
              </div>
            )
          })}
        </div>

        {/* ====== 即将开放场景 ====== */}
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-medium text-gray-400 pl-1">
            即将开放
          </h2>
          <div className="flex flex-wrap gap-2">
            {upcomingScenes.map((scene) => (
              <div
                key={scene.id}
                className="flex items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white/40 px-3 py-2 backdrop-blur-sm"
              >
                <span className="text-lg grayscale opacity-60">{scene.emoji}</span>
                <span className="text-xs text-gray-400">{scene.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ====== 底部信息栏 ====== */}
        <div className="rounded-2xl bg-white/60 p-4 shadow-sm backdrop-blur-sm">
          <h3 className="mb-3 text-sm font-medium text-gray-500">
            {'\u{1F4CA}'} 今日数据
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-amber-500">
                <Star className="size-4" />
              </div>
              <p className="mt-1 text-lg font-bold text-gray-800">
                {todayPoints}
              </p>
              <p className="text-xs text-gray-400">获得积分</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-blue-500">
                <Clock className="size-4" />
              </div>
              <p className="mt-1 text-lg font-bold text-gray-800">
                {focusMinutes > 0 ? formatMinutes(focusMinutes) : '0'}
              </p>
              <p className="text-xs text-gray-400">专注时长</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-purple-500">
                <Flame className="size-4" />
              </div>
              <p className="mt-1 text-lg font-bold text-gray-800">
                {sleepStreak}
              </p>
              <p className="text-xs text-gray-400">连续早睡</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
