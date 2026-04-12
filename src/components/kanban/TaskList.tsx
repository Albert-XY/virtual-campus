'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  Play,
  Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

// ============================================================
// Types
// ============================================================
interface Task {
  id: string
  task_index: number
  task_type: string
  subject: string
  topic: string
  estimated_minutes: number
  status: string // 'pending' | 'in_progress' | 'completed'
  actual_minutes: number | null
  accuracy_rate: number | null
  points_earned: number | null
}

interface TaskListProps {
  tasks: Task[]
  onRefresh: () => void
  onOpenScene: (scene: 'library' | 'study-room', taskId?: string) => void
}

// ============================================================
// Config
// ============================================================
const TASK_TYPE_CONFIG: Record<string, { label: string; colorVar: string }> = {
  knowledge: { label: '知识学习', colorVar: '--scene-library' },
  practice: { label: '练习巩固', colorVar: '--scene-study' },
  self: { label: '自主学习', colorVar: '--accent-color' },
}

// ============================================================
// Component
// ============================================================
export default function TaskList({ tasks, onRefresh, onOpenScene }: TaskListProps) {
  const [startingId, setStartingId] = useState<string | null>(null)
  const [completingId, setCompletingId] = useState<string | null>(null)
  const [actualMinutes, setActualMinutes] = useState('')
  const [accuracyRate, setAccuracyRate] = useState(80)

  const completedCount = tasks.filter((t) => t.status === 'completed').length
  const totalCount = tasks.length

  // 开始任务
  const handleStart = async (taskId: string) => {
    setStartingId(taskId)
    try {
      const res = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', task_id: taskId }),
      })
      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error || '开始任务失败')
        return
      }

      toast.success('任务已开始')
      onRefresh()
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setStartingId(null)
    }
  }

  // 完成任务
  const handleComplete = async (taskId: string) => {
    const minutes = parseInt(actualMinutes, 10)
    if (isNaN(minutes) || minutes <= 0) {
      toast.error('请输入有效的学习时长')
      return
    }

    setCompletingId(taskId)
    try {
      const res = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          task_id: taskId,
          actual_minutes: minutes,
          accuracy_rate: accuracyRate,
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error || '完成任务失败')
        return
      }

      toast.success('任务已完成！')
      setActualMinutes('')
      setAccuracyRate(80)
      setCompletingId(null)
      onRefresh()
    } catch {
      toast.error('网络错误，请重试')
      setCompletingId(null)
    }
  }

  // 打开完成表单
  const openCompleteForm = (taskId: string) => {
    setCompletingId(taskId)
    setActualMinutes('')
    setAccuracyRate(80)
  }

  // 取消完成表单
  const cancelComplete = () => {
    setCompletingId(null)
    setActualMinutes('')
    setAccuracyRate(80)
  }

  return (
    <div className="space-y-3">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          今日任务 ({completedCount}/{totalCount})
        </h3>
        {totalCount > 0 && (
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {completedCount === totalCount ? '全部完成' : `剩余 ${totalCount - completedCount} 项`}
          </span>
        )}
      </div>

      {/* 任务列表 */}
      <div className="space-y-2">
        {tasks.map((task) => {
          const typeConfig = TASK_TYPE_CONFIG[task.task_type]
          const isCompleting = completingId === task.id
          const isStarting = startingId === task.id
          const isCompleted = task.status === 'completed'
          const isInProgress = task.status === 'in_progress'

          return (
            <div
              key={task.id}
              className="flex items-start gap-2.5 p-3 transition-all duration-200"
              style={{
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                borderColor: isCompleted
                  ? 'var(--success)'
                  : isInProgress
                    ? 'var(--accent-color)'
                    : 'var(--border-color)',
                backgroundColor: isCompleted
                  ? 'var(--success-light)'
                  : 'var(--bg-card)',
                opacity: isCompleted ? 0.7 : 1,
              }}
            >
              {/* 状态图标 */}
              <div className="mt-0.5 shrink-0">
                {isCompleted ? (
                  <CheckCircle2 className="size-4" style={{ color: 'var(--success)' }} />
                ) : isInProgress ? (
                  <Clock className="size-4" style={{ color: 'var(--accent-color)' }} />
                ) : (
                  <Circle className="size-4" style={{ color: 'var(--border-color)' }} />
                )}
              </div>

              {/* 任务信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge
                    variant="outline"
                    className="border-0 text-xs"
                    style={{
                      backgroundColor: typeConfig
                        ? `color-mix(in srgb, var(${typeConfig.colorVar}) 15%, transparent)`
                        : 'var(--muted)',
                      color: typeConfig
                        ? `var(${typeConfig.colorVar})`
                        : 'var(--muted-foreground)',
                    }}
                  >
                    {typeConfig?.label ?? task.task_type}
                  </Badge>
                  <span className="text-sm font-medium truncate">
                    {task.subject}
                  </span>
                </div>
                <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {task.topic}
                </p>

                {/* 已完成：显示结果 */}
                {isCompleted && (
                  <div className="flex items-center gap-3 mt-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {task.actual_minutes != null && (
                      <span>{task.actual_minutes}min</span>
                    )}
                    {task.accuracy_rate != null && (
                      <span>正确率 {task.accuracy_rate}%</span>
                    )}
                    {task.points_earned != null && (
                      <span className="flex items-center gap-0.5" style={{ color: 'var(--points-color)' }}>
                        <Star className="size-3" />
                        +{task.points_earned}
                      </span>
                    )}
                  </div>
                )}

                {/* 完成表单 */}
                {isInProgress && isCompleting && (
                  <div className="mt-2.5 space-y-2.5 p-2.5" style={{
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-secondary)',
                  }}>
                    <div className="flex items-center gap-2">
                      <label className="text-xs shrink-0" style={{ color: 'var(--text-secondary)' }}>
                        实际时长(min)
                      </label>
                      <Input
                        type="number"
                        min={1}
                        value={actualMinutes}
                        onChange={(e) => setActualMinutes(e.target.value)}
                        placeholder="分钟"
                        className="h-7 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          正确率
                        </label>
                        <span className="text-xs font-medium" style={{ color: 'var(--accent-color)' }}>
                          {accuracyRate}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={accuracyRate}
                        onChange={(e) => setAccuracyRate(Number(e.target.value))}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                        style={{
                          backgroundColor: 'var(--border-color)',
                          accentColor: 'var(--accent-color)',
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="xs"
                        onClick={() => handleComplete(task.id)}
                        disabled={isStarting}
                        className="text-white"
                        style={{ backgroundColor: 'var(--success)' }}
                      >
                        {isStarting ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="size-3" />
                        )}
                        确认完成
                      </Button>
                      <Button size="xs" variant="ghost" onClick={cancelComplete}>
                        取消
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* 操作按钮 */}
              <div className="shrink-0 mt-0.5">
                {task.status === 'pending' && (
                  <Button
                    size="xs"
                    onClick={() => handleStart(task.id)}
                    disabled={isStarting}
                    className="text-white"
                    style={{ backgroundColor: 'var(--accent-color)' }}
                  >
                    {isStarting ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Play className="size-3" />
                    )}
                    开始
                  </Button>
                )}
                {isInProgress && !isCompleting && (
                  <Button
                    size="xs"
                    onClick={() => openCompleteForm(task.id)}
                    className="text-white"
                    style={{ backgroundColor: 'var(--success)' }}
                  >
                    <CheckCircle2 className="size-3" />
                    完成
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 空状态 */}
      {tasks.length === 0 && (
        <div className="py-8 text-center" style={{ color: 'var(--text-secondary)' }}>
          <p className="text-sm">暂无任务</p>
        </div>
      )}
    </div>
  )
}
