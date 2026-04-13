'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Pencil,
  CheckCircle2,
  Clock,
  Loader2,
} from 'lucide-react'
import ImmersiveSceneLayout from '@/components/scene/ImmersiveSceneLayout'
import AmbientPlayer from '@/components/ambient/AmbientPlayer'
import PomodoroTimer from '@/components/PomodoroTimer'
import type { Task, PomodoroSession } from '@/types'

// ============================================================
// 沉浸式自习室页面
//
// 与图书馆类似，但侧重于练习巩固
// 使用 'study-room' 环境音效预设
// ============================================================

interface TaskStats {
  total: number
  completed: number
  totalEstimated: number
  totalActual: number
  avgAccuracy: number | null
}

export default function StudyRoomPage() {
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
    } catch {
      toast.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleEnter = useCallback(async () => {
    try {
      const res = await fetch('/api/scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scene: 'study-room' }),
      })
      if (res.ok) {
        const data = await res.json()
        setCheckinId(data.checkin.id)
      }
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

  const activeTask = tasks.find((t) => t.status === 'in_progress')

  const handleSessionComplete = useCallback((session: PomodoroSession) => {
    if (activeTask) {
      handleOpenComplete(activeTask, session.focus_minutes)
    }
  }, [activeTask, handleOpenComplete])

  return (
    <ImmersiveSceneLayout
      sceneName="自习室"
      sceneId="study-room"
      onEnter={handleEnter}
      onLeave={handleLeave}
      footerExtra={
        <AmbientPlayer preset="study-room" className="mr-auto" />
      }
    >
      <div className="library-content">
        {/* 当前任务 */}
        {selectedTask && selectedTask.status !== 'completed' && (
          <div className="library-current-task">
            <div className="library-current-task__label">
              <Pencil className="size-3" />
              正在练习
            </div>
            <div className="library-current-task__name">
              {selectedTask.subject} — {selectedTask.topic}
            </div>
          </div>
        )}

        {/* 数据概览 */}
        <div className="library-stats">
          <div className="library-stat">
            <div className="library-stat__value">{stats.completed}/{stats.total}</div>
            <div className="library-stat__label">任务完成</div>
          </div>
          <div className="library-stat">
            <div className="library-stat__value">{stats.avgAccuracy ?? '--'}%</div>
            <div className="library-stat__label">平均准确率</div>
          </div>
          <div className="library-stat">
            <div className="library-stat__value">{stats.totalActual}m</div>
            <div className="library-stat__label">已用时</div>
          </div>
        </div>

        {/* 任务列表 */}
        {tasks.length > 0 && (
          <div className="library-task-list">
            <div className="library-task-list__header">
              <span className="library-task-list__title">
                练习任务 ({stats.completed}/{stats.total})
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
                  <div className="library-task-item__icon">
                    {isCompleted && <CheckCircle2 className="size-3" style={{ color: 'var(--success)' }} />}
                    {task.status === 'in_progress' && <Clock className="size-3" style={{ color: 'var(--accent-color)' }} />}
                  </div>

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
                        <span style={{ color: 'var(--points-color)' }}>+{task.points_earned}</span>
                      )}
                    </div>
                  </div>

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
              scene="study-room"
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
              <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
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
