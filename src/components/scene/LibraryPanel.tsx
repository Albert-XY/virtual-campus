'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
  BookOpen,
  Clock,
  CheckCircle2,
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
import type { Task, TaskStatus, PomodoroSession } from '@/types'

// ============================================================
// 类型
// ============================================================
interface LibraryPanelProps {
  checkinId: string | null
  onLeave: () => void
}

// ============================================================
// 辅助函数
// ============================================================
function statusBadge(status: TaskStatus) {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="outline" className="text-muted-foreground border-border">
          待完成
        </Badge>
      )
    case 'in_progress':
      return (
        <Badge
          variant="outline"
          className="text-primary border-primary/30 bg-[var(--accent-light)]"
        >
          进行中
        </Badge>
      )
    case 'completed':
      return (
        <Badge
          variant="outline"
          className="text-[var(--success)] border-[var(--success)]/30 bg-[var(--success-light)]"
        >
          已完成
        </Badge>
      )
  }
}

// ============================================================
// 组件
// ============================================================
export default function LibraryPanel({ checkinId, onLeave }: LibraryPanelProps) {
  // ---- 状态 ----
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<Task[]>([])
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

  // ---- 页面初始化 ----
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await fetchTasks()
      setLoading(false)
    }

    init()
  }, [fetchTasks])

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
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg py-2">
      {/* 当前选中任务提示 */}
      {selectedTask && selectedTask.status !== 'completed' && (
        <div
          className="mb-4 rounded-xl border p-3"
          style={{
            borderColor: 'var(--scene-library)',
            backgroundColor: 'var(--scene-library-bg)',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="size-4" style={{ color: 'var(--scene-library)' }} />
            <span className="text-xs font-medium text-muted-foreground">
              正在学习
            </span>
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--scene-library)' }}>
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
                      ? 'var(--scene-library)'
                      : 'transparent',
                  borderColor:
                    selectedTask?.id === task.id && task.status !== 'completed'
                      ? 'var(--scene-library)'
                      : 'var(--border)',
                  backgroundColor:
                    selectedTask?.id === task.id && task.status !== 'completed'
                      ? 'var(--scene-library-bg)'
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
                          style={{ color: 'var(--scene-library)' }}
                        />
                      ) : task.status === 'in_progress' ? (
                        <Clock className="size-5 text-primary" />
                      ) : (
                        <div
                          className="size-5 rounded-full border-2"
                          style={{ borderColor: 'var(--border)' }}
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
                          <Star className="size-3.5" style={{ color: 'var(--points-color)' }} />
                          <span className="text-xs font-medium" style={{ color: 'var(--points-text)' }}>
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
                        style={{ backgroundColor: 'var(--scene-library)' }}
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
                          borderColor: 'var(--scene-library)',
                          color: 'var(--scene-library)',
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
            borderColor: 'var(--border)',
            backgroundColor: 'var(--scene-library-bg)',
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock className="size-4" style={{ color: 'var(--scene-library)' }} />
            <span className="text-sm font-semibold text-foreground">
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
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
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
              style={{ backgroundColor: 'var(--scene-library)' }}
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
