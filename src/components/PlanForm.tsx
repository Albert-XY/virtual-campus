'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  StudyBlock,
  RestBlock,
  PlanTaskType,
  PlanTask,
} from '@/types'

// 任务类型配置
const TASK_TYPE_CONFIG: Record<
  PlanTaskType,
  { label: string; color: string }
> = {
  knowledge: { label: '知识学习', color: 'bg-blue-100 text-blue-700' },
  practice: { label: '练习巩固', color: 'bg-green-100 text-green-700' },
  collaboration: { label: '协作讨论', color: 'bg-purple-100 text-purple-700' },
  self: { label: '自主学习', color: 'bg-orange-100 text-orange-700' },
}

const REST_TYPE_LABELS: Record<RestBlock['type'], string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
}

interface PlanFormProps {
  onSuccess: () => void
}

export default function PlanForm({ onSuccess }: PlanFormProps) {
  // 学习区间
  const [studyBlocks, setStudyBlocks] = useState<StudyBlock[]>([
    { start: '08:00', end: '12:00' },
    { start: '14:00', end: '18:00' },
  ])

  // 休息区间
  const [restBlocks, setRestBlocks] = useState<RestBlock[]>([
    { start: '07:00', end: '08:00', type: 'breakfast' },
    { start: '12:00', end: '13:00', type: 'lunch' },
    { start: '18:00', end: '19:00', type: 'dinner' },
  ])

  // 任务列表
  const [tasks, setTasks] = useState<PlanTask[]>([
    { id: 0, type: 'knowledge', subject: '', topic: '', estimated_min: 30 },
    { id: 1, type: 'practice', subject: '', topic: '', estimated_min: 30 },
    { id: 2, type: 'collaboration', subject: '', topic: '', estimated_min: 30 },
    { id: 3, type: 'self', subject: '', topic: '', estimated_min: 30 },
  ])

  const [submitting, setSubmitting] = useState(false)

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

  // 更新休息区间
  const updateRestBlock = (
    index: number,
    field: 'start' | 'end',
    value: string
  ) => {
    const updated = [...restBlocks]
    updated[index] = { ...updated[index], [field]: value }
    setRestBlocks(updated)
  }

  // 更新任务
  const updateTask = (
    index: number,
    field: keyof PlanTask,
    value: string | number
  ) => {
    const updated = [...tasks]
    updated[index] = { ...updated[index], [field]: value }
    setTasks(updated)
  }

  // 时间转分钟数
  const timeToMinutes = (time: string): number => {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
  }

  // 检查时间是否重叠
  const hasTimeOverlap = (blocks: StudyBlock[]): boolean => {
    const sorted = [...blocks].sort(
      (a, b) => timeToMinutes(a.start) - timeToMinutes(b.start)
    )
    for (let i = 0; i < sorted.length - 1; i++) {
      if (timeToMinutes(sorted[i].end) > timeToMinutes(sorted[i + 1].start)) {
        return true
      }
    }
    return false
  }

  // 提交
  const handleSubmit = async () => {
    // 验证学习区间
    const validStudyBlocks = studyBlocks.filter(
      (b) => b.start && b.end && b.start < b.end
    )
    if (validStudyBlocks.length === 0) {
      toast.error('请至少填写1个有效的学习区间')
      return
    }

    // 检查时间重叠
    if (hasTimeOverlap(validStudyBlocks)) {
      toast.error('学习区间时间不能重叠')
      return
    }

    // 验证任务
    const validTasks = tasks.filter(
      (t) => t.subject.trim() && t.topic.trim() && t.estimated_min > 0
    )
    if (validTasks.length === 0) {
      toast.error('请至少填写1个完整的任务')
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          study_blocks: validStudyBlocks,
          rest_blocks: restBlocks,
          tasks: validTasks.map((t, i) => ({
            type: t.type,
            subject: t.subject.trim(),
            topic: t.topic.trim(),
            estimated_min: t.estimated_min,
          })),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || '提交失败')
        return
      }

      toast.success('规划创建成功！')
      onSuccess()
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* 学习区间 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1E40AF]">
            <span className="text-lg">&#128218;</span>
            学习区间
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {studyBlocks.map((block, index) => (
            <div
              key={index}
              className="flex items-center gap-2"
            >
              <div className="flex flex-1 items-center gap-1.5">
                <Input
                  type="time"
                  value={block.start}
                  onChange={(e) =>
                    updateStudyBlock(index, 'start', e.target.value)
                  }
                  className="flex-1"
                />
                <span className="text-muted-foreground text-sm">至</span>
                <Input
                  type="time"
                  value={block.end}
                  onChange={(e) =>
                    updateStudyBlock(index, 'end', e.target.value)
                  }
                  className="flex-1"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeStudyBlock(index)}
                disabled={studyBlocks.length <= 1}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          {studyBlocks.length < 4 && (
            <Button
              variant="outline"
              size="sm"
              onClick={addStudyBlock}
              className="w-full"
            >
              <Plus className="size-4" />
              添加学习区间
            </Button>
          )}
        </CardContent>
      </Card>

      {/* 休息区间 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#F97316]">
            <span className="text-lg">&#9749;</span>
            休息区间
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {restBlocks.map((block, index) => (
            <div key={index} className="flex items-center gap-2">
              <Badge variant="secondary" className="shrink-0 w-14 justify-center">
                {REST_TYPE_LABELS[block.type]}
              </Badge>
              <div className="flex flex-1 items-center gap-1.5">
                <Input
                  type="time"
                  value={block.start}
                  onChange={(e) =>
                    updateRestBlock(index, 'start', e.target.value)
                  }
                  className="flex-1"
                />
                <span className="text-muted-foreground text-sm">至</span>
                <Input
                  type="time"
                  value={block.end}
                  onChange={(e) =>
                    updateRestBlock(index, 'end', e.target.value)
                  }
                  className="flex-1"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 今日任务 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1E40AF]">
            <span className="text-lg">&#128203;</span>
            今日任务
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tasks.map((task, index) => (
            <div key={task.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge
                  className={TASK_TYPE_CONFIG[task.type].color}
                >
                  {TASK_TYPE_CONFIG[task.type].label}
                </Badge>
              </div>
              <Select
                value={task.type}
                onValueChange={(val) =>
                  updateTask(index, 'type', val as PlanTaskType)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.entries(TASK_TYPE_CONFIG) as [
                      PlanTaskType,
                      { label: string; color: string },
                    ][]
                  ).map(([type, config]) => (
                    <SelectItem key={type} value={type}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">科目</Label>
                  <Input
                    placeholder="如：数学"
                    value={task.subject}
                    onChange={(e) =>
                      updateTask(index, 'subject', e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">主题</Label>
                  <Input
                    placeholder="如：二次函数"
                    value={task.topic}
                    onChange={(e) =>
                      updateTask(index, 'topic', e.target.value)
                    }
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  预计时长（分钟）
                </Label>
                <Input
                  type="number"
                  min={5}
                  max={180}
                  value={task.estimated_min}
                  onChange={(e) =>
                    updateTask(
                      index,
                      'estimated_min',
                      parseInt(e.target.value) || 0
                    )
                  }
                />
              </div>
              {index < tasks.length - 1 && (
                <div className="border-b border-dashed" />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 提交按钮 */}
      <Button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full h-11 text-base font-semibold bg-[#1E40AF] hover:bg-[#1E3A8A] text-white"
      >
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            提交中...
          </>
        ) : (
          '提交今日规划'
        )}
      </Button>
    </div>
  )
}
