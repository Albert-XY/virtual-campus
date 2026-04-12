'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Plus,
  Trash2,
  Loader2,
  Pencil,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// ============================================================
// Constants
// ============================================================
const SUBJECT_TAGS = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治']
const WEEK_DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

interface WeekPlan {
  id: string
  user_id: string
  week_start: string
  goals: string[]
  focus_subjects: string[]
  study_days: number[]
  notes: string
  created_at: string
}

// ============================================================
// Helper: get current week range (Monday - Sunday)
// ============================================================
function getCurrentWeekRange(): { start: string; end: string } {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? 6 : day - 1 // Monday = 0
  const monday = new Date(now)
  monday.setDate(now.getDate() - diff)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
  }
}

function getLastWeekMonday(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? 6 : day - 1
  const thisMonday = new Date(now)
  thisMonday.setDate(now.getDate() - diff)
  const lastMonday = new Date(thisMonday)
  lastMonday.setDate(thisMonday.getDate() - 7)
  return lastMonday.toISOString().split('T')[0]
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

// ============================================================
// Component
// ============================================================
export default function WeekPlanTab() {
  const [loading, setLoading] = useState(true)
  const [existingPlan, setExistingPlan] = useState<WeekPlan | null>(null)
  const [lastWeekPlan, setLastWeekPlan] = useState<WeekPlan | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Form state
  const [goals, setGoals] = useState<string[]>([''])
  const [subjects, setSubjects] = useState<string[]>([])
  const [studyDays, setStudyDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [notes, setNotes] = useState('')
  const [customSubject, setCustomSubject] = useState('')

  const fetchPlans = useCallback(async () => {
    setLoading(true)
    try {
      // Get this week's plan
      const thisRes = await fetch('/api/weekly-plan')
      const thisData = thisRes.ok ? await thisRes.json() : null

      if (thisData?.plan) {
        setExistingPlan(thisData.plan)
      } else {
        setExistingPlan(null)
      }

      // Get last week's plan from history
      const lastMonday = getLastWeekMonday()
      const historyRes = await fetch('/api/weekly-plan?action=history&limit=10')
      const historyData = historyRes.ok ? await historyRes.json() : null

      if (historyData?.plans) {
        const last = historyData.plans.find(
          (p: WeekPlan) => p.week_start === lastMonday
        )
        setLastWeekPlan(last ?? null)
      } else {
        setLastWeekPlan(null)
      }
    } catch (error) {
      console.error('获取周规划失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  // Populate form when editing
  useEffect(() => {
    if (isEditing && existingPlan) {
      setGoals(existingPlan.goals?.length ? existingPlan.goals : [''])
      setSubjects(existingPlan.focus_subjects ?? [])
      setStudyDays(existingPlan.study_days ?? [1, 2, 3, 4, 5])
      setNotes(existingPlan.notes ?? '')
    }
  }, [isEditing, existingPlan])

  // Goal management
  const addGoal = () => {
    if (goals.length >= 5) {
      toast.error('最多添加5个目标')
      return
    }
    setGoals([...goals, ''])
  }

  const removeGoal = (index: number) => {
    if (goals.length <= 1) {
      toast.error('至少需要1个目标')
      return
    }
    setGoals(goals.filter((_, i) => i !== index))
  }

  const updateGoal = (index: number, value: string) => {
    const updated = [...goals]
    updated[index] = value
    setGoals(updated)
  }

  // Subject toggle
  const toggleSubject = (subject: string) => {
    if (subjects.includes(subject)) {
      setSubjects(subjects.filter((s) => s !== subject))
    } else {
      setSubjects([...subjects, subject])
    }
  }

  // Add custom subject
  const addCustomSubject = () => {
    const trimmed = customSubject.trim()
    if (!trimmed) return
    if (subjects.includes(trimmed)) {
      toast.error('该科目已存在')
      return
    }
    setSubjects([...subjects, trimmed])
    setCustomSubject('')
  }

  // Study day toggle
  const toggleStudyDay = (day: number) => {
    if (studyDays.includes(day)) {
      setStudyDays(studyDays.filter((d) => d !== day))
    } else {
      setStudyDays([...studyDays, day].sort())
    }
  }

  // Submit
  const handleSubmit = async () => {
    const validGoals = goals.filter((g) => g.trim())
    if (validGoals.length === 0) {
      toast.error('请至少填写1个目标')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/weekly-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goals: validGoals,
          focus_subjects: subjects,
          study_days: studyDays,
          notes: notes.trim(),
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || '提交失败')
        return
      }

      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
        setIsEditing(false)
        fetchPlans()
      }, 1500)
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  // Loading
  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin" style={{ color: 'var(--accent-color)' }} />
      </div>
    )
  }

  // Success animation
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
          周规划已保存！+5积分
        </h3>
      </div>
    )
  }

  const weekRange = getCurrentWeekRange()

  // ============================================================
  // Show existing plan summary
  // ============================================================
  if (existingPlan && !isEditing) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-0 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>本周规划</p>
                <p className="text-sm font-semibold">
                  {formatDateShort(weekRange.start)} - {formatDateShort(weekRange.end)}
                </p>
              </div>
              <Badge className="text-white border-0" style={{ backgroundColor: 'var(--success)' }}>
                已创建
              </Badge>
            </div>

            {/* Goals */}
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>本周目标</p>
              <ul className="space-y-1.5">
                {existingPlan.goals?.map((goal, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span style={{ color: 'var(--accent-color)' }}>{i + 1}.</span>
                    <span>{goal}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Subjects */}
            {existingPlan.focus_subjects?.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>重点科目</p>
                <div className="flex flex-wrap gap-1.5">
                  {existingPlan.focus_subjects.map((subject, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="text-xs"
                      style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent-color)' }}
                    >
                      {subject}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Study days */}
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>自选学习日</p>
              <div className="flex gap-2">
                {WEEK_DAYS.map((day, i) => {
                  const dayNum = i + 1
                  const isSelected = existingPlan.study_days?.includes(dayNum)
                  return (
                    <div
                      key={day}
                      className="flex items-center justify-center size-9 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: isSelected ? 'var(--accent-color)' : 'var(--bg-secondary)',
                        color: isSelected ? '#fff' : 'var(--text-muted)',
                      }}
                    >
                      {day.replace('周', '')}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Notes */}
            {existingPlan.notes && (
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>备注</p>
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{existingPlan.notes}</p>
              </div>
            )}

            {/* Created at */}
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              创建于 {new Date(existingPlan.created_at).toLocaleString('zh-CN')}
            </p>
          </CardContent>
        </Card>

        {/* Edit button */}
        <Button
          onClick={() => setIsEditing(true)}
          variant="outline"
          className="w-full h-10 text-sm font-medium rounded-xl"
        >
          <Pencil className="size-4" />
          修改周规划
        </Button>

        {/* Last week plan */}
        {lastWeekPlan && (
          <div className="mt-6">
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>上周规划</p>
            <Card>
              <CardContent className="pt-0 space-y-3">
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {formatDateShort(lastWeekPlan.week_start)}
                </p>
                <ul className="space-y-1">
                  {lastWeekPlan.goals?.map((goal, i) => (
                    <li key={i} className="text-xs flex items-start gap-1.5">
                      <span style={{ color: 'var(--text-muted)' }}>{i + 1}.</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{goal}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    )
  }

  // ============================================================
  // Create / Edit form
  // ============================================================
  return (
    <div className="space-y-5">
      {/* Week range info */}
      <div className="text-center">
        <p className="text-sm font-semibold" style={{ color: 'var(--accent-color)' }}>
          {formatDateShort(weekRange.start)} - {formatDateShort(weekRange.end)}
        </p>
      </div>

      {/* Goals */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--accent-color)' }}>本周目标</h3>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>设定本周要完成的学习目标</p>
      </div>

      <div className="space-y-2.5">
        {goals.map((goal, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              placeholder="如：完成数学第三章"
              value={goal}
              onChange={(e) => updateGoal(index, e.target.value)}
              className="flex-1 h-9 rounded-lg border px-3 text-sm outline-none transition-colors"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
            {goals.length > 1 && (
              <button
                onClick={() => removeGoal(index)}
                className="flex items-center justify-center size-9 rounded-lg transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {goals.length < 5 && (
        <button
          onClick={addGoal}
          className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed px-4 py-2 text-sm transition-colors"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
        >
          <Plus className="size-4" />
          添加目标
        </button>
      )}

      {/* Subject tags */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--accent-color)' }}>重点科目</h3>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>选择本周重点学习的科目</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SUBJECT_TAGS.map((subject) => {
          const isSelected = subjects.includes(subject)
          return (
            <button
              key={subject}
              onClick={() => toggleSubject(subject)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-[0.97]"
              style={{
                backgroundColor: isSelected ? 'var(--accent-color)' : 'var(--bg-secondary)',
                color: isSelected ? '#fff' : 'var(--text-secondary)',
                border: `1px solid ${isSelected ? 'var(--accent-color)' : 'var(--border-color)'}`,
              }}
            >
              {subject}
            </button>
          )
        })}
      </div>

      {/* Custom subject input */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="自定义科目"
          value={customSubject}
          onChange={(e) => setCustomSubject(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addCustomSubject()
            }
          }}
          className="flex-1 h-8 rounded-lg border px-3 text-xs outline-none"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
          }}
        />
        <button
          onClick={addCustomSubject}
          className="px-3 h-8 rounded-lg text-xs font-medium transition-colors"
          style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent-color)' }}
        >
          添加
        </button>
      </div>

      {/* Study days */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--accent-color)' }}>自选学习日</h3>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>选择本周要学习的日子</p>
      </div>

      <div className="flex gap-2">
        {WEEK_DAYS.map((day, i) => {
          const dayNum = i + 1
          const isSelected = studyDays.includes(dayNum)
          return (
            <button
              key={day}
              onClick={() => toggleStudyDay(dayNum)}
              className="flex items-center justify-center size-10 rounded-full text-xs font-medium transition-all active:scale-[0.95]"
              style={{
                backgroundColor: isSelected ? 'var(--accent-color)' : 'var(--bg-secondary)',
                color: isSelected ? '#fff' : 'var(--text-secondary)',
                border: `2px solid ${isSelected ? 'var(--accent-color)' : 'var(--border-color)'}`,
              }}
            >
              {day.replace('周', '')}
            </button>
          )
        })}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--accent-color)' }}>备注</h3>
        <textarea
          placeholder="其他想记录的内容（可选）"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none resize-none transition-colors"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {/* Submit */}
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
            提交周规划 +5积分
            <ArrowRight className="size-5" />
          </>
        )}
      </Button>

      {/* Cancel edit */}
      {isEditing && (
        <button
          onClick={() => setIsEditing(false)}
          className="w-full text-center text-sm py-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          取消修改
        </button>
      )}

      {/* Last week plan */}
      {lastWeekPlan && (
        <div className="mt-6">
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>上周规划</p>
          <Card>
            <CardContent className="pt-0 space-y-3">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {formatDateShort(lastWeekPlan.week_start)}
              </p>
              <ul className="space-y-1">
                {lastWeekPlan.goals?.map((goal, i) => (
                  <li key={i} className="text-xs flex items-start gap-1.5">
                    <span style={{ color: 'var(--text-muted)' }}>{i + 1}.</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{goal}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
