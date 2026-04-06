'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Pencil,
  CheckCircle2,
  Clock,
  Star,
  LogOut,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
const THEME_COLOR = '#16A34A'

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
// 页面组件
// ============================================================
export default function StudyRoomPage() {
  const router = useRouter()

  // ---- 数据状态 ----
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [checkinId, setCheckinId] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  // ---- 完成任务弹窗 ----
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [completingTask, setCompletingTask] = useState<Task | null>(null)
  const [actualMinutes, setActualMinutes] = useState<number>(25)
  const [accuracyRate, setAccuracyRate] = useState<number>(80)
  const [completeNote, setCompleteNote] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  // ---- 当前进行中的任务 ----
  const activeTask = tasks.find((t) => t.status === 'in_progress')

  // ============================================================
  // 进入流程
  // ============================================================
  useEffect(() => {
    const init = async () => {
      try {
        // 1. 检查是否有活跃签到
        const activeRes = await fetch('/api/scene')
        if (activeRes.ok) {
          const { active_checkin } = (await activeRes.json()) as {
            active_checkin: SceneCheckin | null
          }

          if (active_checkin) {
            if (active_checkin.scene === 'study-room') {
              setCheckinId(active_checkin.id)
            } else {
              const sceneNames: Record<string, string> = {
                library: '图书馆',
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

        // 2. 获取今日所有任务（不过滤类型）
        const tasksRes = await fetch('/api/tasks')
        if (tasksRes.ok) {
          const tasksData = await tasksRes.json()
          const taskList = tasksData.tasks as Task[]
          setTasks(taskList)

          // 自动选中第一个未完成的任务
          const firstPending = taskList.find(
            (t) => t.status === 'pending' || t.status === 'in_progress'
          )
          if (firstPending) {
            setSelectedTask(firstPending)
          }
        }

        // 3. 场景签到（如果尚未签到）
        if (!checkinId) {
          const checkinRes = await fetch('/api/scene', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scene: 'study-room' }),
          })

          if (checkinRes.ok) {
            const checkinData = await checkinRes.json()
            setCheckinId(checkinData.checkin?.id ?? null)
          }
        }
      } catch (error) {
        console.error('初始化失败:', error)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================================
  // 开始任务
  // ============================================================
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

      // 更新本地状态
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: task.status } : t))
      )
    } catch (error) {
      console.error('开始任务失败:', error)
      toast.error('开始任务失败，请重试')
    }
  }, [])

  // ============================================================
  // 打开完成弹窗
  // ============================================================
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

  // ============================================================
  // 确认完成任务
  // ============================================================
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

  // ============================================================
  // 番茄钟完成回调
  // ============================================================
  const handlePomodoroComplete = useCallback(
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

  // ============================================================
  // 离开自习室
  // ============================================================
  const handleLeave = useCallback(async () => {
    setLeaving(true)
    try {
      if (checkinId) {
        const res = await fetch('/api/scene', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checkin_id: checkinId }),
        })

        if (res.ok) {
          const { checkin } = (await res.json()) as { checkin: SceneCheckin }
          const minutes = checkin.duration_minutes ?? 0
          toast.success(`已离开自习室，本次学习 ${minutes} 分钟`)
        }
      }
    } catch {
      // 静默处理
    } finally {
      router.push('/campus')
    }
  }, [checkinId, router])

  // ============================================================
  // 渲染
  // ============================================================
  return (
    <div className="mx-auto min-h-[80vh] max-w-lg px-4 py-4">
      {/* ---- 顶部栏 ---- */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/campus">
          <Button variant="ghost" size="sm" className="text-gray-600">
            <ArrowLeft className="size-4 mr-1" />
            返回校园
          </Button>
        </Link>
        <h1 className="text-lg font-bold flex items-center gap-1.5">
          <Pencil className="size-5" style={{ color: THEME_COLOR }} />
          <span style={{ color: THEME_COLOR }}>自习室</span>
        </h1>
        <div className="w-20" />
      </div>

      {/* ---- 加载状态 ---- */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* ---- 无任务 ---- */}
      {!loading && tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div
            className="inline-flex items-center justify-center size-16 rounded-full mb-4"
            style={{ backgroundColor: `${THEME_COLOR}15` }}
          >
            <Pencil className="size-8" style={{ color: THEME_COLOR }} />
          </div>
          <h2 className="text-lg font-semibold mb-2">暂无任务</h2>
          <p className="text-sm text-muted-foreground mb-4">
            请先在今日规划中添加任务
          </p>
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              前往规划
            </Button>
          </Link>
        </div>
      )}

      {/* ---- 当前选中任务提示 ---- */}
      {!loading && selectedTask && selectedTask.status !== 'completed' && (
        <div
          className="mb-4 rounded-xl border p-3"
          style={{
            borderColor: `${THEME_COLOR}30`,
            backgroundColor: `${THEME_COLOR}08`,
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Pencil className="size-4" style={{ color: THEME_COLOR }} />
            <span className="text-xs font-medium text-muted-foreground">
              正在学习
            </span>
          </div>
          <p className="text-sm font-semibold" style={{ color: THEME_COLOR }}>
            {selectedTask.subject} - {selectedTask.topic}
          </p>
        </div>
      )}

      {/* ---- 番茄钟区域 ---- */}
      {!loading && activeTask && (
        <div className="mb-6">
          <Card>
            <CardContent className="flex flex-col items-center py-6">
              <p className="text-sm text-muted-foreground mb-3">
                正在进行：
                <span className="font-medium text-foreground ml-1">
                  {activeTask.subject} - {activeTask.topic}
                </span>
              </p>
              <PomodoroTimer
                scene="study-room"
                checkinId={checkinId ?? undefined}
                compact
                onSessionComplete={handlePomodoroComplete}
              />
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                style={{
                  borderColor: THEME_COLOR,
                  color: THEME_COLOR,
                }}
                onClick={() => handleOpenComplete(activeTask)}
              >
                <CheckCircle2 className="size-4 mr-1" />
                完成任务
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ---- 任务列表 ---- */}
      {!loading && tasks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground px-1">
            今日任务 ({tasks.filter((t) => t.status === 'completed').length}/{tasks.length})
          </h3>

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
                    ? THEME_COLOR
                    : 'transparent',
                borderColor:
                  selectedTask?.id === task.id && task.status !== 'completed'
                    ? `${THEME_COLOR}40`
                    : `${THEME_COLOR}15`,
                backgroundColor:
                  selectedTask?.id === task.id && task.status !== 'completed'
                    ? `${THEME_COLOR}08`
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
                        style={{ color: THEME_COLOR }}
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
                      <span className="font-medium text-sm truncate">
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
                      <div className="flex items-center gap-1 mt-1.5">
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
                      style={{ backgroundColor: THEME_COLOR }}
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
                        borderColor: THEME_COLOR,
                        color: THEME_COLOR,
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
      )}

      {/* ---- 底部离开按钮 ---- */}
      {!loading && tasks.length > 0 && (
        <div className="mt-8 pb-4">
          <Button
            variant="outline"
            className="w-full text-gray-500"
            onClick={handleLeave}
            disabled={leaving}
          >
            <LogOut className="size-4 mr-1" />
            {leaving ? '离开中...' : '离开自习室'}
          </Button>
        </div>
      )}

      {/* ---- 完成任务弹窗 ---- */}
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
              <Label htmlFor="sr-actual-minutes">实际用时（分钟）</Label>
              <Input
                id="sr-actual-minutes"
                type="number"
                min={1}
                max={999}
                value={actualMinutes}
                onChange={(e) =>
                  setActualMinutes(Math.max(1, parseInt(e.target.value) || 1))
                }
              />
            </div>

            {/* 准确率 */}
            <div className="space-y-2">
              <Label htmlFor="sr-accuracy-rate">
                准确率/完成度：{accuracyRate}%
              </Label>
              <Input
                id="sr-accuracy-rate"
                type="range"
                min={0}
                max={100}
                step={5}
                value={accuracyRate}
                onChange={(e) => setAccuracyRate(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {/* 备注 */}
            <div className="space-y-2">
              <Label htmlFor="sr-complete-note">备注（可选）</Label>
              <textarea
                id="sr-complete-note"
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
              style={{ backgroundColor: THEME_COLOR }}
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
