'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface GoalFormProps {
  period: 'monthly' | 'weekly'
  parentGoal?: { id: string; title: string; total_units: number } | null
  editGoal?: {
    id: string
    title: string
    description: string
    total_units: number
    target_date: string | null
  } | null
  onSuccess: () => void
  onCancel: () => void
}

export default function GoalForm({
  period,
  parentGoal,
  editGoal,
  onSuccess,
  onCancel,
}: GoalFormProps) {
  const isMonthly = period === 'monthly'
  const periodLabel = isMonthly ? '月' : '周'

  const [title, setTitle] = useState(editGoal?.title ?? '')
  const [description, setDescription] = useState(editGoal?.description ?? '')
  const [totalUnits, setTotalUnits] = useState(
    editGoal?.total_units?.toString() ??
      (parentGoal?.total_units?.toString() ?? '')
  )
  const [targetDate, setTargetDate] = useState(
    editGoal?.target_date
      ? new Date(editGoal.target_date).toISOString().slice(0, 10)
      : ''
  )
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast.error('请输入目标标题')
      return
    }

    const units = parseInt(totalUnits, 10)
    if (!units || units < 1) {
      toast.error('请输入有效的单位数量')
      return
    }

    if (isMonthly && !targetDate) {
      toast.error('月目标需要设置截止日期')
      return
    }

    setSubmitting(true)

    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
        total_units: units,
        period,
        target_date: targetDate || null,
      }

      if (parentGoal) {
        body.parent_goal_id = parentGoal.id
      }

      let res: Response

      if (editGoal) {
        res = await fetch(`/api/goals/${editGoal.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }

      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error || '操作失败')
        return
      }

      toast.success(editGoal ? '目标已更新' : '目标创建成功')
      onSuccess()
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Parent goal info */}
          {parentGoal && (
            <div
              className="px-3 py-2 text-sm"
              style={{
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--accent-light)',
                color: 'var(--accent-color)',
              }}
            >
              上级目标：{parentGoal.title}（{parentGoal.total_units}单位）
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label
              className="text-sm font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              目标标题
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`这个${periodLabel}的目标是什么？`}
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label
              className="text-sm font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              具体描述（可选）
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="具体描述（可选）"
              rows={3}
              className="w-full min-w-0 rounded-lg border px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
              style={{
                borderColor: 'var(--input)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Total units */}
          <div className="space-y-1.5">
            <label
              className="text-sm font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              总量
            </label>
            <Input
              type="number"
              min={1}
              value={totalUnits}
              onChange={(e) => setTotalUnits(e.target.value)}
              placeholder="总共多少单位？（章/节/页/套题...）"
            />
          </div>

          {/* Target date */}
          <div className="space-y-1.5">
            <label
              className="text-sm font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              截止日期{isMonthly ? '' : '（可选）'}
            </label>
            <Input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              required={isMonthly}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1"
              style={{ backgroundColor: 'var(--accent-color)' }}
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {editGoal ? '保存修改' : '创建目标'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={submitting}
            >
              取消
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
