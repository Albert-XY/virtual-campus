'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Loader2, Star, CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// ============================================================
// Types
// ============================================================
interface StructuredReviewProps {
  period: 'daily' | 'weekly' | 'monthly'
  periodLabel: string
  dateStr?: string
}

interface ReviewRecord {
  id: string
  user_id: string
  period: string
  period_start: string
  period_end: string
  content: string
  tomorrow_plan: string
  mood: number
  tasks_completed: number
  tasks_total: number
  study_minutes: number
  planned_minutes: number
  deviation_rate: number
  points_earned: number
  created_at: string
  updated_at: string
}

interface StructuredContent {
  structured: Record<string, string>
  free_text: string
}

// ============================================================
// Guided questions per period (psychology-based)
// ============================================================
const PERIOD_QUESTIONS: Record<string, { key: string; label: string; placeholder: string; required?: boolean }[]> = {
  daily: [
    { key: 'proud_moment', label: '今天最值得肯定的一件事', placeholder: '例如：数学练习全部完成，或者坚持了5个番茄钟...', required: true },
    { key: 'plan_status', label: '今天的学习计划完成得怎么样？', placeholder: '全部完成 / 大部分完成 / 只完成了一半 / 几乎没完成', required: true },
    { key: 'biggest_difficulty', label: '今天遇到的最大困难或卡壳点', placeholder: '例如：二次函数的图像变换怎么都搞不懂...', required: true },
    { key: 'redo_better', label: '如果重新来过，哪件事可以做得更好？', placeholder: '例如：数学应该多留10分钟，英语阅读应该先看题目...', required: false },
    { key: 'tomorrow_priority', label: '明天最重要的一件事', placeholder: '只写一件最重要的事', required: true },
  ],
  weekly: [
    { key: 'week_proud', label: '这周最让我自豪的一件事', placeholder: '例如：坚持了5天复盘，或者数学进度提前完成了...' },
    { key: 'goal_status', label: '这周的学习目标完成得怎么样？', placeholder: '对照周目标，评估完成情况...' },
    { key: 'recurring_problem', label: '这周反复出现的一个问题', placeholder: '例如：每天晚上学习效率都很低，或者数学总是超时...' },
    { key: 'best_method', label: '这周学到的最有用的一个方法', placeholder: '例如：先看例题再做练习，效率提高了很多...' },
    { key: 'kiss_review', label: '应该继续做 / 停止做 / 开始做什么？', placeholder: '继续：每天背单词 | 停止：睡前刷手机 | 开始：错题归因分析...' },
    { key: 'next_week_focus', label: '下周的1-2个重点目标', placeholder: '不超过2个，聚焦最重要的事...' },
  ],
  monthly: [
    { key: 'overall_feeling', label: '这个月整体感受如何？', placeholder: '例如：整体节奏不错，但中间有一周比较懈怠...' },
    { key: 'habits_formed', label: '哪些习惯养成了？', placeholder: '例如：每天早起背单词的习惯坚持下来了...' },
    { key: 'unmet_goals', label: '哪些目标没达成？为什么？', placeholder: '例如：月考目标差了10分，主要是计算粗心...' },
    { key: 'next_month_focus', label: '下个月的重点目标', placeholder: '例如：数学成绩提高到90分以上...' },
  ],
}

// ============================================================
// Mood config
// ============================================================
const MOOD_OPTIONS = [
  { value: 1, emoji: '\u{1F622}', label: '很差' },
  { value: 2, emoji: '\u{1F610}', label: '不太好' },
  { value: 3, emoji: '\u{1F642}', label: '一般' },
  { value: 4, emoji: '\u{1F60A}', label: '不错' },
  { value: 5, emoji: '\u{1F929}', label: '很棒' },
]

// ============================================================
// Helper: parse content field
// ============================================================
function parseContent(content: string): StructuredContent {
  if (!content) return { structured: {}, free_text: '' }
  try {
    const parsed = JSON.parse(content)
    if (parsed && typeof parsed === 'object' && parsed.structured) {
      return parsed as StructuredContent
    }
    // Old format: plain text
    return { structured: {}, free_text: content }
  } catch {
    // Not JSON, treat as plain text
    return { structured: {}, free_text: content }
  }
}

// ============================================================
// Helper: format date range label
// ============================================================
function getDateLabel(period: string, dateStr?: string): string {
  const today = dateStr ? new Date(dateStr + 'T00:00:00') : new Date()

  if (period === 'daily') {
    return today.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    })
  }

  if (period === 'weekly') {
    const day = today.getDay()
    const diff = day === 0 ? 6 : day - 1
    const monday = new Date(today)
    monday.setDate(today.getDate() - diff)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const fmt = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日`
    return `${fmt(monday)} - ${fmt(sunday)}`
  }

  // monthly
  return `${today.getFullYear()}年${today.getMonth() + 1}月`
}

// ============================================================
// Main Component
// ============================================================
export default function StructuredReview({ period, periodLabel, dateStr }: StructuredReviewProps) {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [existingReview, setExistingReview] = useState<ReviewRecord | null>(null)
  const [showSubmitted, setShowSubmitted] = useState(false)

  // Form state
  const [mood, setMood] = useState<number>(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [freeText, setFreeText] = useState('')
  const [tomorrowPlan, setTomorrowPlan] = useState('')

  // Review context data (for dynamic questions)
  const [reviewContext, setReviewContext] = useState<{
    todayTasks: {
      total: number
      completed: number
      overTasks: Array<{ subject: string; topic: string; overMinutes: number; estimatedMinutes: number; actualMinutes: number }>
      fastTasks: Array<{ subject: string; topic: string; savedMinutes: number; estimatedMinutes: number; actualMinutes: number }>
      unfinishedTasks: Array<{ subject: string; topic: string }>
    }
    yesterdayReview: { deviation_rate: number; completion_rate: number } | null
    streakDays: number
  } | null>(null)

  // Summary stats (pomodoros, tasks, deviation)
  const [summary, setSummary] = useState<{
    today: { total_pomodoros: number; total_focus_minutes: number; tasks_completed: number; tasks_total: number; deviation_rate: number }
    yesterday: { total_pomodoros: number; total_focus_minutes: number; tasks_completed: number; tasks_total: number; deviation_rate: number } | null
    streak: { consecutive_review_days: number }
  } | null>(null)

  // Dynamic questions based on context
  const getDynamicQuestions = () => {
    const baseQuestions = PERIOD_QUESTIONS[period] || []
    if (period !== 'daily' || !reviewContext) return baseQuestions

    const ctx = reviewContext.todayTasks
    const dynamic = [...baseQuestions]

    const goodIdx = dynamic.findIndex(q => q.key === 'good_tasks')
    if (goodIdx >= 0 && ctx.fastTasks.length > 0) {
      const fast = ctx.fastTasks[0]
      dynamic[goodIdx] = {
        ...dynamic[goodIdx],
        placeholder: `例如：${fast.subject}（${fast.topic}）比预估快了${fast.savedMinutes}分钟，因为...`,
      }
    }

    const unfinishedIdx = dynamic.findIndex(q => q.key === 'unfinished_tasks')
    if (unfinishedIdx >= 0) {
      if (ctx.unfinishedTasks.length > 0) {
        const names = ctx.unfinishedTasks.map(t => t.subject).join('、')
        dynamic[unfinishedIdx] = {
          ...dynamic[unfinishedIdx],
          placeholder: `提示：${names}还没有完成，原因是...`,
        }
      } else if (ctx.overTasks.length > 0) {
        const over = ctx.overTasks[0]
        dynamic[unfinishedIdx] = {
          ...dynamic[unfinishedIdx],
          placeholder: `例如：${over.subject}（${over.topic}）预估${over.estimatedMinutes}分钟但用了${over.actualMinutes}分钟...`,
        }
      }
    }

    const adjustIdx = dynamic.findIndex(q => q.key === 'adjustments')
    if (adjustIdx >= 0 && ctx.overTasks.length > 0) {
      const names = ctx.overTasks.map(t => t.subject).join('、')
      dynamic[adjustIdx] = {
        ...dynamic[adjustIdx],
        placeholder: `提示：${names}用时超标，明天可以...`,
      }
    }

    return dynamic
  }

  const questions = getDynamicQuestions()

  // Fetch existing review
  const fetchReview = useCallback(async () => {
    try {
      const params = new URLSearchParams({ period })
      if (dateStr) params.set('date', dateStr)
      const res = await fetch(`/api/reviews?${params}`)
      if (res.ok) {
        const json = await res.json()
        if (json.review) {
          setExistingReview(json.review)
          setShowSubmitted(true)
          // Pre-fill form
          setMood(json.review.mood || 0)
          setTomorrowPlan(json.review.tomorrow_plan || '')
          const parsed = parseContent(json.review.content)
          setAnswers(parsed.structured)
          setFreeText(parsed.free_text)
        }
      }
    } catch (error) {
      console.error('获取总结数据失败:', error)
    }

    // Fetch review context for dynamic questions (daily only)
    if (period === 'daily') {
      fetch('/api/insights?type=review_context')
        .then(res => res.ok ? res.json() : null)
        .then(data => { if (data) setReviewContext(data) })
        .catch(() => {})

      // Fetch summary stats
      const summaryParams = new URLSearchParams({ period: 'daily' })
      if (dateStr) summaryParams.set('date', dateStr)
      fetch(`/api/reviews/summary?${summaryParams}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => { if (data) setSummary(data) })
        .catch(() => {})
    }
  }, [period, dateStr])

  useEffect(() => {
    fetchReview().finally(() => setLoading(false))
  }, [fetchReview])

  // Handle answer change
  const handleAnswerChange = (key: string, value: string) => {
    setAnswers(prev => ({ ...prev, [key]: value }))
  }

  // Handle submit
  const handleSubmit = async () => {
    if (mood === 0) {
      toast.error('请选择心情')
      return
    }

    setSubmitting(true)
    try {
      // Build content JSON
      const contentObj: StructuredContent = {
        structured: {},
        free_text: freeText.trim(),
      }
      for (const q of questions) {
        contentObj.structured[q.key] = answers[q.key] || ''
      }

      const body: Record<string, unknown> = {
        period,
        content: JSON.stringify(contentObj),
        mood,
        tomorrow_plan: tomorrowPlan.trim(),
      }
      if (dateStr) body.period_start = dateStr

      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error || '提交失败')
        return
      }

      toast.success(`${periodLabel}提交成功！`)

      // 获取即时洞察
      try {
        const insightRes = await fetch('/api/insights?type=review_submit')
        if (insightRes.ok) {
          const { insights } = await insightRes.json()
          if (insights.length > 0) {
            setTimeout(() => {
              insights.forEach((text: string, i: number) => {
                setTimeout(() => toast.info(text), i * 800)
              })
            }, 600)
          }
        }
      } catch {
        // 洞察获取失败不影响主流程
      }

      // Refresh to show submitted state
      await fetchReview()
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle edit
  const handleEdit = () => {
    setShowSubmitted(false)
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--accent-color)' }} />
      </div>
    )
  }

  // Stats from existing review or defaults
  const tasksCompleted = existingReview?.tasks_completed ?? 0
  const tasksTotal = existingReview?.tasks_total ?? 0
  const studyMinutes = existingReview?.study_minutes ?? 0
  const plannedMinutes = existingReview?.planned_minutes ?? 0
  const deviationRate = existingReview?.deviation_rate ?? 0
  const pointsEarned = existingReview?.points_earned ?? 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <h2
            className="text-lg font-bold"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
          >
            {periodLabel}
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {getDateLabel(period, dateStr)}
          </p>
        </div>
      </div>

      {/* Data Overview (read-only) */}
      <Card>
        <CardContent className="pt-5 space-y-3">
          <h3 className="font-semibold" style={{ color: 'var(--accent-color)' }}>
            数据概览
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div
              className="p-3"
              style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}
            >
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                任务完成
              </p>
              <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {tasksCompleted}/{tasksTotal}
              </p>
            </div>
            <div
              className="p-3"
              style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}
            >
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                偏差率
              </p>
              <p
                className="text-lg font-bold"
                style={{
                  color: deviationRate < 10 ? 'var(--success)' : 'var(--text-primary)',
                }}
              >
                {deviationRate}%
              </p>
            </div>
            <div
              className="p-3"
              style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}
            >
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                规划时长
              </p>
              <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {plannedMinutes}{' '}
                <span className="text-xs font-normal" style={{ color: 'var(--text-secondary)' }}>
                  min
                </span>
              </p>
            </div>
            <div
              className="p-3"
              style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}
            >
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                实际时长
              </p>
              <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {studyMinutes}{' '}
                <span className="text-xs font-normal" style={{ color: 'var(--text-secondary)' }}>
                  min
                </span>
              </p>
            </div>
          </div>
          {pointsEarned > 0 && (
            <div
              className="flex items-center justify-between p-3"
              style={{ backgroundColor: 'var(--points-bg, var(--bg-secondary))', borderRadius: 'var(--radius-sm)' }}
            >
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                获得积分
              </span>
              <div className="flex items-center gap-1">
                <Star className="size-4" style={{ color: 'var(--accent-color)' }} />
                <span className="text-sm font-bold" style={{ color: 'var(--accent-color)' }}>
                  {pointsEarned} 分
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submitted view */}
      {showSubmitted && existingReview && (
        <>
          <Card>
            <CardContent className="pt-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold" style={{ color: 'var(--accent-color)' }}>
                  {periodLabel}内容
                </h3>
                <span
                  className="text-xs px-2 py-1"
                  style={{
                    backgroundColor: 'var(--success-light, rgba(34,197,94,0.1))',
                    color: 'var(--success)',
                    borderRadius: '9999px',
                  }}
                >
                  已提交
                </span>
              </div>

              {/* Mood display */}
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  心情：
                </span>
                <span className="text-2xl">{MOOD_OPTIONS[mood - 1]?.emoji}</span>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {MOOD_OPTIONS[mood - 1]?.label}
                </span>
              </div>

              {/* Structured answers */}
              {questions.map(q => {
                const answer = answers[q.key]
                if (!answer) return null
                return (
                  <div
                    key={q.key}
                    className="p-3"
                    style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}
                  >
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--accent-color)' }}>
                      {q.label}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      {answer}
                    </p>
                  </div>
                )
              })}

              {/* Free text */}
              {freeText && (
                <div
                  className="p-3"
                  style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}
                >
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                    补充想法
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {freeText}
                  </p>
                </div>
              )}

              {/* Tomorrow plan */}
              {tomorrowPlan && (
                <div
                  className="p-3"
                  style={{ backgroundColor: 'var(--accent-light, rgba(99,102,241,0.08))', borderRadius: 'var(--radius-sm)' }}
                >
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--accent-color)' }}>
                    {period === 'daily' ? '明日计划' : period === 'weekly' ? '下周计划' : '下月计划'}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {tomorrowPlan}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleEdit}
            style={{
              borderRadius: 'var(--radius-md)',
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
            }}
          >
            修改总结
          </Button>
        </>
      )}

      {/* Form view */}
      {!showSubmitted && (
        <>
          {/* Mood selector */}
          <Card>
            <CardContent className="pt-5 space-y-3">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                心情如何？
              </h3>
              <div className="flex items-center justify-between px-2">
                {MOOD_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    onClick={() => setMood(option.value)}
                    className="flex flex-col items-center gap-1 transition-all active:scale-90"
                    style={{
                      opacity: mood === 0 || mood === option.value ? 1 : 0.4,
                      transform: mood === option.value ? 'scale(1.15)' : 'scale(1)',
                    }}
                  >
                    <span className="text-3xl">{option.emoji}</span>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 今日数据摘要（日复盘） */}
          {period === 'daily' && summary && !showSubmitted && (
            <Card>
              <CardContent className="pt-5">
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  📊 今天的数据
                </h3>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold" style={{ color: 'var(--accent-color)' }}>
                      {summary.today.total_pomodoros}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>番茄钟</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold" style={{
                      color: summary.today.tasks_total > 0 && summary.today.tasks_completed === summary.today.tasks_total
                        ? 'var(--success)' : 'var(--text-primary)'
                    }}>
                      {summary.today.tasks_completed}/{summary.today.tasks_total}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>任务完成</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold" style={{
                      color: summary.today.deviation_rate > 30 ? 'var(--danger)' : summary.today.deviation_rate <= 15 ? 'var(--success)' : 'var(--text-primary)'
                    }}>
                      {summary.today.deviation_rate}%
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>偏差率</p>
                  </div>
                </div>
                {summary.yesterday && (
                  <div className="flex items-center justify-center gap-4 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    <span>昨天 {summary.yesterday.total_pomodoros} 个番茄钟</span>
                    <span>·</span>
                    <span>任务 {summary.yesterday.tasks_completed}/{summary.yesterday.tasks_total}</span>
                    <span>·</span>
                    <span>偏差率 {summary.yesterday.deviation_rate}%</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 数据洞察（仅日总结且有上下文数据时显示） */}
          {period === 'daily' && reviewContext && !showSubmitted && (
            <Card>
              <CardContent className="pt-5 space-y-2">
                <h3 className="font-semibold text-sm" style={{ color: 'var(--accent-color)' }}>
                  💡 今天的数据告诉你
                </h3>
                {reviewContext.todayTasks.overTasks.length > 0 && (
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--danger)' }}>超时科目：</span>
                    {reviewContext.todayTasks.overTasks.map(t => `${t.subject}（+${t.overMinutes}分钟）`).join('、')}
                  </p>
                )}
                {reviewContext.todayTasks.fastTasks.length > 0 && (
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--success)' }}>高效科目：</span>
                    {reviewContext.todayTasks.fastTasks.map(t => `${t.subject}（-${t.savedMinutes}分钟）`).join('、')}
                  </p>
                )}
                {reviewContext.yesterdayReview && (
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    昨天偏差率 {reviewContext.yesterdayReview.deviation_rate}%，完成率 {reviewContext.yesterdayReview.completion_rate}%
                    {reviewContext.yesterdayReview.deviation_rate > 30 && ' — 注意调整预估时长'}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Guided questions */}
          {questions.map((q, idx) => (
            <Card key={q.key}>
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-start gap-2">
                  <span
                    className="flex size-6 shrink-0 items-center justify-center text-xs font-bold"
                    style={{
                      borderRadius: '50%',
                      backgroundColor: 'var(--accent-color)',
                      color: '#fff',
                    }}
                  >
                    {idx + 1}
                  </span>
                  <h3 className="font-semibold pt-0.5" style={{ color: 'var(--text-primary)' }}>
                    {q.label}
                  </h3>
                </div>
                <textarea
                  value={answers[q.key] || ''}
                  onChange={e => handleAnswerChange(q.key, e.target.value)}
                  placeholder={q.placeholder}
                  className="w-full resize-none p-3 text-sm outline-none transition-colors"
                  style={{
                    minHeight: '80px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                  }}
                />
              </CardContent>
            </Card>
          ))}

          {/* Tomorrow plan / Next period plan */}
          <Card>
            <CardContent className="pt-5 space-y-3">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {period === 'daily' ? '明日计划' : period === 'weekly' ? '下周计划' : '下月计划'}
                <span className="text-xs font-normal ml-2" style={{ color: 'var(--text-secondary)' }}>
                  (可选)
                </span>
              </h3>
              <textarea
                value={tomorrowPlan}
                onChange={e => setTomorrowPlan(e.target.value)}
                placeholder={
                  period === 'daily'
                    ? '明天打算做什么？'
                    : period === 'weekly'
                      ? '下周打算重点做什么？'
                      : '下个月打算重点突破什么？'
                }
                className="w-full resize-none p-3 text-sm outline-none transition-colors"
                style={{
                  minHeight: '80px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
              />
            </CardContent>
          </Card>

          {/* Free text supplement */}
          <Card>
            <CardContent className="pt-5 space-y-3">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                补充想法
                <span className="text-xs font-normal ml-2" style={{ color: 'var(--text-secondary)' }}>
                  (可选)
                </span>
              </h3>
              <textarea
                value={freeText}
                onChange={e => setFreeText(e.target.value)}
                placeholder="还有什么想补充的？"
                className="w-full resize-none p-3 text-sm outline-none transition-colors"
                style={{
                  minHeight: '80px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
              />
            </CardContent>
          </Card>

          {/* Submit button */}
          <Button
            className="w-full py-3.5 text-base font-semibold"
            disabled={submitting || mood === 0}
            onClick={handleSubmit}
            style={{
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--accent-color)',
              color: '#fff',
            }}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-5 animate-spin" />
                提交中...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle2 className="size-5" />
                提交{periodLabel}
              </span>
            )}
          </Button>
        </>
      )}
    </div>
  )
}
