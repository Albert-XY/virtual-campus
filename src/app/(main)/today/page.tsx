'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Loader2,
  Zap,
  ClipboardList,
  MapPin,
  LogOut,
  Clock,
  Star,
  CheckCircle2,
  Circle,
  Copy,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

// ============================================================
// Types
// ============================================================
interface TodayData {
  has_plan: boolean
  plan: Record<string, unknown> | null
  tasks: TaskRecord[]
  active_scene: {
    scene: string
    scene_name: string
    checkin_id: string
    started_at: string
  } | null
  today_checkins: CheckinRecord[]
  today_points: number
  yesterday_plan: Record<string, unknown> | null
}

interface TaskRecord {
  id: string
  task_index: number
  task_type: string
  subject: string
  topic: string
  estimated_minutes: number
  status: string
}

interface CheckinRecord {
  id: string
  scene: string
  scene_name: string
  check_in_at: string
  check_out_at: string | null
  duration_minutes: number | null
}

// Task type config - using CSS variable compatible approach
const TASK_TYPE_CONFIG: Record<string, { label: string; style: React.CSSProperties }> = {
  knowledge: { label: '知识学习', style: { backgroundColor: 'var(--scene-library-bg)', color: 'var(--scene-library)' } },
  practice: { label: '练习巩固', style: { backgroundColor: 'var(--scene-study-bg)', color: 'var(--scene-study)' } },
  collaboration: { label: '协作讨论', style: { backgroundColor: 'var(--scene-dorm-bg)', color: 'var(--scene-dorm)' } },
  self: { label: '自主学习', style: { backgroundColor: 'var(--accent-light)', color: 'var(--accent-color)' } },
}

// Scene emoji mapping
const SCENE_EMOJI: Record<string, string> = {
  library: '\u{1F4DA}',
  'study-room': '\u270F\uFE0F',
  dormitory: '\u{1F319}',
  'exam-center': '\u{1F3EB}',
  sports: '\u26BD',
  canteen: '\u{1F35C}',
  bulletin: '\u{1F4CB}',
  shop: '\u{1F3EA}',
}

// ============================================================
// Utilities
// ============================================================
function getGreeting(): { text: string; emoji: string } {
  const hour = new Date().getHours()
  if (hour < 6) return { text: '夜深了，注意休息', emoji: '\u{1F319}' }
  if (hour < 12) return { text: '新的一天，准备好了吗', emoji: '\u{1F305}' }
  if (hour < 14) return { text: '中午好，记得休息一下', emoji: '\u{1F324}\uFE0F' }
  if (hour < 18) return { text: '下午好，继续加油', emoji: '\u2600\uFE0F' }
  return { text: '今天辛苦了', emoji: '\u{1F319}' }
}

function formatTime(isoStr: string): string {
  const d = new Date(isoStr)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

function getElapsedMinutes(isoStr: string): number {
  const start = new Date(isoStr)
  const now = new Date()
  return Math.round((now.getTime() - start.getTime()) / 60000)
}

// ============================================================
// Main Page
// ============================================================
export default function TodayPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<TodayData | null>(null)
  const [nickname, setNickname] = useState('')
  const [quickPlanning, setQuickPlanning] = useState(false)
  const [copying, setCopying] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/today')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (error) {
      console.error('获取今日数据失败:', error)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('id', user.id)
          .single()
        if (profile?.nickname) {
          setNickname(profile.nickname)
        }
      }

      await fetchData()
      setLoading(false)
    }

    init()
  }, [fetchData])

  // Quick plan
  const handleQuickPlan = async () => {
    setQuickPlanning(true)
    try {
      const res = await fetch('/api/plan?action=quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error || '快速规划失败')
        return
      }

      toast.success('规划创建成功！')
      await fetchData()
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setQuickPlanning(false)
    }
  }

  // Copy yesterday's plan
  const handleCopyYesterday = async () => {
    if (!data?.yesterday_plan) return

    setCopying(true)
    try {
      const yesterdayPlan = data.yesterday_plan as {
        study_blocks: unknown[]
        rest_blocks: unknown[]
        tasks: unknown[]
      }

      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          study_blocks: yesterdayPlan.study_blocks,
          rest_blocks: yesterdayPlan.rest_blocks,
          tasks: yesterdayPlan.tasks,
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error || '复制规划失败')
        return
      }

      toast.success('已复制昨天的规划！')
      await fetchData()
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setCopying(false)
    }
  }

  // Leave current scene
  const handleLeaveScene = async () => {
    if (!data?.active_scene) return

    try {
      const res = await fetch('/api/scene', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkin_id: data.active_scene.checkin_id }),
      })
      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error || '离开场景失败')
        return
      }

      toast.success('已离开场景')
      await fetchData()
    } catch {
      toast.error('网络错误，请重试')
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--accent-color)' }} />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6 text-center" style={{ color: 'var(--text-muted)' }}>
        加载失败，请刷新重试
      </div>
    )
  }

  const greeting = getGreeting()

  // Calculate task progress
  const tasks = data.tasks ?? []
  const completedTasks = tasks.filter((t) => t.status === 'completed').length
  const totalTasks = tasks.length
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-5">
      {/* Top greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--accent-color)', fontFamily: 'var(--font-display)' }}>
            {greeting.emoji} {greeting.text}，{nickname || '同学'}
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {new Date().toLocaleDateString('zh-CN', {
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </p>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5"
          style={{
            backgroundColor: 'var(--points-bg)',
            borderRadius: '9999px',
          }}
        >
          <Star className="size-4" style={{ color: 'var(--points-color)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--points-text)' }}>
            +{data.today_points}
          </span>
        </div>
      </div>

      {/* ============================================ */}
      {/* State 1: No plan */}
      {/* ============================================ */}
      {!data.has_plan && (
        <>
          {/* Hero card */}
          <div
            className="p-6 text-white transition-all duration-300"
            style={{
              borderRadius: 'var(--radius-lg)',
              background: `linear-gradient(135deg, var(--hero-gradient-from) 0%, var(--hero-gradient-via) 50%, var(--hero-gradient-to) 100%)`,
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex size-12 shrink-0 items-center justify-center"
                style={{
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                }}
              >
                <ClipboardList className="size-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold">新的一天，先规划一下今天吧！</h3>
                <p className="mt-1 text-sm" style={{ color: 'var(--hero-subtext)' }}>
                  完成规划后即可进入虚拟校园开始学习
                </p>
              </div>
            </div>
          </div>

          {/* Quick plan + Detailed plan */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleQuickPlan}
              disabled={quickPlanning}
              className="flex flex-col items-center gap-2 p-4 transition-all active:scale-[0.97] disabled:opacity-50"
              style={{
                borderRadius: 'var(--radius-md)',
                border: '2px solid',
                borderColor: 'color-mix(in srgb, var(--accent-color) 20%, transparent)',
                backgroundColor: 'color-mix(in srgb, var(--accent-color) 5%, transparent)',
              }}
            >
              {quickPlanning ? (
                <Loader2 className="size-6 animate-spin" style={{ color: 'var(--accent-color)' }} />
              ) : (
                <Zap className="size-6" style={{ color: 'var(--accent-color)' }} />
              )}
              <span className="text-sm font-semibold" style={{ color: 'var(--accent-color)' }}>快速规划</span>
              <span className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                使用默认模板一键创建
              </span>
            </button>

            <Link href="/dashboard" className="flex flex-col items-center gap-2 p-4 transition-all active:scale-[0.97]" style={{
              borderRadius: 'var(--radius-md)',
              border: '2px solid',
              borderColor: 'color-mix(in srgb, var(--success) 20%, transparent)',
              backgroundColor: 'color-mix(in srgb, var(--success) 5%, transparent)',
            }}>
              <ClipboardList className="size-6" style={{ color: 'var(--success)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--success)' }}>详细规划</span>
              <span className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                自定义学习区间和任务
              </span>
            </Link>
          </div>

          {/* Copy yesterday's plan */}
          {data.yesterday_plan && (
            <button
              onClick={handleCopyYesterday}
              disabled={copying}
              className="flex w-full items-center justify-center gap-2 p-3 text-sm transition-colors disabled:opacity-50"
              style={{
                borderRadius: 'var(--radius-md)',
                border: '1px dashed var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-secondary)',
              }}
            >
              {copying ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Copy className="size-4" />
              )}
              复制昨天的规划
            </button>
          )}
        </>
      )}

      {/* ============================================ */}
      {/* State 2: Has plan, active scene */}
      {/* ============================================ */}
      {data.has_plan && data.active_scene && (
        <>
          {/* Current scene card */}
          <div
            className="p-5 text-white transition-all duration-300"
            style={{
              borderRadius: 'var(--radius-lg)',
              background: `linear-gradient(135deg, var(--scene-active-from) 0%, var(--scene-active-via) 50%, var(--scene-active-to) 100%)`,
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">
                {SCENE_EMOJI[data.active_scene.scene] || '\u{1F4CD}'}
              </span>
              <div>
                <p className="text-sm" style={{ color: 'var(--hero-subtext)' }}>正在学习中</p>
                <h3 className="text-lg font-bold">
                  {data.active_scene.scene_name}
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--hero-subtext)' }}>
              <Clock className="size-4" />
              <span>已学习 {getElapsedMinutes(data.active_scene.started_at)} 分钟</span>
            </div>
          </div>

          {/* Task progress */}
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between text-sm mb-2">
                <span style={{ color: 'var(--text-secondary)' }}>今日任务进度</span>
                <span className="font-semibold" style={{ color: 'var(--accent-color)' }}>
                  {completedTasks}/{totalTasks}
                </span>
              </div>
              <Progress value={progressPercent}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${progressPercent}%`, backgroundColor: 'var(--accent-color)' }}
                />
              </Progress>
            </CardContent>
          </Card>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={handleLeaveScene}
              className="h-11 gap-2"
            >
              <LogOut className="size-4" />
              离开场景
            </Button>
            <Link href="/dashboard" className="block">
              <Button variant="outline" className="w-full h-11 gap-2">
                <ClipboardList className="size-4" />
                查看详情
              </Button>
            </Link>
          </div>
        </>
      )}

      {/* ============================================ */}
      {/* State 3: Has plan, no active scene */}
      {/* ============================================ */}
      {data.has_plan && !data.active_scene && (
        <>
          {/* Today's plan summary */}
          <Card>
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold" style={{ color: 'var(--accent-color)' }}>今日规划</h3>
                <Badge className="text-white" style={{ backgroundColor: 'var(--accent-color)' }}>已规划</Badge>
              </div>

              {/* Study blocks */}
              {data.plan && (data.plan.study_blocks as { start: string; end: string }[]).map((block, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-2"
                  style={{
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--accent-light)',
                  }}
                >
                  <span className="text-sm font-medium">{block.start}</span>
                  <div className="h-px flex-1 mx-2" style={{ backgroundColor: 'var(--border-color)' }} />
                  <span className="text-sm font-medium">{block.end}</span>
                </div>
              ))}

              {/* Task progress */}
              <div className="pt-1">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span style={{ color: 'var(--text-secondary)' }}>任务进度</span>
                  <span className="font-semibold" style={{ color: 'var(--accent-color)' }}>
                    {completedTasks}/{totalTasks} ({progressPercent}%)
                  </span>
                </div>
                <Progress value={progressPercent}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${progressPercent}%`, backgroundColor: 'var(--accent-color)' }}
                  />
                </Progress>
              </div>

              {/* Task list */}
              {tasks.length > 0 && (
                <div className="space-y-2 pt-1">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 p-2.5 transition-all duration-300"
                      style={{
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid',
                        borderColor: task.status === 'completed' ? 'var(--success)' : 'var(--border-color)',
                        backgroundColor: task.status === 'completed' ? 'var(--success-light)' : 'var(--bg-card)',
                      }}
                    >
                      {task.status === 'completed' ? (
                        <CheckCircle2 className="size-4 shrink-0" style={{ color: 'var(--success)' }} />
                      ) : (
                        <Circle className="size-4 shrink-0" style={{ color: 'var(--border-color)' }} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className="border-0"
                            style={TASK_TYPE_CONFIG[task.task_type]?.style ?? { backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}
                          >
                            {TASK_TYPE_CONFIG[task.task_type]?.label ?? task.task_type}
                          </Badge>
                          <span className="text-sm font-medium truncate">
                            {task.subject}
                          </span>
                        </div>
                        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {task.topic}
                        </p>
                      </div>
                      <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                        {task.estimated_minutes}min
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Enter campus button */}
          <Link href="/campus" className="block">
            <Button
              className="w-full h-12 text-base font-semibold text-white"
              style={{
                background: `linear-gradient(135deg, var(--hero-gradient-from) 0%, var(--hero-gradient-to) 100%)`,
              }}
            >
              <MapPin className="size-5" />
              进入校园开始学习
            </Button>
          </Link>

          {/* Today points */}
          {data.today_points > 0 && (
            <div
              className="flex items-center justify-center gap-2 px-4 py-3"
              style={{
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--points-bg)',
              }}
            >
              <Star className="size-4" style={{ color: 'var(--points-color)' }} />
              <span className="text-sm" style={{ color: 'var(--points-text)' }}>
                今日已获得 <strong>{data.today_points}</strong> 积分
              </span>
            </div>
          )}
        </>
      )}

      {/* ============================================ */}
      {/* Bottom timeline */}
      {/* ============================================ */}
      {data.today_checkins.length > 0 && (
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                今日时间线
              </h3>
              {data.has_plan && (
                <Link
                  href="/dashboard"
                  className="flex items-center gap-0.5 text-xs"
                  style={{ color: 'var(--accent-color)' }}
                >
                  查看详情
                  <ChevronRight className="size-3" />
                </Link>
              )}
            </div>
            <div className="space-y-2.5">
              {data.today_checkins.map((checkin) => (
                <div key={checkin.id} className="flex items-center gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className="size-2.5"
                      style={{
                        borderRadius: '50%',
                        backgroundColor: checkin.check_out_at ? 'var(--success)' : 'var(--accent-color)',
                      }}
                    />
                    {checkin !== data.today_checkins[data.today_checkins.length - 1] && (
                      <div className="w-px h-6" style={{ backgroundColor: 'var(--border-color)' }} />
                    )}
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {SCENE_EMOJI[checkin.scene] || '\u{1F4CD}'}
                      </span>
                      <span className="text-sm">{checkin.scene_name}</span>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {formatTime(checkin.check_in_at)}
                      {checkin.duration_minutes != null
                        ? ` ${checkin.duration_minutes}min`
                        : ' 进行中'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
