'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Star } from 'lucide-react'
import TaskList from './TaskList'
import PlanVsActual from './PlanVsActual'
import TodoSection from './TodoSection'
import SceneShortcuts from './SceneShortcuts'
import QuickPlan from './QuickPlan'
import NextStepIndicator from './NextStepIndicator'
import ContextNudge from './ContextNudge'
import MilestoneBar from './MilestoneBar'
import TrendSection from '@/components/charts/TrendSection'
import ScenePanel from '@/components/scene/ScenePanel'
import LibraryPanel from '@/components/scene/LibraryPanel'
import StudyRoomPanel from '@/components/scene/StudyRoomPanel'

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
// KanbanBoard
// ============================================================
export default function KanbanBoard() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<KanbanData | null>(null)
  const [nickname, setNickname] = useState('')

  // Quick plan state
  const [quickPlanning, setQuickPlanning] = useState(false)
  const [copying, setCopying] = useState(false)

  // Scene panel state
  const [scenePanelOpen, setScenePanelOpen] = useState(false)
  const [activePanelScene, setActivePanelScene] = useState<'library' | 'study-room'>('library')
  const [panelCheckinId, setPanelCheckinId] = useState<string | null>(null)

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

      // 获取规划洞察
      try {
        const insightRes = await fetch('/api/insights?type=plan_create')
        if (insightRes.ok) {
          const { insights } = await insightRes.json()
          if (insights.length > 0) {
            setTimeout(() => {
              insights.forEach((text: string, i: number) => {
                setTimeout(() => toast.info(text), i * 800)
              })
            }, 600)
          }
        }
      } catch {
        // 洞察获取失败不影响主流程
      }

      await fetchData()
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setQuickPlanning(false)
    }
  }

  // Copy yesterday's plan handler
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

  // Open scene panel
  const handleOpenScene = async (scene: 'library' | 'study-room') => {
    // If already in this scene, open the panel directly
    if (data?.active_scene?.scene === scene) {
      setActivePanelScene(scene)
      setPanelCheckinId(data.active_scene.checkin_id)
      setScenePanelOpen(true)
      return
    }

    // If in another scene, leave first
    if (data?.active_scene) {
      try {
        await fetch('/api/scene', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checkin_id: data.active_scene.checkin_id }),
        })
      } catch {
        // Continue anyway
      }
    }

    // Check in to the new scene
    try {
      const res = await fetch('/api/scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scene }),
      })

      if (!res.ok) {
        const json = await res.json()
        toast.error(json.error || '进入场景失败')
        return
      }

      const { checkin } = await res.json()
      setActivePanelScene(scene)
      setPanelCheckinId(checkin?.id ?? null)
      setScenePanelOpen(true)
      await fetchData()
    } catch {
      toast.error('网络错误，请重试')
    }
  }

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

  // Handle panel close (leave scene)
  const handlePanelClose = async () => {
    setScenePanelOpen(false)

    if (panelCheckinId) {
      try {
        await fetch('/api/scene', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checkin_id: panelCheckinId }),
        })
      } catch {
        // Silent
      }
      setPanelCheckinId(null)
      await fetchData()
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
        onQuickPlan={handleQuickPlan}
        onOpenScene={() => handleOpenScene('library')}
      />

      {/* Layer 2: Context-aware nudge */}
      <ContextNudge
        hasPlan={data.has_plan}
        activeScene={data.active_scene}
        hasDailyReview={data.todo_items.has_daily_review}
        streakDays={data.todo_items.streak_days}
        deviationRate={data.plan_vs_actual.deviation_rate}
        todayPoints={data.today_points}
      />

      {/* No plan state */}
      {!data.has_plan && (
        <QuickPlan
          hasYesterdayPlan={!!data.yesterday_plan}
          onQuickPlan={handleQuickPlan}
          onCopyYesterday={handleCopyYesterday}
          quickPlanning={quickPlanning}
          copying={copying}
        />
      )}

      {/* Has plan state */}
      {data.has_plan && (
        <>
          {/* Task list */}
          <TaskList
            tasks={data.tasks as TaskItem[]}
            onRefresh={fetchData}
            onOpenScene={handleOpenScene}
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

      {/* Scene shortcuts */}
      <SceneShortcuts
        activeScene={data.active_scene}
        onOpenScene={handleOpenScene}
        onLeaveScene={handleLeaveScene}
      />

      {/* Scene panel (Sheet from bottom) */}
      <ScenePanel
        open={scenePanelOpen}
        onOpenChange={(open) => {
          if (!open) handlePanelClose()
        }}
        scene={activePanelScene}
        title={activePanelScene === 'library' ? '图书馆' : '自习室'}
      >
        {activePanelScene === 'library' ? (
          <LibraryPanel
            checkinId={panelCheckinId}
            onLeave={handlePanelClose}
          />
        ) : (
          <StudyRoomPanel
            checkinId={panelCheckinId}
            onLeave={handlePanelClose}
          />
        )}
      </ScenePanel>
    </div>
  )
}
