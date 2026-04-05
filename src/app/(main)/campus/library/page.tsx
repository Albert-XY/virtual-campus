'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft,
  BookOpen,
  Video,
  Clock,
  ChevronRight,
  LogOut,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import PomodoroTimer from '@/components/PomodoroTimer'
import type { PlanTask, SceneCheckin, PomodoroSession } from '@/types'

// ============================================================
// 常量
// ============================================================
const LIBRARY_COLOR = '#1E40AF'

// ============================================================
// 主页面
// ============================================================
export default function LibraryPage() {
  const router = useRouter()

  // ---- 状态 ----
  const [loading, setLoading] = useState(true)
  const [checkinId, setCheckinId] = useState<string | null>(null)
  const [knowledgeTasks, setKnowledgeTasks] = useState<PlanTask[]>([])
  const [selectedTask, setSelectedTask] = useState<PlanTask | null>(null)
  const [leaving, setLeaving] = useState(false)

  // ---- 获取今日规划 ----
  const fetchPlan = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/plan')
      if (!res.ok) return false

      const data = await res.json()
      const plan = data.plan as { id: string } | null
      const tasks = data.tasks as PlanTask[]

      if (!plan) {
        return false
      }

      // 筛选知识学习任务
      const knowledge = tasks.filter((t) => t.type === 'knowledge')
      setKnowledgeTasks(knowledge)
      if (knowledge.length > 0) {
        setSelectedTask(knowledge[0])
      }

      return true
    } catch {
      return false
    }
  }, [])

  // ---- 签到 ----
  const doCheckin = useCallback(async () => {
    try {
      const res = await fetch('/api/scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scene: 'library' }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? '签到失败')
        router.push('/campus')
        return null
      }

      const { checkin } = (await res.json()) as { checkin: SceneCheckin }
      return checkin
    } catch {
      toast.error('签到请求失败')
      router.push('/campus')
      return null
    }
  }, [router])

  // ---- 页面初始化 ----
  useEffect(() => {
    const init = async () => {
      setLoading(true)

      // 1. 检查是否有活跃签到（可能在图书馆）
      try {
        const activeRes = await fetch('/api/scene')
        if (activeRes.ok) {
          const { active_checkin } = (await activeRes.json()) as {
            active_checkin: SceneCheckin | null
          }

          if (active_checkin) {
            if (active_checkin.scene === 'library') {
              // 已在图书馆，恢复状态
              setCheckinId(active_checkin.id)
              await fetchPlan()
              setLoading(false)
              return
            } else {
              // 在其他场景
              const sceneNames: Record<string, string> = {
                'study-room': '自习室',
                'exam-center': '考试中心',
                sports: '运动场',
                canteen: '食堂',
                dormitory: '宿舍',
                bulletin: '公告栏',
                shop: '校园商店',
              }
              const name = sceneNames[active_checkin.scene] ?? active_checkin.scene
              toast.error(`你当前正在${name}中，请先离开`)
              router.push('/campus')
              return
            }
          }
        }
      } catch {
        // 忽略，继续流程
      }

      // 2. 获取今日规划
      const hasPlan = await fetchPlan()
      if (!hasPlan) {
        toast.error('请先完成今日规划')
        router.push('/campus')
        return
      }

      // 3. 签到
      const checkin = await doCheckin()
      if (checkin) {
        setCheckinId(checkin.id)
      }

      setLoading(false)
    }

    init()
  }, [fetchPlan, doCheckin, router])

  // ---- 离开图书馆 ----
  const handleLeave = useCallback(async () => {
    if (!checkinId || leaving) return

    setLeaving(true)
    try {
      const res = await fetch('/api/scene', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkin_id: checkinId }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? '离开失败')
        setLeaving(false)
        return
      }

      const { checkin } = (await res.json()) as { checkin: SceneCheckin }
      const minutes = checkin.duration_minutes ?? 0
      toast.success(`已离开图书馆，本次学习 ${minutes} 分钟`)
      router.push('/campus')
    } catch {
      toast.error('离开请求失败')
      setLeaving(false)
    }
  }, [checkinId, leaving, router])

  // ---- 番茄钟完成回调 ----
  const handleSessionComplete = useCallback(
    (session: PomodoroSession) => {
      toast.success(
        `完成一个番茄钟！专注 ${session.focus_minutes} 分钟，获得积分奖励`
      )
    },
    []
  )

  // ---- 加载状态 ----
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin" style={{ color: LIBRARY_COLOR }} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-4">
      {/* 顶部栏 */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/campus">
          <Button variant="ghost" size="sm" className="text-gray-500 -ml-2">
            <ArrowLeft className="size-4 mr-1" />
            返回校园
          </Button>
        </Link>
        <h1 className="text-lg font-bold" style={{ color: LIBRARY_COLOR }}>
          📚 图书馆
        </h1>
      </div>

      {/* 任务信息区 */}
      {knowledgeTasks.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="size-4" style={{ color: LIBRARY_COLOR }} />
            <span className="text-sm font-semibold text-gray-700">
              当前学习任务
            </span>
          </div>

          {knowledgeTasks.length === 1 ? (
            // 单个任务直接显示
            <div
              className="rounded-xl border p-3"
              style={{
                borderColor: `${LIBRARY_COLOR}30`,
                backgroundColor: `${LIBRARY_COLOR}08`,
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: LIBRARY_COLOR }}>
                    {knowledgeTasks[0].subject}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {knowledgeTasks[0].topic}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  <span>{knowledgeTasks[0].estimated_min} 分钟</span>
                </div>
              </div>
            </div>
          ) : (
            // 多个任务显示列表
            <div className="space-y-2">
              {knowledgeTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className="w-full rounded-xl border p-3 text-left transition-all"
                  style={{
                    borderColor:
                      selectedTask?.id === task.id
                        ? `${LIBRARY_COLOR}60`
                        : `${LIBRARY_COLOR}20`,
                    backgroundColor:
                      selectedTask?.id === task.id
                        ? `${LIBRARY_COLOR}10`
                        : `${LIBRARY_COLOR}05`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex size-5 shrink-0 items-center justify-center rounded-full text-xs text-white"
                        style={{ backgroundColor: LIBRARY_COLOR }}
                      >
                        {selectedTask?.id === task.id ? '✓' : task.id}
                      </div>
                      <div>
                        <p
                          className="text-sm font-medium"
                          style={{ color: LIBRARY_COLOR }}
                        >
                          {task.subject}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {task.topic}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      <span>{task.estimated_min} 分钟</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 学习内容区（占位） */}
      <div className="mb-6">
        <div
          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-12 px-4"
          style={{
            borderColor: `${LIBRARY_COLOR}30`,
            backgroundColor: `${LIBRARY_COLOR}05`,
          }}
        >
          <div
            className="flex size-16 items-center justify-center rounded-full mb-4"
            style={{ backgroundColor: `${LIBRARY_COLOR}10` }}
          >
            <Video className="size-8" style={{ color: LIBRARY_COLOR }} />
          </div>
          <p className="text-sm font-medium" style={{ color: LIBRARY_COLOR }}>
            学习内容即将上线
          </p>
          <p className="text-xs text-muted-foreground mt-1 text-center">
            在这里观看学习视频，掌握知识点
          </p>
        </div>
      </div>

      {/* 番茄钟区域 */}
      <div className="mb-6">
        <div
          className="rounded-xl border p-6"
          style={{
            borderColor: `${LIBRARY_COLOR}20`,
            backgroundColor: `${LIBRARY_COLOR}05`,
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock className="size-4" style={{ color: LIBRARY_COLOR }} />
            <span className="text-sm font-semibold text-gray-700">
              专注计时
            </span>
          </div>
          <div className="flex justify-center">
            <PomodoroTimer
              scene="library"
              checkinId={checkinId ?? undefined}
              onSessionComplete={handleSessionComplete}
              autoStart={!!checkinId}
            />
          </div>
        </div>
      </div>

      {/* 离开按钮 */}
      <div className="pb-4">
        <Button
          onClick={handleLeave}
          disabled={leaving}
          variant="outline"
          className="w-full text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
        >
          {leaving ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <LogOut className="size-4 mr-2" />
          )}
          离开图书馆
        </Button>
      </div>
    </div>
  )
}
