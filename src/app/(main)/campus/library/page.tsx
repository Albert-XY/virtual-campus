'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft,
  BookOpen,
  Clock,
  CheckCircle2,
  LogOut,
  Loader2,
  Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import PomodoroTimer from '@/components/PomodoroTimer'
import type { Task, TaskStatus, SceneCheckin, PomodoroSession } from '@/types'

// ============================================================
// 常量
// ============================================================
const LIBRARY_COLOR = '#1E40AF'

// ============================================================
// 辅助函数
// ============================================================
function statusBadge(status: TaskStatus) {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="outline" className="text-gray-500 border-gray-300">
          待完成
        </Badge>
      )
    case 'in_progress':
      return (
        <Badge
          variant="outline"
          className="text-blue-600 border-blue-300 bg-blue-50"
        >
          进行中
        </Badge>
      )
    case 'completed':
      return (
        <Badge
          variant="outline"
          className="text-green-600 border-green-300 bg-green-50"
        >
          已完成
        </Badge>
      )
  }
}

// ============================================================
// 主页面
// ============================================================
export default function LibraryPage() {
  const router = useRouter()

  // ---- 状态 ----
  const [loading, setLoading] = useState(true)
  const [checkinId, setCheckinId] = useState<string | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [leaving, setLeaving] = useState(false)

  // ---- 完成任务弹窗 ----
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [completingTask, setCompletingTask] = useState<Task | null>(null)
  const [actualMinutes, setActualMinutes] = useState<number>(25)
  const [accuracyRate, setAccuracyRate] = useState<number>(80)
  const [completeNote, setCompleteNote] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  // ---- 当前进行中的任务 ----
  const activeTask = tasks.find((t) => t.status === 'in_progress')

  // ---- 获取今日任务 ----
  const fetchTasks = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/tasks')
      if (!res.ok) return false

      const data = await res.json()
      const taskList = data.tasks as Task[]
      setTasks(taskList)

      // 自动选中第一个未完成的任务
      const firstPending = taskList.find(
        (t) => t.status === 'pending' || t.status === 'in_progress'
      )
      if (firstPending) {
        setSelectedTask(firstPending)
      }

      return taskList.length > 0
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

      // 1. 检查是否有活跃签到
      try {
        const activeRes = await fetch('/api/scene')
        if (activeRes.ok) {
          const { active_checkin } = (await activeRes.json()) as {
            active_checkin: SceneCheckin | null
          }

          if (active_checkin) {
            if (active_checkin.scene === 'library') {
              setCheckinId(active_checkin.id)
              await fetchTasks()
              setLoading(false)
              return
            } else {
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

      // 2. 获取今日任务
      const hasTasks = await fetchTasks()
      if (!hasTasks) {
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
  }, [fetchTasks, doCheckin, router])

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

  // ---- 开始任务 ----
  const handleStartTask = useCallback(async (taskId: string) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', task_id: taskId }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '开始任务失败')
      }

      const { task } = await res.json()

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: task.status } : t))
      )
    } catch (error) {
      console.error('开始任务失败:', error)
      toast.error('开始任务失败，请重试')
    }
  }, [])

  // ---- 打开完成弹窗 ----
  const handleOpenComplete = useCallback(
    (task: Task, pomodoroMinutes?: number) => {
      setCompletingTask(task)
      setActualMinutes(pomodoroMinutes ?? task.estimated_minutes)
      setAccuracyRate(80)
      setCompleteNote('')
      setCompleteDialogOpen(true)
    },
    []
  )

  // ---- 确认完成任务 ----
  const handleConfirmComplete = useCallback(async () => {
    if (!completingTask) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          task_id: completingTask.id,
          actual_minutes: actualMinutes,
          accuracy_rate: accuracyRate,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '完成任务失败')
      }

      const { task } = await res.json()

      // 更新本地状态
      setTasks((prev) => {
        const updated = prev.map((t) =>
          t.id === completingTask.id
            ? {
                ...t,
                status: task.status,
                actual_minutes: task.actual_minutes,
                accuracy_rate: task.accuracy_rate,
                points_earned: task.points_earned,
                completed_at: task.completed_at,
              }
            : t
        )
        // 已完成的排到最后
        return updated.sort((a, b) => {
          if (a.status === 'completed' && b.status !== 'completed') return 1
          if (a.status !== 'completed' && b.status === 'completed') return -1
          return 0
        })
      })

      // 如果选中的任务被完成，自动切换到下一个未完成任务
      if (selectedTask?.id === completingTask.id) {
        const nextPending = tasks.find(
          (t) =>
            t.id !== completingTask.id &&
            (t.status === 'pending' || t.status === 'in_progress')
        )
        setSelectedTask(nextPending ?? null)
      }

      setCompleteDialogOpen(false)
      setCompletingTask(null)
      toast.success(`任务完成！获得 ${task.points_earned} 积分`)
    } catch (error) {
      console.error('完成任务失败:', error)
      toast.error('完成任务失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }, [completingTask, actualMinutes, accuracyRate, selectedTask, tasks])

  // ---- 番茄钟完成回调 ----
  const handleSessionComplete = useCallback(
    (session: PomodoroSession) => {
      toast.success(
        `完成一个番茄钟！专注 ${session.focus_minutes} 分钟，获得积分奖励`
      )
      // 如果有进行中的任务，弹出完成弹窗
      if (activeTask) {
        handleOpenComplete(activeTask, session.focus_minutes)
      }
    },
    [activeTask, handleOpenComplete]
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
          图书馆
        </h1>
      </div>

      {/* 当前选中任务提示 */}
      {selectedTask && selectedTask.status !== 'completed' && (
        <div
          className="mb-4 rounded-xl border p-3"
          style={{
            borderColor: `${LIBRARY_COLOR}30`,
            backgroundColor: `${LIBRARY_COLOR}08`,
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="size-4" style={{ color: LIBRARY_COLOR }} />
            <span className="text-xs font-medium text-muted-foreground">
              正在学习
            </span>
          </div>
          <p className="text-sm font-semibold" style={{ color: LIBRARY_COLOR }}>
            {selectedTask.subject} - {selectedTask.topic}
          </p>
        </div>
      )}

      {/* 任务列表 */}
      {tasks.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-sm font-medium text-muted-foreground">
              今日任务 ({tasks.filter((t) => t.status === 'completed').length}/{tasks.length})
            </span>
          </div>

          <div className="space-y-2">
            {tasks.map((task) => (
              <button
                key={task.id}
                onClick={() => {
                  if (task.status !== 'completed') {
                    setSelectedTask(task)
                  }
                }}
                disabled={task.status === 'completed'}
                className="w-full rounded-xl border p-3 text-left transition-all disabled:opacity-60"
                style={{
                  borderLeftWidth: '3px',
                  borderLeftColor:
                    selectedTask?.id === task.id && task.status !== 'completed'
                      ? LIBRARY_COLOR
                      : 'transparent',
                  borderColor:
                    selectedTask?.id === task.id && task.status !== 'completed'
                      ? `${LIBRARY_COLOR}40`
                      : `${LIBRARY_COLOR}15`,
                  backgroundColor:
                    selectedTask?.id === task.id && task.status !== 'completed'
                      ? `${LIBRARY_COLOR}08`
                      : 'transparent',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* 状态图标 */}
                    <div className="shrink-0">
                      {task.status === 'completed' ? (
                        <CheckCircle2
                          className="size-5"
                          style={{ color: LIBRARY_COLOR }}
                        />
                      ) : task.status === 'in_progress' ? (
                        <Clock className="size-5 text-blue-500" />
                      ) : (
                        <div
                          className="size-5 rounded-full border-2"
                          style={{ borderColor: '#D1D5DB' }}
                        />
                      )}
                    </div>

                    {/* 任务信息 */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium truncate">
                          {task.subject}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {task.topic}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          预计 {task.estimated_minutes} 分钟
                        </span>
                        {statusBadge(task.status)}
                      </div>

                      {/* 已完成：显示积分 */}
                      {task.status === 'completed' && task.points_earned > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="size-3.5 text-yellow-500" />
                          <span className="text-xs font-medium text-yellow-600">
                            +{task.points_earned} 积分
                          </span>
                          {task.actual_minutes !== null && (
                            <span className="text-xs text-muted-foreground ml-2">
                              实际 {task.actual_minutes} 分钟
                              {task.accuracy_rate !== null &&
                                ` / 准确率 ${task.accuracy_rate}%`}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="shrink-0 ml-2">
                    {task.status === 'pending' && (
                      <Button
                        size="sm"
                        style={{ backgroundColor: LIBRARY_COLOR }}
                        className="text-white hover:opacity-90"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStartTask(task.id)
                        }}
                      >
                        开始
                      </Button>
                    )}
                    {task.status === 'in_progress' && (
                      <Button
                        size="sm"
                        variant="outline"
                        style={{
                          borderColor: LIBRARY_COLOR,
                          color: LIBRARY_COLOR,
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenComplete(task)
                        }}
                      >
                        <CheckCircle2 className="size-4 mr-1" />
                        完成
                      </Button>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

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

      {/* 完成任务弹窗 */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>完成任务</DialogTitle>
            <DialogDescription>
              {completingTask && (
                <>
                  {completingTask.subject} - {completingTask.topic}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* 实际用时 */}
            <div className="space-y-2">
              <Label htmlFor="lib-actual-minutes">实际用时（分钟）</Label>
              <Input
                id="lib-actual-minutes"
                type="number"
                min={1}
                max={999}
                value={actualMinutes}
                onChange={(e) =>
                  setActualMinutes(Math.max(1, parseInt(e.target.value) || 1))
                }
              />
            </div>

            {/* 准确率/完成度 */}
            <div className="space-y-2">
              <Label htmlFor="lib-accuracy-rate">
                准确率/完成度：{accuracyRate}%
              </Label>
              <Input
                id="lib-accuracy-rate"
                type="range"
                min={0}
                max={100}
                step={5}
                value={accuracyRate}
                onChange={(e) => setAccuracyRate(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-700"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {/* 备注 */}
            <div className="space-y-2">
              <Label htmlFor="lib-complete-note">备注（可选）</Label>
              <textarea
                id="lib-complete-note"
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="记录学习心得..."
                value={completeNote}
                onChange={(e) => setCompleteNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCompleteDialogOpen(false)}
              disabled={submitting}
            >
              取消
            </Button>
            <Button
              style={{ backgroundColor: LIBRARY_COLOR }}
              className="text-white hover:opacity-90"
              onClick={handleConfirmComplete}
              disabled={submitting}
            >
              {submitting ? '提交中...' : '确认完成'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
