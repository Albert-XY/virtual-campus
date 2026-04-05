'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Pencil, CheckCircle2, Clock, Star, LogOut, Loader2 } from 'lucide-react'
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
import type { Task, TaskStatus } from '@/types'

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

  // ---- 完成任务弹窗 ----
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [completingTask, setCompletingTask] = useState<Task | null>(null)
  const [actualMinutes, setActualMinutes] = useState<number>(25)
  const [accuracyRate, setAccuracyRate] = useState<number>(80)
  const [submitting, setSubmitting] = useState(false)

  // ---- 当前进行中的任务 ----
  const activeTask = tasks.find((t) => t.status === 'in_progress')

  // ---- 练习类任务 ----
  const practiceTasks = tasks.filter((t) => t.task_type === 'practice')

  // ============================================================
  // 进入流程
  // ============================================================
  useEffect(() => {
    const init = async () => {
      try {
        // 1. 获取今日规划及任务
        const planRes = await fetch('/api/plan')
        if (!planRes.ok) throw new Error('获取规划失败')
        const planData = await planRes.json()

        if (planData.tasks && planData.tasks.length > 0) {
          setTasks(planData.tasks)
        }

        // 2. 场景签到
        const checkinRes = await fetch('/api/scene', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scene: 'study-room' }),
        })

        if (checkinRes.ok) {
          const checkinData = await checkinRes.json()
          setCheckinId(checkinData.checkin?.id ?? null)
        } else {
          // 签到接口可能不存在（步骤9尚未完成），静默处理
          console.warn('场景签到失败，可能接口尚未创建')
        }
      } catch (error) {
        console.error('初始化失败:', error)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [])

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
      setTasks((prev) =>
        prev.map((t) =>
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
      )

      setCompleteDialogOpen(false)
      setCompletingTask(null)
      toast.success(`任务完成！获得 ${task.points_earned} 积分`)
    } catch (error) {
      console.error('完成任务失败:', error)
      toast.error('完成任务失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }, [completingTask, actualMinutes, accuracyRate])

  // ============================================================
  // 番茄钟完成回调
  // ============================================================
  const handlePomodoroComplete = useCallback(() => {
    if (activeTask) {
      handleOpenComplete(activeTask, 25)
    }
  }, [activeTask, handleOpenComplete])

  // ============================================================
  // 离开自习室
  // ============================================================
  const handleLeave = useCallback(async () => {
    setLeaving(true)
    try {
      if (checkinId) {
        await fetch('/api/scene', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checkin_id: checkinId }),
        })
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
      {!loading && practiceTasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div
            className="inline-flex items-center justify-center size-16 rounded-full mb-4"
            style={{ backgroundColor: `${THEME_COLOR}15` }}
          >
            <Pencil className="size-8" style={{ color: THEME_COLOR }} />
          </div>
          <h2 className="text-lg font-semibold mb-2">暂无练习任务</h2>
          <p className="text-sm text-muted-foreground mb-4">
            请先在今日规划中添加练习巩固任务
          </p>
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              前往规划
            </Button>
          </Link>
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
                完成练习
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ---- 任务列表 ---- */}
      {!loading && practiceTasks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground px-1">
            练习任务 ({practiceTasks.filter((t) => t.status === 'completed').length}/{practiceTasks.length})
          </h3>

          {practiceTasks.map((task) => (
            <Card key={task.id} data-completed={task.status === 'completed'}>
              <CardContent className="flex items-start gap-3">
                {/* 状态图标 */}
                <div className="mt-0.5">
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
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
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

                {/* 操作按钮 */}
                <div className="shrink-0">
                  {task.status === 'pending' && (
                    <Button
                      size="sm"
                      style={{ backgroundColor: THEME_COLOR }}
                      className="text-white hover:opacity-90"
                      onClick={() => handleStartTask(task.id)}
                    >
                      开始练习
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
                      onClick={() => handleOpenComplete(task)}
                    >
                      <CheckCircle2 className="size-4 mr-1" />
                      完成
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ---- 底部离开按钮 ---- */}
      {!loading && practiceTasks.length > 0 && (
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
            <DialogTitle>完成练习</DialogTitle>
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
              <Label htmlFor="actual-minutes">实际用时（分钟）</Label>
              <Input
                id="actual-minutes"
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
              <Label htmlFor="accuracy-rate">
                准确率：{accuracyRate}%
              </Label>
              <Input
                id="accuracy-rate"
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
