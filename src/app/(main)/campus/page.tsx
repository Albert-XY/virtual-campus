'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import CampusMap from '@/components/campus/CampusMap'

// ============================================================
// 校园主页 — 虚拟校园地图
//
// 「虚拟校园不是工具，是线下做不到的线上模拟」
//
// 这里不是功能列表，而是一个空间。
// 地图让你看到全局：你在哪、你做了什么、接下来该去哪。
// ============================================================

interface TimelineEntry {
  scene: string
  checked_in_at: string
  duration_minutes: number | null
}

export default function CampusPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [activeScene, setActiveScene] = useState<string | null>(null)
  const [hasPlan, setHasPlan] = useState(false)
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
  const [sceneStatus, setSceneStatus] = useState<Record<string, {
    unlocked: boolean
    tasksCompleted: number
    tasksTotal: number
    focusMinutes: number
  }>>({})

  const fetchData = useCallback(async () => {
    try {
      const [sceneRes, planRes, tasksRes] = await Promise.all([
        fetch('/api/scene'),
        fetch('/api/plan/check'),
        fetch('/api/tasks'),
      ])

      // 场景状态
      if (sceneRes.ok) {
        const data = await sceneRes.json()
        if (data.active_checkin?.scene) {
          setActiveScene(data.active_checkin.scene)
        }
      }

      // 规划状态
      if (planRes.ok) {
        const planData = await planRes.json()
        setHasPlan(planData.has_plan)
      }

      // 任务数据 → 构建场景状态
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json()
        const tasks = tasksData.tasks ?? []

        const libraryTasks = tasks.filter((t: { task_type: string; status: string }) => t.task_type === 'knowledge')
        const studyTasks = tasks.filter((t: { task_type: string; status: string }) => t.task_type === 'practice')

        setSceneStatus({
          library: {
            unlocked: hasPlan,
            tasksCompleted: libraryTasks.filter((t: { status: string }) => t.status === 'completed').length,
            tasksTotal: libraryTasks.length,
            focusMinutes: tasksData.total_focus_minutes ?? 0,
          },
          'study-room': {
            unlocked: hasPlan,
            tasksCompleted: studyTasks.filter((t: { status: string }) => t.status === 'completed').length,
            tasksTotal: studyTasks.length,
            focusMinutes: 0,
          },
          dormitory: {
            unlocked: true,
            tasksCompleted: 0,
            tasksTotal: 0,
            focusMinutes: 0,
          },
        })
      }

      // 今日轨迹（从scene checkins获取）
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const today = new Date().toISOString().split('T')[0]
          const { data: checkins } = await supabase
            .from('scene_checkins')
            .select('scene, checked_in_at, checked_out_at, duration_minutes')
            .eq('user_id', user.id)
            .gte('checked_in_at', `${today}T00:00:00`)
            .order('checked_in_at', { ascending: true })

          if (checkins) {
            setTimeline(checkins.map((c: { scene: string; checked_in_at: string; duration_minutes: number | null }) => ({
              scene: c.scene,
              checked_in_at: c.checked_in_at,
              duration_minutes: c.duration_minutes,
            })))
          }
        }
      } catch {
        // 轨迹获取失败不影响核心功能
      }
    } catch {
      // 静默处理
    } finally {
      setLoading(false)
    }
  }, [hasPlan])

  useEffect(() => { fetchData() }, [fetchData])

  const handleBuildingClick = useCallback((scene: string) => {
    const routeMap: Record<string, string> = {
      library: '/campus/library',
      'study-room': '/campus/study-room',
      dormitory: '/campus/dormitory',
      lake: '/campus/lake',
    }
    const route = routeMap[scene]
    if (route) {
      router.push(route)
    }
  }, [router])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--accent-color)' }} />
      </div>
    )
  }

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div className="mx-auto max-w-lg px-4 py-6">
        {/* 地图 */}
        <CampusMap
          activeScene={activeScene}
          timeline={timeline}
          sceneStatus={sceneStatus}
          onBuildingClick={handleBuildingClick}
        />

        {/* 底部信息 */}
        <div className="mt-4 space-y-3">
          {/* 未规划提示 */}
          {!hasPlan && (
            <div
              className="p-3 text-center text-sm"
              style={{
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'color-mix(in srgb, var(--accent-color) 8%, transparent)',
                border: '1px solid color-mix(in srgb, var(--accent-color) 20%, transparent)',
                color: 'var(--accent-color)',
              }}
            >
              图书馆和自习室需要先在宿舍完成规划才能进入
            </div>
          )}

          {/* 今日数据 */}
          <div
            className="grid grid-cols-3 gap-2 p-3"
            style={{
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--bg-card)',
              boxShadow: 'var(--shadow)',
            }}
          >
            <div className="text-center">
              <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {timeline.length}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>场景切换</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {timeline.reduce((sum, t) => sum + (t.duration_minutes ?? 0), 0)}m
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>总学习时长</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {activeScene ? '进行中' : '休息中'}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>当前状态</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
