'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Loader2,
  ChevronRight,
  CalendarDays,
  CalendarRange,
  Calendar,
  CheckCircle2,
  Circle,
  Flame,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// ============================================================
// Types
// ============================================================
interface DailySummary {
  has_today_review: boolean
  streak_days: number
}

interface WeeklySummary {
  has_this_week_review: boolean
  last_week_review: {
    mood: number
    content: string
    tomorrow_plan: string
    created_at: string
  } | null
}

interface MonthlySummary {
  has_this_month_review: boolean
  last_month_review: {
    mood: number
    content: string
    tomorrow_plan: string
    created_at: string
  } | null
}

const MOOD_EMOJIS = ['', '\u{1F622}', '\u{1F614}', '\u{1F610}', '\u{1F60A}', '\u{1F604}']

// ============================================================
// Helper: get week/month ranges
// ============================================================
function getWeekMonday(offset: number = 0): string {
  const now = new Date()
  now.setDate(now.getDate() + offset * 7)
  const day = now.getDay()
  const diff = day === 0 ? 6 : day - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - diff)
  return monday.toISOString().split('T')[0]
}

function getMonthStart(offset: number = 0): string {
  const now = new Date()
  now.setMonth(now.getMonth() + offset)
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

// ============================================================
// Component
// ============================================================
export default function SummaryTab() {
  const [loading, setLoading] = useState(true)
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null)
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null)
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null)

  const fetchSummaries = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch daily review status
      const today = new Date().toISOString().split('T')[0]
      const dailyRes = await fetch(`/api/reviews?period=daily&date=${today}`)
      if (dailyRes.ok) {
        const dailyData = await dailyRes.json()
        setDailySummary({
          has_today_review: !!dailyData.review,
          streak_days: 0, // Will be calculated below
        })
      }

      // Fetch daily reviews list for streak calculation
      const listRes = await fetch('/api/reviews?action=list&period=daily&limit=7')
      if (listRes.ok) {
        const listData = await listRes.json()
        const reviews = listData.reviews ?? []
        // Calculate streak: count consecutive days ending from today going backwards
        let streak = 0
        const todayDate = new Date()
        for (let i = 0; i < 7; i++) {
          const checkDate = new Date(todayDate)
          checkDate.setDate(todayDate.getDate() - i)
          const dateStr = checkDate.toISOString().split('T')[0]
          if (reviews.some((r: { period_start: string }) => r.period_start === dateStr)) {
            streak++
          } else if (i > 0) {
            break
          }
        }
        setDailySummary(prev => prev ? { ...prev, streak_days: streak } : prev)
      }

      // Fetch weekly review status
      const thisWeekMonday = getWeekMonday(0)
      const weeklyRes = await fetch(`/api/reviews?period=weekly&date=${thisWeekMonday}`)
      if (weeklyRes.ok) {
        const weeklyData = await weeklyRes.json()
        setWeeklySummary({
          has_this_week_review: !!weeklyData.review,
          last_week_review: null,
        })
      }

      // Fetch last week review
      const lastWeekMonday = getWeekMonday(-1)
      const lastWeekRes = await fetch(`/api/reviews?period=weekly&date=${lastWeekMonday}`)
      if (lastWeekRes.ok) {
        const lastWeekData = await lastWeekRes.json()
        if (lastWeekData.review) {
          setWeeklySummary(prev => prev ? {
            ...prev,
            last_week_review: {
              mood: lastWeekData.review.mood,
              content: lastWeekData.review.content,
              tomorrow_plan: lastWeekData.review.tomorrow_plan,
              created_at: lastWeekData.review.created_at,
            },
          } : prev)
        }
      }

      // Fetch monthly review status
      const thisMonthStart = getMonthStart(0)
      const monthlyRes = await fetch(`/api/reviews?period=monthly&date=${thisMonthStart}`)
      if (monthlyRes.ok) {
        const monthlyData = await monthlyRes.json()
        setMonthlySummary({
          has_this_month_review: !!monthlyData.review,
          last_month_review: null,
        })
      }

      // Fetch last month review
      const lastMonthStart = getMonthStart(-1)
      const lastMonthRes = await fetch(`/api/reviews?period=monthly&date=${lastMonthStart}`)
      if (lastMonthRes.ok) {
        const lastMonthData = await lastMonthRes.json()
        if (lastMonthData.review) {
          setMonthlySummary(prev => prev ? {
            ...prev,
            last_month_review: {
              mood: lastMonthData.review.mood,
              content: lastMonthData.review.content,
              tomorrow_plan: lastMonthData.review.tomorrow_plan,
              created_at: lastMonthData.review.created_at,
            },
          } : prev)
        }
      }
    } catch (error) {
      console.error('获取总结状态失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSummaries()
  }, [fetchSummaries])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin" style={{ color: 'var(--accent-color)' }} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Daily summary card */}
      <Card>
        <CardContent className="pt-0 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="flex items-center justify-center size-8 rounded-lg"
                style={{ backgroundColor: 'var(--accent-light)' }}
              >
                <CalendarDays className="size-4" style={{ color: 'var(--accent-color)' }} />
              </div>
              <h3 className="text-sm font-semibold">日总结</h3>
            </div>
            {dailySummary?.has_today_review ? (
              <Badge className="text-white border-0" style={{ backgroundColor: 'var(--success)' }}>
                <CheckCircle2 className="size-3" />
                已完成
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                <Circle className="size-3" />
                未完成
              </Badge>
            )}
          </div>

          {/* Streak */}
          {dailySummary && (
            <div className="flex items-center gap-2">
              <Flame className="size-4" style={{ color: 'var(--warning)' }} />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                最近7天连续总结 <strong style={{ color: 'var(--accent-color)' }}>{dailySummary.streak_days}</strong> 天
              </span>
            </div>
          )}

          <Link href="/review/daily" className="block">
            <button
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all active:scale-[0.98]"
              style={{
                backgroundColor: 'var(--accent-light)',
                color: 'var(--accent-color)',
              }}
            >
              写今日总结
              <ChevronRight className="size-4" />
            </button>
          </Link>
        </CardContent>
      </Card>

      {/* Weekly summary card */}
      <Card>
        <CardContent className="pt-0 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="flex items-center justify-center size-8 rounded-lg"
                style={{ backgroundColor: 'color-mix(in srgb, var(--success) 15%, transparent)' }}
              >
                <CalendarRange className="size-4" style={{ color: 'var(--success)' }} />
              </div>
              <h3 className="text-sm font-semibold">周总结</h3>
            </div>
            {weeklySummary?.has_this_week_review ? (
              <Badge className="text-white border-0" style={{ backgroundColor: 'var(--success)' }}>
                <CheckCircle2 className="size-3" />
                已提交
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                <Circle className="size-3" />
                未提交
              </Badge>
            )}
          </div>

          {/* Last week preview */}
          {weeklySummary?.last_week_review && (
            <div
              className="rounded-lg p-3 space-y-1.5"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">{MOOD_EMOJIS[weeklySummary.last_week_review.mood]}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>上周总结</span>
              </div>
              <p className="text-xs line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                {weeklySummary.last_week_review.content}
              </p>
            </div>
          )}

          <Link href="/review/weekly" className="block">
            <button
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all active:scale-[0.98]"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--success) 15%, transparent)',
                color: 'var(--success)',
              }}
            >
              写周总结
              <ChevronRight className="size-4" />
            </button>
          </Link>
        </CardContent>
      </Card>

      {/* Monthly summary card */}
      <Card>
        <CardContent className="pt-0 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="flex items-center justify-center size-8 rounded-lg"
                style={{ backgroundColor: 'color-mix(in srgb, var(--warning) 15%, transparent)' }}
              >
                <Calendar className="size-4" style={{ color: 'var(--warning)' }} />
              </div>
              <h3 className="text-sm font-semibold">月总结</h3>
            </div>
            {monthlySummary?.has_this_month_review ? (
              <Badge className="text-white border-0" style={{ backgroundColor: 'var(--success)' }}>
                <CheckCircle2 className="size-3" />
                已提交
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                <Circle className="size-3" />
                未提交
              </Badge>
            )}
          </div>

          {/* Last month preview */}
          {monthlySummary?.last_month_review && (
            <div
              className="rounded-lg p-3 space-y-1.5"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">{MOOD_EMOJIS[monthlySummary.last_month_review.mood]}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>上月总结</span>
              </div>
              <p className="text-xs line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                {monthlySummary.last_month_review.content}
              </p>
            </div>
          )}

          <Link href="/review/monthly" className="block">
            <button
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all active:scale-[0.98]"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--warning) 15%, transparent)',
                color: 'var(--warning)',
              }}
            >
              写月总结
              <ChevronRight className="size-4" />
            </button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
