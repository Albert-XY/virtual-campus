'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Loader2,
  Star,
  TrendingUp,
  BarChart3,
} from 'lucide-react'
import ImmersiveSceneLayout from '@/components/scene/ImmersiveSceneLayout'
import AmbientPlayer from '@/components/ambient/AmbientPlayer'
import PomodoroTimer from '@/components/PomodoroTimer'
import type { Task, PomodoroSession } from '@/types'

// ============================================================
// 沉浸式图书馆页面
//
// 设计理念：
// - 进入图书馆 = 进入学习空间，没有积分、没有通知、没有菜单
// - 任务、数据、番茄钟全部铺开，一目了然
// - 环境音效自动播放，营造氛围
// - 深色安静配色，让眼睛放松
// ============================================================

interface TaskStats {
  total: number
  completed: number
  totalEstimated: number
  totalActual: number
  avgAccuracy: number | null
}

export default function LibraryPage() {
  // ---- 状态 ----
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [checkinId, setCheckinId] = useState<string | null>(null)

  // 完成任务弹窗
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [completingTask, setCompletingTask] = useState<Task | null>(null)
  const [actualMinutes, setActualMinutes] = useState(25)
  const [accuracyRate, setAccuracyRate] = useState(80)
  const [completeNote, setCompleteNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // 过去数据
  const [pastStats, setPastStats] = useState<{
    todayMinutes: number
    streak: number
    weekCompleted: number
  } | null>(null)

  // ---- 计算属性 ----
  const activeTask = tasks.find((t) => t.status === 'in_progress')
  const stats: TaskStats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    totalEstimated: tasks.reduce((sum, t) => sum + t.estimated_minutes, 0),
    totalActual: tasks
      .filter((t) => t.actual_minutes !== null)
      .reduce((sum, t) => sum + (t.actual_minutes ?? 0), 0),
    avgAccuracy: (() => {
      const completed = tasks.filter((t) => t.accuracy_rate !== null)
      if (completed.length === 0) return null
      return Math.round(completed.reduce((sum, t) => sum + (t.accuracy_rate ?? 0), 0) / completed.length)
    })(),
  }

  const remainingMinutes = stats.totalEstimated - stats.totalActual
  const progressPct = stats.totalEstimated > 0
    ? Math.round((stats.totalActual / stats.totalEstimated) * 100)
    : 0

  // ---- 数据获取 ----
  const fetchData = useCallback(async () => {
    try {
      const [tasksRes, sceneRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/scene'),
      ])

      if (tasksRes.ok) {
        const data = await tasksRes.json()
        const taskList = data.tasks as Task[]
        setTasks(taskList)
        const firstPending = taskList.find(
          (t) => t.status === 'pending' || t.status === 'in_progress'
        )
        if (firstPending) setSelectedTask(firstPending)
      }

      if (sceneRes.ok) {
        const sceneData = await sceneRes.json()
        if (sceneData.active_checkin) {
          setCheckinId(sceneData.active_checkin.id)
        }
      }

      // 获取过去数据
      try {
        const [pomodoroRes, sleepRes] = await Promise.all([
          fetch('/api/pomodoro/today'),
          fetch('/api/sleep?action=streak'),
        ])
        const pomodoroData = pomodoroRes.ok ? await pomodoroRes.json() : {}
        const sleepData = sleepRes.ok ? await sleepRes.json() : {}
        setPastStats({
          todayMinutes: pomodoroData.total_focus_minutes ?? 0,
          streak: sleepData.streak ?? 0,
          weekCompleted: pomodoroData.week_sessions ?? 0,
        })
      } catch {
        // 过去数据获取失败不影响核心功能
      }
    } catch {
      toast.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ---- 场景签到/签退 ----
  const handleEnter = useCallback(async () => {
    try {
      const res = await fetch('/api/scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scene: 'library' }),
      })
      if (res.ok) {
        const data = await res.json()
        setCheckinId(data.checkin.id)
      }
      // 409 = 已在其他场景，忽略
    } catch { /* ignore */ }
  }, [])

  const handleLeave = useCallback(async () => {
    if (checkinId) {
      try {
        await fetch('/api/scene', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checkin_id: checkinId }),
        })
      } catch { /* ignore */ }
    }
  }, [checkinId])

  // ---- 任务操作 ----
  const handleStartTask = useCallback(async (taskId: string) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', task_id: taskId }),
      })
      if (res.ok) {
        const { task } = await res.json()
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: task.status } : t))
        )
      }
    } catch {
      toast.error('开始任务失败')
    }
  }, [])

  const handleOpenComplete = useCallback((task: Task, pomodoroMinutes?: number) => {
    setCompletingTask(task)
    setActualMinutes(pomodoroMinutes ?? task.estimated_minutes)
    setAccuracyRate(80)
    setCompleteNote('')
    setCompleteDialogOpen(true)
  }, [])

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
      if (res.ok) {
        const { task } = await res.json()
        setTasks((prev) => {
          const updated = prev.map((t) =>
            t.id === completingTask.id
              ? { ...t, status: task.status, actual_minutes: task.actual_minutes, accuracy_rate: task.accuracy_rate, points_earned: task.points_earned, completed_at: task.completed_at }
              : t
          )
          return updated.sort((a, b) => {
            if (a.status === 'completed' && b.status !== 'completed') return 1
            if (a.status !== 'completed' && b.status === 'completed') return -1
            return 0
          })
        })
        if (selectedTask?.id === completingTask.id) {
          const next = tasks.find((t) => t.id !== completingTask.id && t.status !== 'completed')
          setSelectedTask(next ?? null)
        }
        setCompleteDialogOpen(false)
        toast.success(`+${task.points_earned} 积分`)
      }
    } catch {
      toast.error('完成任务失败')
    } finally {
      setSubmitting(false)
    }
  }, [completingTask, actualMinutes, accuracyRate, selectedTask, tasks])

  const handleSessionComplete = useCallback((session: PomodoroSession) => {
    if (activeTask) {
      handleOpenComplete(activeTask, session.focus_minutes)
    }
  }, [activeTask, handleOpenComplete])

  // ---- 渲染 ----
  return (
    <ImmersiveSceneLayout
      sceneName="图书馆"
      sceneId="library"
      onEnter={handleEnter}
      onLeave={handleLeave}
      footerExtra={
        <AmbientPlayer preset="library" className="mr-auto" />
      }
    >
      {/* 氛围层 */}
      <div className="library-atmosphere" />

      <div className="library-content">
        {/* 当前正在学习的任务 */}
        {selectedTask && selectedTask.status !== 'completed' && (
          <div className="library-current-task">
            <div className="library-current-task__label">
              <BookOpen className="size-3" />
              正在学习
            </div>
            <div className="library-current-task__name">
              {selectedTask.subject} — {selectedTask.topic}
            </div>
          </div>
        )}

        {/* 今日数据概览 */}
        <div className="library-stats">
          <div className="library-stat">
            <div className="library-stat__value">{stats.completed}/{stats.total}</div>
            <div className="library-stat__label">任务完成</div>
          </div>
          <div className="library-stat">
            <div className="library-stat__value">{pastStats?.todayMinutes ?? 0}</div>
            <div className="library-stat__label">今日专注(分)</div>
          </div>
          <div className="library-stat">
            <div className="library-stat__value">{pastStats?.streak ?? 0}</div>
            <div className="library-stat__label">连续早睡(天)</div>
          </div>
        </div>

        {/* 今日预估进度 */}
        <div className="library-estimate">
          <div className="library-estimate__title">今日学习进度</div>
          <div className="library-estimate__bar">
            <div className="library-estimate__fill" style={{ width: `${Math.min(progressPct, 100)}%` }} />
          </div>
          <div className="library-estimate__text">
            已投入 {stats.totalActual} 分钟 / 预计 {stats.totalEstimated} 分钟
            {remainingMinutes > 0 && ` · 还剩约 ${remainingMinutes} 分钟`}
            {remainingMinutes <= 0 && stats.total > 0 && ' · 已完成全部预估'}
          </div>
        </div>

        {/* 任务列表 */}
        {tasks.length > 0 && (
          <div className="library-task-list">
            <div className="library-task-list__header">
              <span className="library-task-list__title">
                今日任务 ({stats.completed}/{stats.total})
              </span>
            </div>

            {tasks.map((task) => {
              const isSelected = selectedTask?.id === task.id && task.status !== 'completed'
              const isCompleted = task.status === 'completed'

              return (
                <button
                  key={task.id}
                  onClick={() => { if (!isCompleted) setSelectedTask(task) }}
                  disabled={isCompleted}
                  className={`library-task-item ${isSelected ? 'library-task-item--selected' : ''} ${isCompleted ? 'library-task-item--completed' : ''}`}
                >
                  {/* 状态图标 */}
                  <div className="library-task-item__icon">
                    {isCompleted && <CheckCircle2 className="size-3" style={{ color: '#3FB950' }} />}
                    {task.status === 'in_progress' && <Clock className="size-3" style={{ color: '#58A6FF' }} />}
                  </div>

                  {/* 任务信息 */}
                  <div className="library-task-item__info">
                    <div className="library-task-item__subject">{task.subject}</div>
                    <div className="library-task-item__topic">{task.topic}</div>
                    <div className="library-task-item__meta">
                      <span>预计 {task.estimated_minutes} 分钟</span>
                      {isCompleted && task.actual_minutes !== null && (
                        <span>实际 {task.actual_minutes} 分钟</span>
                      )}
                      {isCompleted && task.accuracy_rate !== null && (
                        <span>准确率 {task.accuracy_rate}%</span>
                      )}
                      {isCompleted && task.points_earned > 0 && (
                        <span style={{ color: '#E3B341' }}>+{task.points_earned}</span>
                      )}
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  {!isCompleted && (
                    <div className="library-task-item__action">
                      {task.status === 'pending' ? (
                        <button
                          className="library-task-item__action library-task-item__action--start"
                          onClick={(e) => { e.stopPropagation(); handleStartTask(task.id) }}
                        >
                          开始
                        </button>
                      ) : (
                        <button
                          className="library-task-item__action library-task-item__action--complete"
                          onClick={(e) => { e.stopPropagation(); handleOpenComplete(task) }}
                        >
                          完成
                        </button>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* 番茄钟 */}
        <div className="library-pomodoro">
          <div className="library-pomodoro__header">
            <span className="library-pomodoro__title">
              <Clock className="size-3 inline mr-1" />
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
      {completeDialogOpen && completingTask && (
        <div className="library-complete-dialog" onClick={() => !submitting && setCompleteDialogOpen(false)}>
          <div className="library-complete-dialog__content" onClick={(e) => e.stopPropagation()}>
            <div className="library-complete-dialog__title">完成任务</div>
            <div className="library-complete-dialog__subtitle">
              {completingTask.subject} — {completingTask.topic}
            </div>

            <div className="library-complete-dialog__field">
              <label className="library-complete-dialog__label">实际用时（分钟）</label>
              <input
                type="number"
                className="library-complete-dialog__input"
                min={1}
                max={999}
                value={actualMinutes}
                onChange={(e) => setActualMinutes(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>

            <div className="library-complete-dialog__field">
              <label className="library-complete-dialog__label">
                准确率/完成度：{accuracyRate}%
              </label>
              <input
                type="range"
                className="library-complete-dialog__range"
                min={0}
                max={100}
                step={5}
                value={accuracyRate}
                onChange={(e) => setAccuracyRate(parseInt(e.target.value))}
              />
              <div className="flex justify-between text-xs mt-1" style={{ color: '#484F58' }}>
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            <div className="library-complete-dialog__field">
              <label className="library-complete-dialog__label">备注（可选）</label>
              <textarea
                className="library-complete-dialog__textarea"
                placeholder="记录学习心得..."
                value={completeNote}
                onChange={(e) => setCompleteNote(e.target.value)}
              />
            </div>

            <div className="library-complete-dialog__actions">
              <button
                className="library-complete-dialog__btn library-complete-dialog__btn--cancel"
                onClick={() => setCompleteDialogOpen(false)}
                disabled={submitting}
              >
                取消
              </button>
              <button
                className="library-complete-dialog__btn library-complete-dialog__btn--confirm"
                onClick={handleConfirmComplete}
                disabled={submitting}
              >
                {submitting ? '提交中...' : '确认完成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ImmersiveSceneLayout>
  )
}
