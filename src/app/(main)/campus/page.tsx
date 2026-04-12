'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Loader2, Lock, Clock, Flame, Star, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SceneType } from '@/types'

// ============================================================
// Scene config
// ============================================================
interface SceneConfig {
  id: SceneType
  name: string
  emoji: string
  description: string
  href: string
  available: boolean
  cssVarPrefix: string // e.g. 'library', 'study', 'dorm'
}

const availableScenes: SceneConfig[] = [
  {
    id: 'library',
    name: '图书馆',
    emoji: '\u{1F4DA}',
    description: '观看学习视频，掌握知识点',
    href: '/campus/library',
    available: true,
    cssVarPrefix: 'library',
  },
  {
    id: 'study-room',
    name: '自习室',
    emoji: '\u270F\uFE0F',
    description: '完成练习任务，检验学习成果',
    href: '/campus/study-room',
    available: true,
    cssVarPrefix: 'study',
  },
  {
    id: 'dormitory',
    name: '宿舍',
    emoji: '\u{1F319}',
    description: '记录睡眠时间，养成早睡习惯',
    href: '/campus/dormitory',
    available: true,
    cssVarPrefix: 'dorm',
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
    cssVarPrefix: '',
  },
  {
    id: 'sports',
    name: '运动场',
    emoji: '\u26BD',
    description: '运动健身',
    href: '/campus/sports',
    available: false,
    cssVarPrefix: '',
  },
  {
    id: 'canteen',
    name: '食堂',
    emoji: '\u{1F35C}',
    description: '休息餐饮',
    href: '/campus/canteen',
    available: false,
    cssVarPrefix: '',
  },
  {
    id: 'bulletin',
    name: '公告栏',
    emoji: '\u{1F4CB}',
    description: '校园公告',
    href: '/campus/bulletin',
    available: false,
    cssVarPrefix: '',
  },
  {
    id: 'shop',
    name: '校园商店',
    emoji: '\u{1F3EA}',
    description: '积分兑换',
    href: '/campus/shop',
    available: false,
    cssVarPrefix: '',
  },
]

// ============================================================
// Utilities
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
// Main Page
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
      const [planRes, sceneRes, pointsRes, pomodoroRes, sleepRes, tasksRes] =
        await Promise.allSettled([
          fetch('/api/plan/check'),
          fetch('/api/scene'),
          fetch('/api/points'),
          fetch('/api/pomodoro'),
          fetch('/api/sleep?action=streak'),
          fetch('/api/tasks'),
        ])

      if (planRes.status === 'fulfilled' && planRes.value.ok) {
        const data = await planRes.value.json()
        setHasPlan(data.has_plan)
      }

      if (sceneRes.status === 'fulfilled' && sceneRes.value.ok) {
        const data = await sceneRes.value.json()
        if (data.active_checkin?.scene) {
          setActiveScene(data.active_checkin.scene as SceneType)
        }
      }

      if (pointsRes.status === 'fulfilled' && pointsRes.value.ok) {
        const data = await pointsRes.value.json()
        setTodayPoints(data.today_earned ?? 0)
      }

      if (pomodoroRes.status === 'fulfilled' && pomodoroRes.value.ok) {
        const data = await pomodoroRes.value.json()
        setFocusMinutes(data.total_focus_minutes ?? 0)
      }

      if (sleepRes.status === 'fulfilled' && sleepRes.value.ok) {
        const data = await sleepRes.value.json()
        setSleepStreak(data.streak ?? 0)
      }

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

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--accent-color)' }} />
      </div>
    )
  }

  const { emoji: timeEmoji, greeting } = getTimeGreeting()
  const now = new Date()
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div className="mx-auto max-w-lg px-4 py-6">
        {/* ====== Top greeting area ====== */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--accent-color)' }}>
              <span className="text-lg">{timeEmoji}</span>
              <span>{timeStr}</span>
            </div>
            <h1
              className="mt-1 text-xl font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              {greeting}
            </h1>
          </div>
          <div
            className="flex size-12 items-center justify-center text-2xl"
            style={{
              borderRadius: '50%',
              backgroundColor: 'var(--bg-card)',
              boxShadow: 'var(--shadow)',
            }}
          >
            {'\u{1F3EB}'}
          </div>
        </div>

        {/* ====== No plan overlay ====== */}
        {!hasPlan && (
          <div className="relative mb-6">
            <div
              className="p-5 text-center transition-colors duration-300"
              style={{
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--accent-light)',
                border: '1px solid var(--border-color)',
              }}
            >
              <div className="mb-3 text-4xl">{'\u{1F512}'}</div>
              <p className="text-base font-semibold" style={{ color: 'var(--accent-color)' }}>
                请先完成今日规划
              </p>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                完成规划后即可进入校园各个场景
              </p>
              <Link href="/dashboard" className="mt-4 inline-block">
                <Button
                  className="text-white shadow-md"
                  style={{
                    backgroundColor: 'var(--accent-color)',
                    borderRadius: '9999px',
                    paddingLeft: '1.5rem',
                    paddingRight: '1.5rem',
                  }}
                >
                  去规划
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* ====== Available scenes ====== */}
        <div className="mb-6 space-y-3">
          <h2 className="text-sm font-medium pl-1" style={{ color: 'var(--text-muted)' }}>
            {'\u{1F3D7}\uFE0F'} 校园场景
          </h2>
          {availableScenes.map((scene) => {
            const isActive = activeScene === scene.id
            const taskCount = pendingTasks[scene.id] ?? 0
            const isLocked = !hasPlan

            return (
              <div key={scene.id} className="relative">
                {isLocked ? (
                  /* Locked state */
                  <div
                    id={
                      scene.id === 'library' ? 'guide-campus-library' :
                      scene.id === 'study-room' ? 'guide-campus-study' :
                      scene.id === 'dormitory' ? 'guide-campus-dorm' :
                      undefined
                    }
                    className="relative overflow-hidden p-4 opacity-60 transition-all duration-200"
                    style={{
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-secondary)',
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="flex size-14 shrink-0 items-center justify-center text-3xl"
                        style={{
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--bg-card)',
                        }}
                      >
                        {scene.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>
                            {scene.name}
                          </span>
                          <Lock className="size-3.5" style={{ color: 'var(--text-muted)' }} />
                        </div>
                        <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
                          {scene.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Available state */
                  <Link href={scene.href} className="block">
                    <div
                      id={
                        scene.id === 'library' ? 'guide-campus-library' :
                        scene.id === 'study-room' ? 'guide-campus-study' :
                        scene.id === 'dormitory' ? 'guide-campus-dorm' :
                        undefined
                      }
                      className="relative overflow-hidden p-4 transition-all duration-200 active:scale-[0.97]"
                      style={{
                        borderRadius: 'var(--radius-lg)',
                        border: '2px solid',
                        borderColor: `var(--scene-${scene.cssVarPrefix})`,
                        backgroundColor: `var(--scene-${scene.cssVarPrefix}-bg)`,
                        boxShadow: isActive ? 'var(--shadow-lg)' : 'var(--shadow)',
                      }}
                    >
                      {/* Active scene pulse indicator */}
                      {isActive && (
                        <div className="absolute right-3 top-3 flex items-center gap-1.5">
                          <span className="relative flex size-2.5">
                            <span
                              className="absolute inline-flex size-full animate-ping rounded-full opacity-75"
                              style={{ backgroundColor: `var(--scene-${scene.cssVarPrefix})` }}
                            />
                            <span
                              className="relative inline-flex size-2.5 rounded-full"
                              style={{ backgroundColor: `var(--scene-${scene.cssVarPrefix})` }}
                            />
                          </span>
                          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                            正在学习中...
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-4">
                        <div
                          className="flex size-14 shrink-0 items-center justify-center text-3xl"
                          style={{
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'var(--bg-card)',
                            boxShadow: 'var(--shadow)',
                          }}
                        >
                          {scene.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span
                            className="text-base font-bold"
                            style={{ color: `var(--scene-${scene.cssVarPrefix})` }}
                          >
                            {scene.name}
                          </span>
                          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                            {scene.description}
                          </p>
                          {/* Bottom hint */}
                          <div className="mt-2 flex items-center gap-1">
                            {scene.id === 'dormitory' ? (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs"
                                style={{
                                  borderRadius: '9999px',
                                  backgroundColor: 'var(--bg-card)',
                                  color: 'var(--text-secondary)',
                                }}
                              >
                                <Moon className="size-3" />
                                {getDormitoryHint()}
                              </span>
                            ) : taskCount > 0 ? (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs"
                                style={{
                                  borderRadius: '9999px',
                                  backgroundColor: 'var(--bg-card)',
                                  color: 'var(--text-secondary)',
                                }}
                              >
                                {taskCount}个任务待完成
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs"
                                style={{
                                  borderRadius: '9999px',
                                  backgroundColor: 'var(--bg-card)',
                                  color: 'var(--success)',
                                }}
                              >
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

        {/* ====== Upcoming scenes ====== */}
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-medium pl-1" style={{ color: 'var(--text-muted)' }}>
            即将开放
          </h2>
          <div className="flex flex-wrap gap-2">
            {upcomingScenes.map((scene) => (
              <div
                key={scene.id}
                className="flex items-center gap-2 px-3 py-2"
                style={{
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border-color)',
                  backgroundColor: 'var(--bg-card)',
                }}
              >
                <span className="text-lg grayscale opacity-60">{scene.emoji}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{scene.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ====== Bottom info bar ====== */}
        <div
          className="p-4 transition-colors duration-300"
          style={{
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--bg-card)',
            boxShadow: 'var(--shadow)',
          }}
        >
          <h3 className="mb-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            {'\u{1F4CA}'} 今日数据
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Star className="size-4" style={{ color: 'var(--points-color)' }} />
              </div>
              <p className="mt-1 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {todayPoints}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>获得积分</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Clock className="size-4" style={{ color: 'var(--scene-library)' }} />
              </div>
              <p className="mt-1 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {focusMinutes > 0 ? formatMinutes(focusMinutes) : '0'}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>专注时长</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Flame className="size-4" style={{ color: 'var(--scene-dorm)' }} />
              </div>
              <p className="mt-1 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {sleepStreak}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>连续早睡</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
