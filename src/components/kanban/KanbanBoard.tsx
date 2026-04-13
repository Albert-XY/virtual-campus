'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Star, Target, ChevronRight } from 'lucide-react'
import TaskList from './TaskList'
import PlanVsActual from './PlanVsActual'
import TodoSection from './TodoSection'
import NextStepIndicator from './NextStepIndicator'
import ContextNudge from './ContextNudge'
import MilestoneBar from './MilestoneBar'
import TrendSection from '@/components/charts/TrendSection'
import GoalProgressCard from '@/components/goals/GoalProgressCard'

// ============================================================
// Types
// ============================================================
interface KanbanData {
  has_plan: boolean
  plan: Record<string, unknown> | null
  tasks: TaskItem[]
  active_scene: {
    scene: string
    scene_name: string
    checkin_id: string
    started_at: string
  } | null
  today_checkins: Array<{
    id: string
    scene: string
    scene_name: string
    check_in_at: string
    check_out_at: string | null
    duration_minutes: number | null
  }>
  today_points: number
  plan_vs_actual: {
    planned_minutes: number
    actual_minutes: number
    deviation_rate: number
    completion_rate: number
    accuracy_avg: number
  }
  todo_items: {
    has_daily_review: boolean
    has_sleep_log: boolean
    streak_days: number
  }
  unread_broadcasts: number
  yesterday_plan: Record<string, unknown> | null
  has_monthly_goal: boolean
  has_weekly_goal: boolean
}

interface TaskItem {
  id: string
  task_index: number
  task_type: string
  subject: string
  topic: string
  estimated_minutes: number
  status: string
  actual_minutes: number | null
  accuracy_rate: number | null
  points_earned: number | null
}

// ============================================================
// Utilities
// ============================================================
function getGreeting(): { text: string; emoji: string } {
  const hour = new Date().getHours()
  if (hour < 6) return { text: '夜深了，注意休息', emoji: '🌙' }
  if (hour < 12) return { text: '新的一天，准备好了吗', emoji: '🌅' }
  if (hour < 14) return { text: '中午好，记得休息一下', emoji: '🌤️' }
  if (hour < 18) return { text: '下午好，继续加油', emoji: '☀️' }
  return { text: '今天辛苦了', emoji: '🌙' }
}

// ============================================================
// Goal Progress Section (inline component)
// ============================================================
function GoalProgressSection() {
  const [goals, setGoals] = useState<Array<{
    id: string
    period: 'monthly' | 'weekly'
    title: string
    total_units: number
    completed_units: number
    target_date: string | null
    start_date: string
    status: string
    pace: number | null
    on_track: boolean | null
  }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/goals/progress')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.goals) setGoals(data.goals)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || goals.length === 0) return null

  return (
    <div className="space-y-2">
      {goals.map((goal) => (
        <GoalProgressCard
          key={goal.id}
          goal={goal}
          pace={goal.pace ?? undefined}
          onTrack={goal.on_track ?? undefined}
          onClick={() => {
            window.location.href = '/goals'
          }}
        />
      ))}
    </div>
  )
}

// ============================================================
// KanbanBoard
// ============================================================
export default function KanbanBoard() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<KanbanData | null>(null)
  const [nickname, setNickname] = useState('')

  // Fetch kanban data
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/kanban')
      if (res.ok) {
        const json = await res.json()
        setData(json as KanbanData)
      }
    } catch (error) {
      console.error('获取看板数据失败:', error)
    }

    // Fetch goal status (non-blocking)
    try {
      const goalsRes = await fetch('/api/goals?active_only=true&period=monthly')
      if (goalsRes.ok) {
        const goalsJson = await goalsRes.json()
        const hasMonthly = (goalsJson.goals ?? []).length > 0
        const weeklyRes = await fetch('/api/goals?active_only=true&period=weekly')
        let hasWeekly = false
        if (weeklyRes.ok) {
          const weeklyJson = await weeklyRes.json()
          hasWeekly = (weeklyJson.goals ?? []).length > 0
        }
        setData(prev => prev ? { ...prev, has_monthly_goal: hasMonthly, has_weekly_goal: hasWeekly } : prev)
      }
    } catch {
      // goals table may not exist yet
    }
  }, [])

  // Initialize
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

  // Quick plan handler
  // Leave scene handler
  const handleLeaveScene = async () => {
    if (!data?.active_scene) return

    try {
      const res = await fetch('/api/scene', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkin_id: data.active_scene.checkin_id }),
      })

      if (res.ok) {
        const { checkin } = await res.json()
        const minutes = checkin?.duration_minutes ?? 0
        toast.success(`已离开${data.active_scene.scene_name}，本次学习 ${minutes} 分钟`)
      }
    } catch {
      toast.error('离开场景失败')
    }

    await fetchData()
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
      <div className="px-4 py-6 text-center" style={{ color: 'var(--text-muted)' }}>
        加载失败，请刷新重试
      </div>
    )
  }

  const greeting = getGreeting()

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-xl font-bold"
            style={{
              color: 'var(--accent-color)',
              fontFamily: 'var(--font-display)',
            }}
          >
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
        {data.today_points > 0 && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5"
            style={{
              borderRadius: '9999px',
              backgroundColor: 'var(--points-bg)',
            }}
          >
            <Star className="size-4" style={{ color: 'var(--points-color)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--points-text)' }}>
              +{data.today_points}
            </span>
          </div>
        )}
      </div>

      {/* Layer 1: Next step indicator */}
      <NextStepIndicator
        hasPlan={data.has_plan}
        tasks={data.tasks as TaskItem[]}
        activeScene={data.active_scene}
        hasDailyReview={data.todo_items.has_daily_review}
        hasSleepLog={data.todo_items.has_sleep_log}
        streakDays={data.todo_items.streak_days}
        hasMonthlyGoal={data.has_monthly_goal}
        hasWeeklyGoal={data.has_weekly_goal}
        onQuickPlan={() => { window.location.href = '/campus/dormitory' }}
        onOpenScene={() => {}}
      />

      {/* Goal progress cards */}
      <GoalProgressSection />

      {/* Layer 2: Context-aware nudge */}
      <ContextNudge
        hasPlan={data.has_plan}
        activeScene={data.active_scene}
        hasDailyReview={data.todo_items.has_daily_review}
        streakDays={data.todo_items.streak_days}
        deviationRate={data.plan_vs_actual.deviation_rate}
        todayPoints={data.today_points}
      />

      {/* No plan state — 引导去宿舍规划 */}
      {!data.has_plan && (
        <div
          className="rounded-xl p-5 text-center"
          style={{
            backgroundColor: 'var(--bg-card)',
            boxShadow: 'var(--shadow)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div className="text-3xl mb-2">🏠</div>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>今天还没规划</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            去宿舍规划一下今天要做什么
          </p>
          <Link
            href="/campus/dormitory"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-medium text-white transition-all active:scale-[0.97]"
            style={{ backgroundColor: 'var(--accent-color)' }}
          >
            去宿舍
            <ChevronRight className="size-4" />
          </Link>
        </div>
      )}

      {/* Has plan state */}
      {data.has_plan && (
        <>
          {/* Task list */}
          <TaskList
            tasks={data.tasks as TaskItem[]}
            onRefresh={fetchData}
            onOpenScene={() => {}}
          />

          {/* Plan vs Actual (only show when there are completed tasks or actual minutes) */}
          {data.plan_vs_actual.actual_minutes > 0 && (
            <PlanVsActual
              plannedMinutes={data.plan_vs_actual.planned_minutes}
              actualMinutes={data.plan_vs_actual.actual_minutes}
              deviationRate={data.plan_vs_actual.deviation_rate}
              completionRate={data.plan_vs_actual.completion_rate}
              accuracyAvg={data.plan_vs_actual.accuracy_avg}
            />
          )}

          {/* Trend charts (collapsible) */}
          <TrendSection />
        </>
      )}

      {/* Layer 3: Milestone bar */}
      <MilestoneBar
        streakDays={data.todo_items.streak_days}
        todayPoints={data.today_points}
        completionRate={data.plan_vs_actual.completion_rate}
        deviationRate={data.plan_vs_actual.deviation_rate}
      />

      {/* Todo section */}
      <TodoSection
        hasDailyReview={data.todo_items.has_daily_review}
        hasSleepLog={data.todo_items.has_sleep_log}
        streakDays={data.todo_items.streak_days}
      />

      {/* 去校园按钮 — 校园页是唯一的场景入口 */}
      {!data.has_plan && (
        <Link
          href="/campus"
          className="mt-2 flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-all active:scale-[0.97]"
          style={{
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-secondary)',
          }}
        >
          进入校园
        </Link>
      )}
    </div>
  )
}
