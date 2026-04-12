'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, Star, CheckCircle2, Circle, Target } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

// ============================================================
// Types
// ============================================================
interface ReviewData {
  id: string
  mood: number
  review_text: string
  tomorrow_plan: string | null
  deviation_rate: number
  points_earned: number
  created_at: string
}

interface ReviewStats {
  completed_tasks: number
  total_tasks: number
  planned_minutes: number
  actual_minutes: number
  deviation_rate: number
  today_points: number
}

interface ReviewResponse {
  review: ReviewData | null
  has_review: boolean
  stats: ReviewStats
  streak: number
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
// Main Page
// ============================================================
export default function DailyReviewPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [data, setData] = useState<ReviewResponse | null>(null)
  const [mood, setMood] = useState<number>(0)
  const [reviewText, setReviewText] = useState('')
  const [tomorrowPlan, setTomorrowPlan] = useState('')
  const [showCelebration, setShowCelebration] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/reviews?period=daily')
      if (res.ok) {
        const json = await res.json()
        setData(json)
        if (json.review) {
          setMood(json.review.mood)
          setReviewText(json.review.review_text)
          setTomorrowPlan(json.review.tomorrow_plan ?? '')
        }
      }
    } catch (error) {
      console.error('获取日总结数据失败:', error)
    }
  }, [])

  useEffect(() => {
    fetchData().finally(() => setLoading(false))
  }, [fetchData])

  const handleSubmit = async () => {
    if (mood === 0) {
      toast.error('请选择今天的心情')
      return
    }
    if (reviewText.trim().length < 10) {
      toast.error('今日回顾至少需要10个字')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mood,
          review_text: reviewText,
          tomorrow_plan: tomorrowPlan || null,
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error || '提交失败')
        return
      }

      // Show celebration
      setShowCelebration(true)
      toast.success(`总结提交成功！+${json.points}积分`)

      // Refresh data
      await fetchData()

      // Hide celebration after 3s
      setTimeout(() => setShowCelebration(false), 3000)
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--accent-color)' }} />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6 text-center" style={{ color: 'var(--text-muted)' }}>
        加载失败，请刷新重试
      </div>
    )
  }

  const { stats, streak } = data
  const isMaster = stats.deviation_rate < 10 && stats.planned_minutes > 0
  const submitPoints = isMaster ? 4 : 2

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-5">
      {/* Celebration overlay */}
      {showCelebration && (
        <div className="celebration-overlay">
          <div className="celebration-content">
            <div className="celebration-emoji">&#127881;</div>
            <p className="celebration-text">总结提交成功！</p>
            <p className="celebration-points">+{submitPoints} 积分</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex size-9 items-center justify-center transition-colors"
          style={{
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-secondary)',
          }}
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            &#128221; 今日总结
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </p>
        </div>
      </div>

      {/* ============================================ */}
      {/* Already submitted */}
      {/* ============================================ */}
      {data.has_review && data.review && (
        <>
          {/* Review content card */}
          <Card>
            <CardContent className="pt-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold" style={{ color: 'var(--accent-color)' }}>今日总结</h3>
                <span className="text-xs px-2 py-1" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', borderRadius: '9999px' }}>
                  已提交
                </span>
              </div>

              {/* Mood display */}
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>心情：</span>
                <span className="text-2xl">{MOOD_OPTIONS[data.review.mood - 1]?.emoji}</span>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {MOOD_OPTIONS[data.review.mood - 1]?.label}
                </span>
              </div>

              {/* Review text */}
              <div className="p-3" style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{data.review.review_text}</p>
              </div>

              {/* Tomorrow plan */}
              {data.review.tomorrow_plan && (
                <div className="p-3" style={{ backgroundColor: 'var(--accent-light)', borderRadius: 'var(--radius-sm)' }}>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--accent-color)' }}>明日计划</p>
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{data.review.tomorrow_plan}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats (read-only) */}
          <StatsOverview stats={stats} isMaster={isMaster} />

          {/* Points earned */}
          <div className="flex items-center justify-center gap-2 px-4 py-3" style={{ borderRadius: 'var(--radius-md)', backgroundColor: 'var(--points-bg)' }}>
            <Star className="size-4" style={{ color: 'var(--points-color)' }} />
            <span className="text-sm" style={{ color: 'var(--points-text)' }}>
              本次总结获得 <strong>{data.review.points_earned}</strong> 积分
            </span>
          </div>

          {/* Edit button */}
          <button
            onClick={() => {
              setData(prev => prev ? { ...prev, has_review: false, review: null } : prev)
            }}
            className="w-full py-3 text-sm font-medium transition-colors"
            style={{
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
            }}
          >
            修改总结
          </button>
        </>
      )}

      {/* ============================================ */}
      {/* Not yet submitted - Form */}
      {/* ============================================ */}
      {!data.has_review && (
        <>
          {/* Stats overview */}
          <StatsOverview stats={stats} isMaster={isMaster} />

          {/* Mood selector */}
          <Card>
            <CardContent className="pt-5 space-y-3">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>今天心情如何？</h3>
              <div className="flex items-center justify-between px-2">
                {MOOD_OPTIONS.map((option) => (
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
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{option.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Review text */}
          <Card>
            <CardContent className="pt-5 space-y-3">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>今日回顾</h3>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="今天学得怎么样？有什么收获或困难？"
                className="w-full resize-none p-3 text-sm outline-none transition-colors"
                style={{
                  minHeight: '100px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
              />
              <p className="text-xs text-right" style={{ color: reviewText.trim().length >= 10 ? 'var(--success)' : 'var(--text-muted)' }}>
                {reviewText.trim().length}/10 字
              </p>
            </CardContent>
          </Card>

          {/* Tomorrow plan */}
          <Card>
            <CardContent className="pt-5 space-y-3">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>明日计划 <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>(可选)</span></h3>
              <textarea
                value={tomorrowPlan}
                onChange={(e) => setTomorrowPlan(e.target.value)}
                placeholder="明天打算做什么？"
                className="w-full resize-none p-3 text-sm outline-none transition-colors"
                style={{
                  minHeight: '100px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
              />
            </CardContent>
          </Card>

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={submitting || mood === 0 || reviewText.trim().length < 10}
            className="w-full py-3.5 text-base font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50"
            style={{
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--accent-color)',
            }}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-5 animate-spin" />
                提交中...
              </span>
            ) : (
              <>
                提交今日总结 +{submitPoints}积分
                {isMaster && ' \uD83C\uDFAF'}
              </>
            )}
          </button>
        </>
      )}

      {/* ============================================ */}
      {/* Bottom tips */}
      {/* ============================================ */}
      <div className="text-center space-y-2 pt-2 pb-4">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          坚持每日总结，养成复盘习惯 &#128293;
        </p>
        {streak > 0 && (
          <p className="text-xs" style={{ color: 'var(--accent-color)' }}>
            已连续总结 {streak} 天
          </p>
        )}
      </div>

      {/* Celebration styles */}
      <style jsx>{`
        .celebration-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.3);
          animation: celebrationFadeIn 0.3s ease-out forwards;
        }
        .celebration-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 32px 48px;
          border-radius: var(--radius-lg);
          background: var(--bg-card);
          box-shadow: var(--shadow-lg);
          animation: celebrationScaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .celebration-emoji {
          font-size: 48px;
          animation: celebrationBounce 0.6s ease-in-out 0.3s both;
        }
        .celebration-text {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          font-family: var(--font-display);
        }
        .celebration-points {
          font-size: 14px;
          color: var(--points-color);
          font-weight: 600;
        }
        @keyframes celebrationFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes celebrationScaleIn {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes celebrationBounce {
          0% { transform: scale(0); }
          50% { transform: scale(1.3); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

// ============================================================
// Stats Overview Component
// ============================================================
function StatsOverview({ stats, isMaster }: { stats: ReviewStats; isMaster: boolean }) {
  const progressPercent = stats.total_tasks > 0
    ? Math.round((stats.completed_tasks / stats.total_tasks) * 100)
    : 0

  return (
    <Card>
      <CardContent className="pt-5 space-y-4">
        <h3 className="font-semibold" style={{ color: 'var(--accent-color)' }}>今日统计</h3>

        {/* Task progress */}
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span style={{ color: 'var(--text-secondary)' }}>任务完成情况</span>
            <span className="font-semibold" style={{ color: 'var(--accent-color)' }}>
              {stats.completed_tasks}/{stats.total_tasks} 个任务已完成
            </span>
          </div>
          <Progress value={progressPercent}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progressPercent}%`, backgroundColor: 'var(--accent-color)' }}
            />
          </Progress>
        </div>

        {/* Study time */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3" style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>实际学习时长</p>
            <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              {stats.actual_minutes} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>分钟</span>
            </p>
          </div>
          <div className="p-3" style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>规划学习时长</p>
            <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              {stats.planned_minutes} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>分钟</span>
            </p>
          </div>
        </div>

        {/* Deviation rate */}
        <div className="flex items-center justify-between p-3" style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>偏差率</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: isMaster ? 'var(--success)' : 'var(--text-primary)' }}>
              {stats.deviation_rate}%
            </span>
            {isMaster && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', borderRadius: '9999px' }}>
                <Target className="size-3" />
                规划执行大师
              </span>
            )}
          </div>
        </div>

        {/* Today points */}
        <div className="flex items-center justify-between p-3" style={{ backgroundColor: 'var(--points-bg)', borderRadius: 'var(--radius-sm)' }}>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>今日获得积分</span>
          <div className="flex items-center gap-1">
            <Star className="size-4" style={{ color: 'var(--points-color)' }} />
            <span className="text-sm font-bold" style={{ color: 'var(--points-text)' }}>{stats.today_points} 分</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
