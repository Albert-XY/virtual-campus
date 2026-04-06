'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Plus,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { StudyBlock, RestBlock, PlanTask, DailyPlan } from '@/types'

interface PlanFormProps {
  onSuccess: () => void
  editPlan?: DailyPlan | null
}

const DURATION_OPTIONS = [15, 30, 45, 60, 90]

const DEFAULT_STUDY_BLOCKS: StudyBlock[] = [
  { start: '08:00', end: '12:00' },
  { start: '14:00', end: '18:00' },
]

const DEFAULT_REST_BLOCKS: RestBlock[] = [
  { start: '07:00', end: '08:00', type: 'breakfast' },
  { start: '12:00', end: '13:00', type: 'lunch' },
  { start: '18:00', end: '19:00', type: 'dinner' },
]

export default function PlanForm({ onSuccess, editPlan }: PlanFormProps) {
  // 是否为编辑模式
  const isEditing = !!editPlan

  // 任务列表：默认1个空任务
  const [tasks, setTasks] = useState<PlanTask[]>(() => {
    if (editPlan?.tasks?.length) {
      return editPlan.tasks.map((t, i) => ({
        id: i,
        type: t.type || 'self',
        subject: t.subject,
        topic: t.topic,
        estimated_min: t.estimated_min,
      }))
    }
    return [{ id: 0, type: 'self', subject: '', topic: '', estimated_min: 30 }]
  })

  // 学习区间
  const [studyBlocks, setStudyBlocks] = useState<StudyBlock[]>(() => {
    if (editPlan?.study_blocks?.length) return editPlan.study_blocks
    return [{ start: '08:00', end: '12:00' }]
  })

  // 休息区间
  const [restBlocks, setRestBlocks] = useState<RestBlock[]>(() => {
    if (editPlan?.rest_blocks?.length) return editPlan.rest_blocks
    return [{ start: '12:00', end: '13:00', type: 'lunch' }]
  })

  // 时间安排折叠状态（默认收起）
  const [timeExpanded, setTimeExpanded] = useState(false)

  // 提交状态
  const [submitting, setSubmitting] = useState(false)

  // 成功动画状态
  const [showSuccess, setShowSuccess] = useState(false)

  // 任务验证错误
  const [taskErrors, setTaskErrors] = useState<Record<number, string>>({})

  // 昨天规划是否存在
  const [hasYesterdayPlan, setHasYesterdayPlan] = useState(false)
  const [yesterdayPlan, setYesterdayPlan] = useState<DailyPlan | null>(null)

  // 检查昨天是否有规划
  useEffect(() => {
    if (isEditing) return
    fetch('/api/plan?action=yesterday')
      .then((res) => res.json())
      .then((data) => {
        if (data.plan) {
          setHasYesterdayPlan(true)
          setYesterdayPlan(data.plan)
        }
      })
      .catch(() => {})
  }, [isEditing])

  // 添加任务
  const addTask = () => {
    if (tasks.length >= 8) {
      toast.error('最多添加8个任务')
      return
    }
    setTasks([
      ...tasks,
      {
        id: Date.now(),
        type: 'self',
        subject: '',
        topic: '',
        estimated_min: 30,
      },
    ])
  }

  // 删除任务
  const removeTask = (index: number) => {
    if (tasks.length <= 1) {
      toast.error('至少需要1个任务')
      return
    }
    setTasks(tasks.filter((_, i) => i !== index))
    // 清除该任务的错误
    const newErrors = { ...taskErrors }
    delete newErrors[index]
    setTaskErrors(newErrors)
  }

  // 更新任务字段
  const updateTask = (
    index: number,
    field: 'subject' | 'topic' | 'estimated_min',
    value: string | number
  ) => {
    const updated = [...tasks]
    updated[index] = { ...updated[index], [field]: value }
    setTasks(updated)
    // 清除该任务的错误
    if (taskErrors[index]) {
      const newErrors = { ...taskErrors }
      delete newErrors[index]
      setTaskErrors(newErrors)
    }
  }

  // 复制昨天的规划
  const copyYesterdayPlan = () => {
    if (!yesterdayPlan?.tasks?.length) return
    setTasks(
      yesterdayPlan.tasks.map((t, i) => ({
        id: i,
        type: t.type || 'self',
        subject: t.subject,
        topic: t.topic,
        estimated_min: t.estimated_min,
      }))
    )
    setStudyBlocks(
      yesterdayPlan.study_blocks?.length
        ? yesterdayPlan.study_blocks
        : DEFAULT_STUDY_BLOCKS
    )
    setRestBlocks(
      yesterdayPlan.rest_blocks?.length
        ? yesterdayPlan.rest_blocks
        : DEFAULT_REST_BLOCKS
    )
    toast.success('已复制昨天的规划')
  }

  // 使用默认时间表
  const useDefaultSchedule = () => {
    setStudyBlocks(DEFAULT_STUDY_BLOCKS)
    setRestBlocks(DEFAULT_REST_BLOCKS)
    toast.success('已应用默认时间表')
  }

  // 添加学习区间
  const addStudyBlock = () => {
    if (studyBlocks.length >= 4) {
      toast.error('最多添加4个学习区间')
      return
    }
    setStudyBlocks([...studyBlocks, { start: '09:00', end: '11:00' }])
  }

  // 删除学习区间
  const removeStudyBlock = (index: number) => {
    if (studyBlocks.length <= 1) {
      toast.error('至少需要1个学习区间')
      return
    }
    setStudyBlocks(studyBlocks.filter((_, i) => i !== index))
  }

  // 更新学习区间
  const updateStudyBlock = (
    index: number,
    field: 'start' | 'end',
    value: string
  ) => {
    const updated = [...studyBlocks]
    updated[index] = { ...updated[index], [field]: value }
    setStudyBlocks(updated)
  }

  // 添加休息区间
  const addRestBlock = () => {
    const types: RestBlock['type'][] = ['breakfast', 'lunch', 'dinner']
    const existingTypes = restBlocks.map((b) => b.type)
    const nextType = types.find((t) => !existingTypes.includes(t)) || 'breakfast'
    setRestBlocks([...restBlocks, { start: '19:00', end: '20:00', type: nextType }])
  }

  // 删除休息区间
  const removeRestBlock = (index: number) => {
    setRestBlocks(restBlocks.filter((_, i) => i !== index))
  }

  // 更新休息区间
  const updateRestBlock = (
    index: number,
    field: 'start' | 'end' | 'type',
    value: string
  ) => {
    const updated = [...restBlocks]
    updated[index] = { ...updated[index], [field]: value } as RestBlock
    setRestBlocks(updated)
  }

  // 时间转分钟数
  const timeToMinutes = (time: string): number => {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
  }

  // 计算摘要
  const getSummary = () => {
    const validTasks = tasks.filter(
      (t) => t.subject.trim() && t.topic.trim()
    )
    const totalMinutes = validTasks.reduce(
      (sum, t) => sum + t.estimated_min,
      0
    )
    const totalStudyMinutes = studyBlocks.reduce((sum, block) => {
      if (block.start && block.end && block.start < block.end) {
        return sum + timeToMinutes(block.end) - timeToMinutes(block.start)
      }
      return sum
    }, 0)
    return {
      taskCount: validTasks.length,
      totalMinutes,
      studyHours: Math.floor(totalStudyMinutes / 60),
    }
  }

  // 验证并提交
  const handleSubmit = async () => {
    // 验证任务
    const errors: Record<number, string> = {}
    let hasValidTask = false

    tasks.forEach((task, index) => {
      if (!task.subject.trim() && !task.topic.trim()) {
        // 完全空的任务不报错（用户可能还没填）
        return
      }
      if (!task.subject.trim()) {
        errors[index] = '请填写科目'
      } else if (!task.topic.trim()) {
        errors[index] = '请填写主题'
      } else {
        hasValidTask = true
      }
    })

    if (!hasValidTask) {
      errors[0] = '请至少填写1个完整的任务'
      setTaskErrors(errors)
      return
    }

    setTaskErrors(errors)

    if (Object.keys(errors).length > 0) {
      return
    }

    // 验证学习区间
    const validStudyBlocks = studyBlocks.filter(
      (b) => b.start && b.end && b.start < b.end
    )
    if (validStudyBlocks.length === 0) {
      toast.error('请至少填写1个有效的学习区间')
      return
    }

    // 准备数据
    const validTasks = tasks
      .filter((t) => t.subject.trim() && t.topic.trim())
      .map((t) => ({
        type: t.type || 'self',
        subject: t.subject.trim(),
        topic: t.topic.trim(),
        estimated_min: t.estimated_min,
      }))

    setSubmitting(true)

    try {
      const method = isEditing ? 'PUT' : 'POST'
      const res = await fetch('/api/plan', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          study_blocks: validStudyBlocks,
          rest_blocks: restBlocks,
          tasks: validTasks,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || '提交失败')
        return
      }

      // 显示成功动画
      setShowSuccess(true)
      setTimeout(() => {
        onSuccess()
      }, 1500)
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  // 成功动画
  if (showSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4 animate-in fade-in duration-500">
        <div
          className="size-20 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--success-light)' }}
        >
          <Sparkles className="size-10" style={{ color: 'var(--success)' }} />
        </div>
        <h3 className="text-xl font-bold" style={{ color: 'var(--accent-color)' }}>
          规划完成！
        </h3>
        <p className="text-center" style={{ color: 'var(--text-secondary)' }}>
          去校园开始学习吧
        </p>
        <ArrowRight className="size-6 animate-bounce" style={{ color: 'var(--accent-color)' }} />
      </div>
    )
  }

  const summary = getSummary()

  return (
    <div className="space-y-4">
      {/* 复制昨天的规划 */}
      {hasYesterdayPlan && !isEditing && (
        <button
          onClick={copyYesterdayPlan}
          className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-3 text-sm font-medium transition-colors active:scale-[0.98]"
          style={{
            borderColor: 'color-mix(in srgb, var(--accent-color) 30%, transparent)',
            backgroundColor: 'color-mix(in srgb, var(--accent-color) 5%, transparent)',
            color: 'var(--accent-color)',
          }}
        >
          <Copy className="size-4" />
          复制昨天的规划
        </button>
      )}

      {/* 第一步：今天要做什么 */}
      <div className="space-y-2">
        <h3 className="text-base font-semibold" style={{ color: 'var(--accent-color)' }}>
          今天要做什么？
        </h3>
        <p className="text-xs text-muted-foreground">
          添加你要学习的科目和内容
        </p>
      </div>

      <div className="space-y-3">
        {tasks.map((task, index) => (
          <Card
            key={task.id}
            className={
              taskErrors[index]
                ? 'ring-2'
                : ''
            }
            style={taskErrors[index] ? { '--tw-ring-color': 'var(--danger)', backgroundColor: 'color-mix(in srgb, var(--danger) 5%, transparent)' } as React.CSSProperties : undefined}
          >
            <CardContent className="space-y-2.5">
              {/* 任务序号 + 删除按钮 */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  任务 {index + 1}
                </span>
                {tasks.length > 1 && (
                  <button
                    onClick={() => removeTask(index)}
                    className="text-muted-foreground hover:text-[var(--danger)] transition-colors p-1"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>

              {/* 科目 + 主题 */}
              <div className="flex gap-2">
                <Input
                  placeholder="科目（如：数学）"
                  value={task.subject}
                  onChange={(e) =>
                    updateTask(index, 'subject', e.target.value)
                  }
                  className="flex-1 h-9 text-sm"
                />
                <Input
                  placeholder="主题（如：二次函数）"
                  value={task.topic}
                  onChange={(e) =>
                    updateTask(index, 'topic', e.target.value)
                  }
                  className="flex-1 h-9 text-sm"
                />
              </div>

              {/* 时长选择 */}
              <Select
                value={String(task.estimated_min)}
                onValueChange={(val) =>
                  updateTask(index, 'estimated_min', parseInt(val ?? '30'))
                }
              >
                <SelectTrigger className="w-full h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((min) => (
                    <SelectItem key={min} value={String(min)}>
                      {min} 分钟
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 错误提示 */}
              {taskErrors[index] && (
                <p className="text-xs" style={{ color: 'var(--danger)' }}>{taskErrors[index]}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 添加任务按钮 */}
      {tasks.length < 8 && (
        <button
          onClick={addTask}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-muted-foreground/30 px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-[0.98]"
        >
          <Plus className="size-4" />
          添加任务
        </button>
      )}

      {/* 第二步：安排时间（折叠式） */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <button
          onClick={() => setTimeExpanded(!timeExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors"
          style={{ color: 'var(--accent-color)' }}
        >
          <span className="flex items-center gap-2">
            <Clock className="size-4" />
            安排学习时间
          </span>
          {timeExpanded ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </button>

        {timeExpanded && (
          <div className="border-t px-4 py-3 space-y-4 animate-in slide-in-from-top-2 duration-200">
            {/* 使用默认时间表 */}
            <button
              onClick={useDefaultSchedule}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
              style={{ backgroundColor: 'color-mix(in srgb, var(--accent-color) 10%, transparent)', color: 'var(--accent-color)' }}
            >
              <Sparkles className="size-3.5" />
              使用默认时间表
            </button>

            {/* 学习区间 */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                学习区间
              </p>
              {studyBlocks.map((block, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={block.start}
                    onChange={(e) =>
                      updateStudyBlock(index, 'start', e.target.value)
                    }
                    className="flex-1 h-8 text-sm"
                  />
                  <span className="text-xs text-muted-foreground">至</span>
                  <Input
                    type="time"
                    value={block.end}
                    onChange={(e) =>
                      updateStudyBlock(index, 'end', e.target.value)
                    }
                    className="flex-1 h-8 text-sm"
                  />
                  {studyBlocks.length > 1 && (
                    <button
                      onClick={() => removeStudyBlock(index)}
                      className="text-muted-foreground hover:text-[var(--danger)] transition-colors p-1"
                    >
                      <Trash2 className="size-3.5" />
                      </button>
                  )}
                </div>
              ))}
              {studyBlocks.length < 4 && (
                <button
                  onClick={addStudyBlock}
                  className="text-xs hover:underline"
                  style={{ color: 'var(--accent-color)' }}
                >
                  + 添加学习区间
                </button>
              )}
            </div>

            {/* 休息区间 */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                休息区间
              </p>
              {restBlocks.map((block, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Select
                    value={block.type}
                    onValueChange={(val) =>
                      updateRestBlock(index, 'type', val ?? 'breakfast')
                    }
                  >
                    <SelectTrigger className="w-20 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="breakfast">早餐</SelectItem>
                      <SelectItem value="lunch">午餐</SelectItem>
                      <SelectItem value="dinner">晚餐</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="time"
                    value={block.start}
                    onChange={(e) =>
                      updateRestBlock(index, 'start', e.target.value)
                    }
                    className="flex-1 h-8 text-sm"
                  />
                  <span className="text-xs text-muted-foreground">至</span>
                  <Input
                    type="time"
                    value={block.end}
                    onChange={(e) =>
                      updateRestBlock(index, 'end', e.target.value)
                    }
                    className="flex-1 h-8 text-sm"
                  />
                  <button
                    onClick={() => removeRestBlock(index)}
                    className="text-muted-foreground hover:text-[var(--danger)] transition-colors p-1"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
              {restBlocks.length < 3 && (
                <button
                  onClick={addRestBlock}
                  className="text-xs hover:underline"
                  style={{ color: 'var(--accent-color)' }}
                >
                  + 添加休息区间
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 第三步：摘要预览 + 提交 */}
      {summary.taskCount > 0 && (
        <div className="rounded-xl px-4 py-3 space-y-1" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-color) 5%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-color) 15%, transparent)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--accent-color)' }}>
            {summary.taskCount} 个任务
            {summary.totalMinutes > 0 && `，共 ${summary.totalMinutes} 分钟`}
            {summary.studyHours > 0 && `，学习 ${summary.studyHours} 小时`}
          </p>
        </div>
      )}

      {/* 提交按钮 */}
      <Button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full h-12 text-base font-bold text-white rounded-xl shadow-lg transition-all active:scale-[0.98]"
        style={{
          background: 'linear-gradient(135deg, var(--hero-gradient-from) 0%, var(--hero-gradient-to) 100%)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {submitting ? (
          <>
            <Loader2 className="size-5 animate-spin" />
            提交中...
          </>
        ) : (
          <>
            开始今天的学习！
            <ArrowRight className="size-5" />
          </>
        )}
      </Button>
    </div>
  )
}
