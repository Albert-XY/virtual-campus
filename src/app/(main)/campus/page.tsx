'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Loader2, Lock, Clock, Flame, Star, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SceneType } from '@/types'

// ============================================================
// 场景配置
//
// 核心规则：
// - 宿舍始终可用（规划、复盘、休息都在宿舍）
// - 图书馆和自习室需要先完成今日规划才能进入
// ============================================================
interface SceneConfig {
  id: SceneType
  name: string
  emoji: string
  description: string
  href: string
  available: boolean
  cssVarPrefix: string
  /** 是否需要规划才能进入 */
  requiresPlan: boolean
}

const scenes: SceneConfig[] = [
  {
    id: 'dormitory',
    name: '宿舍',
    emoji: '\u{1F319}',
    description: '规划、复盘、休息 — 一天从这里开始，也在这里结束',
    href: '/campus/dormitory',
    available: true,
    cssVarPrefix: 'dorm',
    requiresPlan: false,
  },
  {
    id: 'library',
    name: '图书馆',
    emoji: '\u{1F4DA}',
    description: '专注学习 — 观看学习视频，掌握知识点',
    href: '/campus/library',
    available: true,
    cssVarPrefix: 'library',
    requiresPlan: true,
  },
  {
    id: 'study-room',
    name: '自习室',
    emoji: '\u270F\uFE0F',
    description: '练习巩固 — 完成练习任务，检验学习成果',
    href: '/campus/study-room',
    available: true,
    cssVarPrefix: 'study',
    requiresPlan: true,
  },
]

const upcomingScenes = [
  { id: 'exam-center', name: '考试中心', emoji: '\u{1F3EB}' },
  { id: 'sports', name: '运动场', emoji: '\u26BD' },
  { id: 'canteen', name: '食堂', emoji: '\u{1F35C}' },
  { id: 'bulletin', name: '公告栏', emoji: '\u{1F4CB}' },
  { id: 'shop', name: '校园商店', emoji: '\u{1F3EA}' },
]

// ============================================================
// Utilities
// ============================================================
function getTimeGreeting(): { emoji: string; greeting: string } {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 12) return { emoji: '\u2600\uFE0F', greeting: '早上好，新的一天开始了' }
  if (hour >= 12 && hour < 14) return { emoji: '\u{1F324}\uFE0F', greeting: '中午好，记得午休哦' }
  if (hour >= 14 && hour < 18) return { emoji: '\u{1F324}\uFE0F', greeting: '下午好，继续加油' }
  if (hour >= 18 && hour < 22) return { emoji: '\u{1F305}', greeting: '晚上好，今天辛苦了' }
  return { emoji: '\u{1F319}', greeting: '夜深了，注意休息' }
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}分钟`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}小时${m}分钟` : `${h}小时`
}

function getDormitoryHint(): string {
  const hour = new Date().getHours()
  if (hour >= 22 || hour < 6) return '该休息了'
  if (hour >= 21) return '快到打卡时间了'
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
        const pending = tasks.filter((t: { status: string }) => t.status !== 'completed')
        setPendingTasks({
          library: pending.filter((t: { task_type: string }) => t.task_type === 'knowledge').length,
          'study-room': pending.filter((t: { task_type: string }) => t.task_type === 'practice').length,
        })
      }
    } catch (error) {
      console.error('获取数据失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAllData() }, [fetchAllData])

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
    <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="mx-auto max-w-lg px-4 py-6">
        {/* 顶部问候 */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--accent-color)' }}>
              <span className="text-lg">{timeEmoji}</span>
              <span>{timeStr}</span>
            </div>
            <h1 className="mt-1 text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
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

        {/* 未规划提示 — 只锁定学习场景，宿舍始终可用 */}
        {!hasPlan && (
          <div className="relative mb-6">
            <div
              className="p-4 text-center transition-colors duration-300"
              style={{
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--accent-light)',
                border: '1px solid var(--border-color)',
              }}
            >
              <p className="text-sm font-semibold" style={{ color: 'var(--accent-color)' }}>
                还没做今日规划
              </p>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                完成规划后才能进入图书馆和自习室
              </p>
              <Link href="/" className="mt-3 inline-block">
                <Button
                  className="text-white shadow-md"
                  style={{
                    backgroundColor: 'var(--accent-color)',
                    borderRadius: '9999px',
                    paddingLeft: '1.5rem',
                    paddingRight: '1.5rem',
                    fontSize: '0.8rem',
                  }}
                >
                  回看板规划
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* 场景列表 */}
        <div className="mb-6 space-y-3">
          <h2 className="text-sm font-medium pl-1" style={{ color: 'var(--text-muted)' }}>
            {'\u{1F3D7}\uFE0F'} 校园场景
          </h2>
          {scenes.map((scene) => {
            const isActive = activeScene === scene.id
            const taskCount = pendingTasks[scene.id] ?? 0
            const isLocked = scene.requiresPlan && !hasPlan

            return (
              <div key={scene.id} className="relative">
                {isLocked ? (
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
                            正在使用...
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

        {/* 即将开放 */}
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

        {/* 今日数据 */}
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
