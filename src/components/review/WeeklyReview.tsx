'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Loader2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// ============================================================
// Types
// ============================================================

interface WeeklyTimelineData {
  week_start: string
  week_end: string
  summary: {
    total_pomodoros: number
    total_focus_minutes: number
    tasks_completed: number
    tasks_total: number
    avg_deviation_rate: number
    avg_mood: number
    review_days: number
  }
  last_week_summary: {
    total_pomodoros: number
    total_focus_minutes: number
    tasks_completed: number
    tasks_total: number
    avg_deviation_rate: number
    avg_mood: number
  } | null
  goal_progress: {
    title: string
    completed: number
    total: number
    on_track: boolean
  } | null
  days: Array<{
    date: string
    weekday: string
    mood: number | null
    pomodoros: number
    focus_minutes: number
    tasks_completed: number
    tasks_total: number
    deviation_rate: number
    subjects: Array<{ subject: string; completed: number; total_minutes: number }>
    review: {
      proud_moment: string
      biggest_difficulty: string
      tomorrow_priority: string
    } | null
    has_review: boolean
  }>
  patterns: {
    frequent_overtime_subjects: string[]
    best_day: { weekday: string; avg_pomodoros: number } | null
    worst_day: { weekday: string; avg_pomodoros: number } | null
    mood_trend: string
  }
  last_week_kiss: {
    kiss_review: string
    next_week_focus: string
  } | null
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
// Constants
// ============================================================

const MOOD_OPTIONS = [
  { value: 1, emoji: '\u{1F622}', label: '很差' },
  { value: 2, emoji: '\u{1F610}', label: '不太好' },
  { value: 3, emoji: '\u{1F642}', label: '一般' },
  { value: 4, emoji: '\u{1F60A}', label: '不错' },
  { value: 5, emoji: '\u{1F929}', label: '很棒' },
]

const MOOD_EMOJI_MAP: Record<number, string> = {
  1: '\u{1F622}',
  2: '\u{1F610}',
  3: '\u{1F642}',
  4: '\u{1F60A}',
  5: '\u{1F929}',
}

const MOOD_LABEL_MAP: Record<number, string> = {
  1: '很差',
  2: '不太好',
  3: '一般',
  4: '不错',
  5: '很棒',
}

const WEEKLY_QUESTIONS = [
  { key: 'week_proud', label: '这周最让我自豪的一件事', placeholder: '例如：坚持了5天复盘...' },
  { key: 'goal_status', label: '这周的学习目标完成得怎么样？', placeholder: '对照周目标评估...' },
  { key: 'recurring_problem', label: '这周反复出现的一个问题', placeholder: '' },
  { key: 'best_method', label: '这周学到的最有用的一个方法', placeholder: '' },
  { key: 'kiss_review', label: '应该继续做 / 停止做 / 开始做什么？', placeholder: '' },
  { key: 'next_week_focus', label: '下周的1-2个重点目标', placeholder: '' },
]

// ============================================================
// Helpers
// ============================================================

function parseContent(content: string): StructuredContent {
  if (!content) return { structured: {}, free_text: '' }
  try {
    const parsed = JSON.parse(content)
    if (parsed && typeof parsed === 'object' && parsed.structured) {
      return parsed as StructuredContent
    }
    return { structured: {}, free_text: content }
  } catch {
    return { structured: {}, free_text: content }
  }
}

function getDeviationColor(rate: number): string {
  if (rate <= 15) return 'var(--success)'
  if (rate <= 30) return '#eab308'
  return 'var(--danger)'
}

function formatComparison(current: number, last: number, suffix = '', invert = false): {
  text: string
  color: string
  icon: React.ReactNode
} {
  const diff = current - last
  if (diff > 0) {
    const isGood = invert ? false : true
    return {
      text: `上周${last}${suffix}`,
      color: isGood ? 'var(--success)' : 'var(--danger)',
      icon: <TrendingUp className="inline size-3" />,
    }
  }
  if (diff < 0) {
    const isGood = invert ? true : false
    return {
      text: `上周${last}${suffix}`,
      color: isGood ? 'var(--success)' : 'var(--danger)',
      icon: <TrendingDown className="inline size-3" />,
    }
  }
  return {
    text: `上周${last}${suffix}`,
    color: 'var(--text-muted)',
    icon: <Minus className="inline size-3" />,
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function truncate(str: string, maxLen: number): string {
  if (!str) return ''
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str
}

// ============================================================
// Main Component
// ============================================================

export default function WeeklyReview() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<WeeklyTimelineData | null>(null)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [showSubmitted, setShowSubmitted] = useState(false)
  const [existingReview, setExistingReview] = useState<ReviewRecord | null>(null)
  const [mood, setMood] = useState<number>(0)

  // Fetch timeline data and check for existing review
  const fetchData = useCallback(async () => {
    try {
      const [timelineRes, reviewRes] = await Promise.all([
        fetch('/api/reviews/weekly-timeline?date=2026-04-13'),
        fetch('/api/reviews?period=weekly'),
      ])

      if (timelineRes.ok) {
        const timelineJson = await timelineRes.json()
        setData(timelineJson)
      }

      if (reviewRes.ok) {
        const reviewJson = await reviewRes.json()
        if (reviewJson.review) {
          setExistingReview(reviewJson.review)
          setShowSubmitted(true)
          setMood(reviewJson.review.mood || 0)
          const parsed = parseContent(reviewJson.review.content)
          setAnswers(parsed.structured)
        }
      }
    } catch (error) {
      console.error('获取周复盘数据失败:', error)
      toast.error('加载数据失败，请刷新重试')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Build dynamic questions with context-aware placeholders
  const getQuestions = () => {
    if (!data) return WEEKLY_QUESTIONS

    return WEEKLY_QUESTIONS.map(q => {
      if (q.key === 'recurring_problem' && data.patterns.frequent_overtime_subjects.length > 0) {
        const subjects = data.patterns.frequent_overtime_subjects.join('、')
        return {
          ...q,
          placeholder: `提示：${subjects}本周多次超时，可能是这个问题`,
        }
      }
      return q
    })
  }

  const questions = getQuestions()

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
      const contentObj: StructuredContent = {
        structured: {},
        free_text: '',
      }
      for (const q of questions) {
        contentObj.structured[q.key] = answers[q.key] || ''
      }

      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period: 'weekly',
          content: JSON.stringify(contentObj),
          mood,
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error || '提交失败')
        return
      }

      toast.success('周复盘提交成功！')

      // Fetch insights
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
        // insights fetch failure does not affect main flow
      }

      // Refresh to show submitted state
      await fetchData()
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

  // Error state: no data
  if (!data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          暂无本周数据
        </p>
        <Button
          variant="outline"
          onClick={fetchData}
          style={{
            borderRadius: 'var(--radius-md)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-secondary)',
          }}
        >
          重试
        </Button>
      </div>
    )
  }

  const { summary, last_week_summary, goal_progress, days, patterns, last_week_kiss } = data

  // ============================================================
  // Section 1: Week Summary
  // ============================================================

  const renderWeekSummary = () => {
    const pomodoroComp = last_week_summary
      ? formatComparison(summary.total_pomodoros, last_week_summary.total_pomodoros, '个')
      : null
    const taskComp = last_week_summary
      ? formatComparison(summary.tasks_completed, last_week_summary.tasks_completed, `/${last_week_summary.tasks_total}`)
      : null
    const deviationComp = last_week_summary
      ? formatComparison(summary.avg_deviation_rate, last_week_summary.avg_deviation_rate, '%', true)
      : null
    const moodComp = last_week_summary
      ? formatComparison(summary.avg_mood, last_week_summary.avg_mood, '/5')
      : null

    return (
      <Card>
        <CardContent className="pt-5 space-y-4">
          <h3
            className="font-semibold"
            style={{ color: 'var(--accent-color)', fontFamily: 'var(--font-display)' }}
          >
            {'\uD83D\uDCCA'} 本周总览
          </h3>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {/* Pomodoros */}
            <div
              className="p-3"
              style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}
            >
              <div className="flex items-center gap-1">
                <span className="text-lg">{'\uD83C\uDF45'}</span>
                <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {summary.total_pomodoros}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>个</span>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>番茄钟</p>
              {pomodoroComp && (
                <p className="text-[10px] mt-0.5 flex items-center gap-0.5" style={{ color: pomodoroComp.color }}>
                  {pomodoroComp.icon} {pomodoroComp.text}
                </p>
              )}
            </div>

            {/* Tasks */}
            <div
              className="p-3"
              style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}
            >
              <div className="flex items-center gap-1">
                <span className="text-lg">{'\u2705'}</span>
                <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {summary.tasks_completed}/{summary.tasks_total}
                </span>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>任务完成</p>
              {taskComp && (
                <p className="text-[10px] mt-0.5 flex items-center gap-0.5" style={{ color: taskComp.color }}>
                  {taskComp.icon} {taskComp.text}
                </p>
              )}
            </div>

            {/* Deviation Rate */}
            <div
              className="p-3"
              style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}
            >
              <div className="flex items-center gap-1">
                <span className="text-lg">{'\uD83D\uDCCA'}</span>
                <span className="text-xl font-bold" style={{ color: getDeviationColor(summary.avg_deviation_rate) }}>
                  {summary.avg_deviation_rate}%
                </span>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>偏差率</p>
              {deviationComp && (
                <p className="text-[10px] mt-0.5 flex items-center gap-0.5" style={{ color: deviationComp.color }}>
                  {deviationComp.icon} {deviationComp.text}
                </p>
              )}
            </div>

            {/* Avg Mood */}
            <div
              className="p-3"
              style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}
            >
              <div className="flex items-center gap-1">
                <span className="text-lg">{'\uD83D\uDE0A'}</span>
                <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {summary.avg_mood}/5
                </span>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>平均心情</p>
              {moodComp && (
                <p className="text-[10px] mt-0.5 flex items-center gap-0.5" style={{ color: moodComp.color }}>
                  {moodComp.icon} {moodComp.text}
                </p>
              )}
            </div>

            {/* Review Days */}
            <div
              className="p-3"
              style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}
            >
              <div className="flex items-center gap-1">
                <span className="text-lg">{'\uD83D\uDCDD'}</span>
                <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {summary.review_days}/7
                </span>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>复盘天数</p>
            </div>

            {/* Goal Progress (conditional) */}
            {goal_progress ? (
              <div
                className="p-3"
                style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}
              >
                <div className="flex items-center gap-1">
                  <span className="text-lg">{'\uD83C\uDFAF'}</span>
                  <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {goal_progress.completed}/{goal_progress.total}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {goal_progress.title}
                  </span>
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>目标进度</p>
                <p
                  className="text-[10px] mt-0.5"
                  style={{ color: goal_progress.on_track ? 'var(--success)' : '#eab308' }}
                >
                  {goal_progress.on_track ? '进度正常' : '进度落后'}
                </p>
              </div>
            ) : (
              <div
                className="p-3"
                style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}
              >
                <div className="flex items-center gap-1">
                  <span className="text-lg">{'\u23F0'}</span>
                  <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {Math.round(summary.total_focus_minutes / 60 * 10) / 10}h
                  </span>
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>专注时长</p>
                {last_week_summary && (
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    上周{Math.round(last_week_summary.total_focus_minutes / 60 * 10) / 10}h
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // ============================================================
  // Section 2: 7-Day Timeline
  // ============================================================

  const renderTimeline = () => {
    const expandedDayData = expandedDay ? days.find(d => d.date === expandedDay) : null

    return (
      <div className="space-y-3">
        <h3
          className="font-semibold"
          style={{ color: 'var(--accent-color)', fontFamily: 'var(--font-display)' }}
        >
          {'\uD83D\uDCC5'} 本周时间线
        </h3>

        {/* Day cards row */}
        <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
          {days.map(day => {
            const isExpanded = expandedDay === day.date
            const moodEmoji = day.mood ? MOOD_EMOJI_MAP[day.mood] : null

            return (
              <button
                key={day.date}
                onClick={() => setExpandedDay(isExpanded ? null : day.date)}
                className="shrink-0 p-2.5 text-left transition-all"
                style={{
                  width: '110px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: isExpanded ? 'var(--accent-light, rgba(99,102,241,0.08))' : 'var(--bg-secondary)',
                  border: isExpanded ? '2px solid var(--accent-color)' : '2px solid transparent',
                  cursor: 'pointer',
                }}
              >
                {/* Date header */}
                <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {day.weekday} {formatDate(day.date)}
                </p>

                {/* Mood */}
                <p className="text-xl mt-1">
                  {moodEmoji || <span style={{ color: 'var(--text-muted)' }}>?</span>}
                </p>

                {/* Pomodoros & Tasks */}
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {'\uD83C\uDF45'}{day.pomodoros}{'  '}
                  {day.tasks_completed}/{day.tasks_total}
                </p>

                {/* Deviation rate */}
                <p
                  className="text-[10px] mt-0.5"
                  style={{ color: getDeviationColor(day.deviation_rate) }}
                >
                  {day.deviation_rate}%
                </p>

                {/* Review excerpt */}
                {day.has_review && day.review?.proud_moment ? (
                  <p
                    className="text-[10px] mt-1 leading-tight"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    &ldquo;{truncate(day.review.proud_moment, 8)}&rdquo;
                  </p>
                ) : (
                  <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                    未复盘
                  </p>
                )}

                {/* Expand indicator */}
                <div className="flex justify-center mt-1.5">
                  {isExpanded ? (
                    <ChevronUp className="size-3" style={{ color: 'var(--accent-color)' }} />
                  ) : (
                    <ChevronDown className="size-3" style={{ color: 'var(--text-muted)' }} />
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Expanded day detail */}
        {expandedDayData && (
          <Card
            style={{
              animation: 'fadeIn 0.2s ease-out',
              border: '1px solid var(--accent-color)',
            }}
          >
            <CardContent className="pt-5 space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {expandedDayData.weekday} {formatDateFull(expandedDayData.date)}
                </h4>
                <button
                  onClick={() => setExpandedDay(null)}
                  className="text-xs px-2 py-1"
                  style={{ color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  收起
                </button>
              </div>

              {/* Mood */}
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  心情：
                </span>
                {expandedDayData.mood ? (
                  <>
                    <span className="text-xl">{MOOD_EMOJI_MAP[expandedDayData.mood]}</span>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {MOOD_LABEL_MAP[expandedDayData.mood]}
                    </span>
                  </>
                ) : (
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    未记录
                  </span>
                )}
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span>
                  {'\uD83C\uDF45'} {expandedDayData.pomodoros}个番茄钟 {'\u00B7'} {expandedDayData.focus_minutes}分钟专注
                </span>
              </div>
              <div className="flex flex-wrap gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span>
                  {'\u2705'} 任务 {expandedDayData.tasks_completed}/{expandedDayData.tasks_total}
                </span>
                <span style={{ color: getDeviationColor(expandedDayData.deviation_rate) }}>
                  {'\u00B7'} 偏差率 {expandedDayData.deviation_rate}%
                </span>
              </div>

              {/* Subjects */}
              {expandedDayData.subjects.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    {'\uD83D\uDCDA'} 科目：
                  </p>
                  <div className="space-y-1">
                    {expandedDayData.subjects.map((subject, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs p-2"
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <span style={{ color: 'var(--text-primary)' }}>{subject.subject}</span>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {subject.completed}个任务 {'\u00B7'} {subject.total_minutes}分钟
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Review content */}
              {expandedDayData.has_review && expandedDayData.review ? (
                <div>
                  <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    {'\uD83D\uDCAD'} 复盘：
                  </p>
                  <div className="space-y-1.5">
                    <div
                      className="p-2 text-xs"
                      style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}
                    >
                      <span style={{ color: 'var(--accent-color)' }}>值得肯定：</span>
                      <span style={{ color: 'var(--text-primary)' }}>{expandedDayData.review.proud_moment}</span>
                    </div>
                    {expandedDayData.review.biggest_difficulty && (
                      <div
                        className="p-2 text-xs"
                        style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}
                      >
                        <span style={{ color: 'var(--accent-color)' }}>最大困难：</span>
                        <span style={{ color: 'var(--text-primary)' }}>{expandedDayData.review.biggest_difficulty}</span>
                      </div>
                    )}
                    {expandedDayData.review.tomorrow_priority && (
                      <div
                        className="p-2 text-xs"
                        style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}
                      >
                        <span style={{ color: 'var(--accent-color)' }}>明天重点：</span>
                        <span style={{ color: 'var(--text-primary)' }}>{expandedDayData.review.tomorrow_priority}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  当天未填写复盘
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // ============================================================
  // Section 3: Write Weekly Review
  // ============================================================

  const renderSubmittedView = () => {
    if (!showSubmitted || !existingReview) return null

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3
            className="font-semibold"
            style={{ color: 'var(--accent-color)', fontFamily: 'var(--font-display)' }}
          >
            {'\u2705'} 周复盘已提交
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
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>心情：</span>
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
          修改周复盘
        </Button>
      </div>
    )
  }

  const renderReviewForm = () => {
    if (showSubmitted) return renderSubmittedView()

    return (
      <div className="space-y-4">
        <h3
          className="font-semibold"
          style={{ color: 'var(--accent-color)', fontFamily: 'var(--font-display)' }}
        >
          {'\u270F\uFE0F'} 写周复盘
        </h3>

        {/* Mood selector */}
        <Card>
          <CardContent className="pt-5 space-y-3">
            <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              心情如何？
            </h4>
            <div className="flex items-center justify-between px-2">
              {MOOD_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => setMood(option.value)}
                  className="flex flex-col items-center gap-1 transition-all active:scale-90"
                  style={{
                    opacity: mood === 0 || mood === option.value ? 1 : 0.4,
                    transform: mood === option.value ? 'scale(1.15)' : 'scale(1)',
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    padding: '4px',
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

        {/* Questions */}
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
                <h4 className="font-semibold pt-0.5" style={{ color: 'var(--text-primary)' }}>
                  {q.label}
                </h4>
              </div>

              {/* Context notes for specific questions */}
              {q.key === 'kiss_review' && last_week_kiss?.kiss_review && (
                <p
                  className="text-xs p-2"
                  style={{
                    backgroundColor: 'var(--accent-light, rgba(99,102,241,0.08))',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  上周你说：{last_week_kiss.kiss_review}，做到了吗？
                </p>
              )}
              {q.key === 'next_week_focus' && last_week_kiss?.next_week_focus && (
                <p
                  className="text-xs p-2"
                  style={{
                    backgroundColor: 'var(--accent-light, rgba(99,102,241,0.08))',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  上周的重点：{last_week_kiss.next_week_focus}
                </p>
              )}

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
              提交周复盘
            </span>
          )}
        </Button>
      </div>
    )
  }

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="mx-auto max-w-lg space-y-5 px-4 py-5">
      {/* Week date range */}
      <div>
        <h2
          className="text-lg font-bold"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
        >
          周复盘
        </h2>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {formatDateFull(data.week_start)} - {formatDateFull(data.week_end)}
        </p>
      </div>

      {/* Section 1: Week Summary */}
      {renderWeekSummary()}

      {/* Section 2: 7-Day Timeline */}
      {renderTimeline()}

      {/* Section 3: Write Weekly Review */}
      {renderReviewForm()}

      {/* Inline style for fade-in animation */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
