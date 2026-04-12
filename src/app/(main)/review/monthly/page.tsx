'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, Star, Clock, Target, Zap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

// ============================================================
// Types - matching the existing /api/reviews response
// ============================================================
interface ReviewData {
  id: string
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
// Helper
// ============================================================
function formatMonthLabel(monthStart: string): string {
  const [year, month] = monthStart.split('-')
  return `${year}年${parseInt(month)}月`
}

function getCurrentMonthStart(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

// ============================================================
// Main Page
// ============================================================
export default function MonthlyReviewPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [review, setReview] = useState<ReviewData | null>(null)
  const [hasReview, setHasReview] = useState(false)
  const [mood, setMood] = useState<number>(0)
  const [reviewText, setReviewText] = useState('')
  const [nextPlan, setNextPlan] = useState('')
  const [showCelebration, setShowCelebration] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const monthStart = getCurrentMonthStart()
      const res = await fetch(`/api/reviews?period=monthly&date=${monthStart}`)
      if (res.ok) {
        const json = await res.json()
        if (json.review) {
          setReview(json.review)
          setHasReview(true)
          setMood(json.review.mood)
          setReviewText(json.review.content)
          setNextPlan(json.review.tomorrow_plan ?? '')
        } else {
          setReview(null)
          setHasReview(false)
        }
      }
    } catch (error) {
      console.error('获取月总结数据失败:', error)
    }
  }, [])

  useEffect(() => {
    fetchData().finally(() => setLoading(false))
  }, [fetchData])

  const handleSubmit = async () => {
    if (mood === 0) {
      toast.error('请选择本月的心情')
      return
    }
    if (reviewText.trim().length < 10) {
      toast.error('本月回顾至少需要10个字')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period: 'monthly',
          mood,
          content: reviewText,
          tomorrow_plan: nextPlan || '',
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error || '提交失败')
        return
      }

      setShowCelebration(true)
      toast.success('月总结提交成功！+10积分')
      await fetchData()
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

  const monthStart = getCurrentMonthStart()
  const submitPoints = 10

  // Calculate stats from review data
  const tasksCompleted = review?.tasks_completed ?? 0
  const tasksTotal = review?.tasks_total ?? 0
  const studyMinutes = review?.study_minutes ?? 0
  const studyHours = Math.round(studyMinutes / 60)
  const taskCompletionRate = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-5">
      {/* Celebration overlay */}
      {showCelebration && (
        <div className="celebration-overlay">
          <div className="celebration-content">
            <div className="celebration-emoji">&#127881;</div>
            <p className="celebration-text">月总结提交成功！</p>
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
            &#128197; 月总结
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {formatMonthLabel(monthStart)}
          </p>
        </div>
      </div>

      {/* ============================================ */}
      {/* Stats overview */}
      {/* ============================================ */}
      <Card>
        <CardContent className="pt-0 space-y-4">
          <h3 className="font-semibold" style={{ color: 'var(--accent-color)' }}>本月统计概览</h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3" style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <Zap className="size-3" style={{ color: 'var(--accent-color)' }} />
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>任务完成率</p>
              </div>
              <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {taskCompletionRate}%
              </p>
            </div>
            <div className="p-3" style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="size-3" style={{ color: 'var(--accent-color)' }} />
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>总学习时长</p>
              </div>
              <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {studyHours} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>小时</span>
              </p>
            </div>
            <div className="p-3" style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <Target className="size-3" style={{ color: 'var(--accent-color)' }} />
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>完成任务</p>
              </div>
              <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {tasksCompleted}/{tasksTotal}
              </p>
            </div>
            <div className="p-3" style={{ backgroundColor: 'var(--points-bg)', borderRadius: 'var(--radius-sm)' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <Star className="size-3" style={{ color: 'var(--points-color)' }} />
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>偏差率</p>
              </div>
              <p className="text-lg font-bold" style={{ color: 'var(--points-text)' }}>
                {review?.deviation_rate ?? 0}%
              </p>
            </div>
          </div>

          {/* Task progress bar */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span style={{ color: 'var(--text-secondary)' }}>任务完成情况</span>
              <span className="font-semibold" style={{ color: 'var(--accent-color)' }}>
                {tasksCompleted}/{tasksTotal}
              </span>
            </div>
            <Progress value={taskCompletionRate} />
          </div>
        </CardContent>
      </Card>

      {/* ============================================ */}
      {/* Already submitted */}
      {/* ============================================ */}
      {hasReview && review && (
        <>
          <Card>
            <CardContent className="pt-0 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold" style={{ color: 'var(--accent-color)' }}>本月总结</h3>
                <span className="text-xs px-2 py-1" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', borderRadius: '9999px' }}>
                  已提交
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>心情：</span>
                <span className="text-2xl">{MOOD_OPTIONS[review.mood - 1]?.emoji}</span>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {MOOD_OPTIONS[review.mood - 1]?.label}
                </span>
              </div>

              <div className="p-3" style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{review.content}</p>
              </div>

              {review.tomorrow_plan && (
                <div className="p-3" style={{ backgroundColor: 'var(--accent-light)', borderRadius: 'var(--radius-sm)' }}>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--accent-color)' }}>下月计划</p>
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{review.tomorrow_plan}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-center gap-2 px-4 py-3" style={{ borderRadius: 'var(--radius-md)', backgroundColor: 'var(--points-bg)' }}>
            <Star className="size-4" style={{ color: 'var(--points-color)' }} />
            <span className="text-sm" style={{ color: 'var(--points-text)' }}>
              本次总结获得 <strong>{review.points_earned}</strong> 积分
            </span>
          </div>

          <button
            onClick={() => {
              setHasReview(false)
              setReview(null)
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
      {!hasReview && (
        <>
          {/* Mood selector */}
          <Card>
            <CardContent className="pt-0 space-y-3">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>这个月心情如何？</h3>
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
            <CardContent className="pt-0 space-y-3">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>本月回顾</h3>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="这个月整体感觉如何？目标达成情况？"
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

          {/* Next month plan */}
          <Card>
            <CardContent className="pt-0 space-y-3">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>下月计划</h3>
              <textarea
                value={nextPlan}
                onChange={(e) => setNextPlan(e.target.value)}
                placeholder="下个月打算重点突破什么？"
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
              <>提交月总结 +{submitPoints}积分</>
            )}
          </button>
        </>
      )}

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
