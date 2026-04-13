'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Moon, Star, Clock, TrendingUp, Loader2,
  ClipboardList, PenLine, Coffee, Sun,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import PlanForm from '@/components/PlanForm'
import StructuredReview from '@/components/review/StructuredReview'
import type { SleepLog } from '@/types'
import { calculateSleepPoints } from '@/lib/points'

// ============================================================
// 宿舍页面 — 一个空间，不是一组Tab
//
// 设计理念：
// 宿舍是一个"房间"，不是设置页面。
// 进来后根据时间自动展示最相关的内容，
// 不需要用户手动切换。
//
// 早晨(6-12)：规划
// 白天(12-20)：进度 + 休息
// 晚上(20-22)：总结
// 深夜(22+)：睡眠打卡
//
// 底部有快捷链接，可以在非默认时间做其他事。
// ============================================================

type SleepStatus = 'idle' | 'sleeping' | 'completed'

interface TodayState {
  status: SleepStatus
  log: SleepLog | null
  streak: number
}

type TimePhase = 'morning' | 'afternoon' | 'evening' | 'night'

function getTimePhase(): TimePhase {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 20) return 'afternoon'
  if (hour >= 20 && hour < 22) return 'evening'
  return 'night'
}

function formatTimeNow(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function getTimeMessage(time: string): { text: string; level: 'gold' | 'warning' | 'late' } {
  const [h, m] = time.split(':').map(Number)
  const minutes = h * 60 + m
  if (minutes <= 22 * 60 + 30) return { text: '早睡黄金时间', level: 'gold' }
  if (minutes <= 23 * 60) return { text: '还可以赶上打卡', level: 'warning' }
  return { text: '已过打卡时间', level: 'late' }
}

function getGreeting(): { text: string; icon: React.ReactNode } {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 12) return { text: '早上好，新的一天开始了', icon: <Sun className="size-5" /> }
  if (hour >= 12 && hour < 14) return { text: '中午好，记得午休', icon: <Coffee className="size-5" /> }
  if (hour >= 14 && hour < 18) return { text: '下午好，继续加油', icon: <Sun className="size-5" /> }
  if (hour >= 18 && hour < 22) return { text: '晚上好，今天辛苦了', icon: <Moon className="size-5" /> }
  return { text: '夜深了，早点休息吧', icon: <Moon className="size-5" /> }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const month = d.getMonth() + 1
  const day = d.getDate()
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  return `${month}月${day}日 周${weekDays[d.getDay()]}`
}

export default function DormitoryPage() {
  const router = useRouter()
  const [currentTime, setCurrentTime] = useState(formatTimeNow())
  const [sleepTime, setSleepTime] = useState(formatTimeNow())
  const [wakeTime, setWakeTime] = useState(formatTimeNow())
  const [todayState, setTodayState] = useState<TodayState>({
    status: 'idle',
    log: null,
    streak: 0,
  })
  const [history, setHistory] = useState<SleepLog[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // 规划和总结状态
  const [hasPlan, setHasPlan] = useState(false)
  const [hasReview, setHasReview] = useState(false)
  const [showPlanForm, setShowPlanForm] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [showSleepHistory, setShowSleepHistory] = useState(false)

  // 进度数据（白天展示用）
  const [progressData, setProgressData] = useState<{
    tasksCompleted: number
    tasksTotal: number
    focusMinutes: number
  } | null>(null)

  // 进入提示
  const [showEntryToast, setShowEntryToast] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [todayRes, historyRes, streakRes, planRes, tasksRes, reviewRes] = await Promise.all([
        fetch('/api/sleep/today'),
        fetch('/api/sleep/today?action=history'),
        fetch('/api/sleep/today?action=streak'),
        fetch('/api/plan/check'),
        fetch('/api/tasks'),
        fetch('/api/reviews?period=daily'),
      ])

      const todayData = await todayRes.json()
      const historyData = await historyRes.json()
      const streakData = await streakRes.json()

      let status: SleepStatus = 'idle'
      let log: SleepLog | null = todayData.log
      if (log) {
        status = log.wake_time && log.wake_time !== '' ? 'completed' : 'sleeping'
      }

      setTodayState({ status, log, streak: streakData.streak ?? 0 })
      setHistory(historyData.logs ?? [])

      if (planRes.ok) {
        const planData = await planRes.json()
        setHasPlan(planData.has_plan)
      }

      if (tasksRes.ok) {
        const tasksData = await tasksRes.json()
        const tasks = tasksData.tasks ?? []
        setProgressData({
          tasksCompleted: tasks.filter((t: { status: string }) => t.status === 'completed').length,
          tasksTotal: tasks.length,
          focusMinutes: tasksData.total_focus_minutes ?? 0,
        })
      }

      if (reviewRes.ok) {
        const reviewData = await reviewRes.json()
        setHasReview(reviewData.reviews && reviewData.reviews.length > 0)
      }
    } catch {
      toast.error('加载数据失败')
    } finally {
      setLoading(false)
      setShowEntryToast(true)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(formatTimeNow()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (showEntryToast) {
      const timer = setTimeout(() => setShowEntryToast(false), 1500)
      return () => clearTimeout(timer)
    }
  }, [showEntryToast])

  const handleSleepCheckin = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/sleep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sleep_time: sleepTime }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || '打卡失败'); return }
      toast.success('晚安！祝你做个好梦')
      setTodayState({ status: 'sleeping', log: data.log, streak: todayState.streak })
    } catch { toast.error('网络错误') }
    finally { setSubmitting(false) }
  }

  const handleWakeUp = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/sleep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'wakeup', wake_time: wakeTime }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || '打卡失败'); return }
      const points = data.log?.points_earned ?? 0
      toast.success(`早安！新的一天开始了 +${points}积分`)
      setTodayState({ status: 'completed', log: data.log, streak: todayState.streak })
      const historyRes = await fetch('/api/sleep/today?action=history')
      const historyData = await historyRes.json()
      setHistory(historyData.logs ?? [])
    } catch { toast.error('网络错误') }
    finally { setSubmitting(false) }
  }

  const handlePlanCreated = () => {
    setHasPlan(true)
    setShowPlanForm(false)
    toast.success('规划完成！可以出发去图书馆了')
  }

  const handleLeave = useCallback(() => { router.push('/campus') }, [router])

  const timeInfo = getTimeMessage(currentTime)
  const currentPoints = calculateSleepPoints(currentTime)
  const greeting = getGreeting()
  const phase = getTimePhase()

  // 决定核心区域显示什么
  // 优先级：未完成的事项 > 时间段默认
  const getCoreContent = () => {
    // 任何时间：如果没规划，显示规划
    if (!hasPlan && !showReviewForm && !showSleepHistory) {
      return 'plan'
    }
    // 任何时间：如果没总结且是晚上，显示总结
    if (!hasReview && phase === 'evening' && !showPlanForm && !showSleepHistory) {
      return 'review'
    }
    // 深夜：显示睡眠
    if (phase === 'night' && !showPlanForm && !showReviewForm && !showSleepHistory) {
      return 'sleep'
    }
    // 用户手动选择了
    if (showPlanForm) return 'plan'
    if (showReviewForm) return 'review'
    if (showSleepHistory) return 'sleep-history'
    // 白天默认：进度
    return 'progress'
  }

  const coreContent = getCoreContent()

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* 进入提示 */}
      {showEntryToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-scene-toast">
          <div className="px-4 py-2 rounded-full text-sm font-medium shadow-lg text-white" style={{ backgroundColor: 'var(--scene-dorm)' }}>
            已进入宿舍
          </div>
        </div>
      )}

      {/* 顶部氛围区 */}
      <div className="px-4 pt-12 pb-6" style={{ background: `linear-gradient(to bottom, var(--scene-dorm-bg), var(--bg-primary))` }}>
        <div className="flex items-center gap-3 mb-1">
          <span style={{ color: 'var(--scene-dorm)' }}>{greeting.icon}</span>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>宿舍</h1>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{greeting.text}</p>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--bg-card)' }}>
            <Clock className="size-4" style={{ color: 'var(--scene-dorm)' }} />
            <span className="font-mono font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{currentTime}</span>
          </div>
          {todayState.streak > 0 && (
            <div className="flex items-center gap-1 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--bg-card)' }}>
              <TrendingUp className="size-4" style={{ color: 'var(--scene-dorm)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{todayState.streak}天</span>
            </div>
          )}
        </div>
      </div>

      {/* 核心区域 — 根据状态自动变化 */}
      <div className="px-4 pb-4">
        {/* ====== 规划 ====== */}
        {coreContent === 'plan' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="size-4" style={{ color: 'var(--scene-dorm)' }} />
              <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>制定今日规划</h2>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              在宿舍规划好今天要做什么，然后去图书馆开始学习
            </p>
            <PlanForm onSuccess={handlePlanCreated} />
          </div>
        )}

        {/* ====== 今日进度（白天默认） ====== */}
        {coreContent === 'progress' && (
          <div className="space-y-4">
            <div className="rounded-xl p-5 text-center" style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow)' }}>
              <div className="text-4xl mb-3">📚</div>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>今日学习进度</p>
              {progressData && (
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--text-secondary)' }}>任务完成</span>
                    <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                      {progressData.tasksCompleted}/{progressData.tasksTotal}
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${progressData.tasksTotal > 0 ? (progressData.tasksCompleted / progressData.tasksTotal) * 100 : 0}%`,
                        backgroundColor: 'var(--scene-dorm)',
                      }}
                    />
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    专注 {progressData.focusMinutes} 分钟
                  </p>
                </div>
              )}
              <Button
                onClick={() => router.push('/campus')}
                className="mt-4"
                style={{ backgroundColor: 'var(--scene-dorm)', color: 'white' }}
              >
                去校园
              </Button>
            </div>

            {/* 休息区 */}
            <div className="rounded-xl p-5 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px dashed var(--border-color)' }}>
              <div className="text-3xl mb-2">☕</div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>学累了？</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>休息也是学习的一部分</p>
            </div>
          </div>
        )}

        {/* ====== 总结 ====== */}
        {coreContent === 'review' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <PenLine className="size-4" style={{ color: 'var(--scene-dorm)' }} />
              <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>今天过得怎么样？</h2>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              回顾一下今天的表现，记录学习心得
            </p>
            <StructuredReview period="daily" periodLabel="日总结" />
          </div>
        )}

        {/* ====== 睡眠打卡 ====== */}
        {coreContent === 'sleep' && (
          <div className="space-y-4">
            <div className="rounded-xl p-5 text-center" style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow)' }}>
              <div className="text-5xl mb-2">🌙</div>
              <div className="text-3xl font-mono font-bold" style={{ color: 'var(--scene-dorm)' }}>
                {currentTime}
              </div>
              <p
                className="text-sm font-medium px-3 py-1 rounded-full inline-block mt-2"
                style={{
                  backgroundColor: timeInfo.level === 'gold' ? 'color-mix(in srgb, var(--success) 15%, transparent)' : timeInfo.level === 'warning' ? 'color-mix(in srgb, var(--accent-color) 15%, transparent)' : 'color-mix(in srgb, var(--danger) 15%, transparent)',
                  color: timeInfo.level === 'gold' ? 'var(--success)' : timeInfo.level === 'warning' ? 'var(--accent-color)' : 'var(--danger)',
                }}
              >
                {timeInfo.text}
              </p>
            </div>

            {/* 积分规则 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Star className="size-4" style={{ color: 'var(--scene-dorm)' }} />
                  积分规则
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {[
                  { time: '22:30 前', points: 15 },
                  { time: '23:00 前', points: 8 },
                  { time: '23:00 后', points: 0 },
                ].map((rule) => (
                  <div
                    key={rule.time}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm"
                    style={{
                      backgroundColor: currentPoints === rule.points ? 'color-mix(in srgb, var(--scene-dorm) 10%, var(--bg-card))' : 'var(--bg-secondary)',
                      border: currentPoints === rule.points ? '1px solid color-mix(in srgb, var(--scene-dorm) 30%, transparent)' : '1px solid transparent',
                      fontWeight: currentPoints === rule.points ? 600 : 400,
                      color: currentPoints === rule.points ? 'var(--scene-dorm)' : 'var(--text-secondary)',
                    }}
                  >
                    <span>{rule.time}入睡</span>
                    <span className="font-bold">+{rule.points}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* 打卡区域 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Clock className="size-4" style={{ color: 'var(--scene-dorm)' }} />
                  {todayState.status === 'idle' ? '晚安打卡' : todayState.status === 'sleeping' ? '早安打卡' : '今日已完成'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {todayState.status === 'idle' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>入睡时间</label>
                      <input
                        type="time"
                        value={sleepTime}
                        onChange={(e) => setSleepTime(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <Button onClick={handleSleepCheckin} disabled={submitting} className="w-full" style={{ backgroundColor: 'var(--scene-dorm)', color: 'white' }}>
                      {submitting ? <Loader2 className="size-4 animate-spin" /> : '晚安打卡'}
                    </Button>
                  </div>
                )}

                {todayState.status === 'sleeping' && todayState.log && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <Moon className="size-4" style={{ color: 'var(--scene-dorm)' }} />
                      昨晚入睡：{todayState.log.sleep_time}
                    </div>
                    <div>
                      <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>起床时间</label>
                      <input
                        type="time"
                        value={wakeTime}
                        onChange={(e) => setWakeTime(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <Button onClick={handleWakeUp} disabled={submitting} className="w-full" style={{ backgroundColor: 'var(--scene-dorm)', color: 'white' }}>
                      {submitting ? <Loader2 className="size-4 animate-spin" /> : '早安打卡'}
                    </Button>
                  </div>
                )}

                {todayState.status === 'completed' && todayState.log && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span style={{ color: 'var(--text-muted)' }}>入睡</span>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{todayState.log.sleep_time}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span style={{ color: 'var(--text-muted)' }}>起床</span>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{todayState.log.wake_time}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span style={{ color: 'var(--text-muted)' }}>积分</span>
                      <span className="font-bold" style={{ color: 'var(--scene-dorm)' }}>+{todayState.log.points_earned}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ====== 睡眠历史 ====== */}
        {coreContent === 'sleep-history' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Moon className="size-4" style={{ color: 'var(--scene-dorm)' }} />
              <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>睡眠记录</h2>
            </div>
            {history.length > 0 ? (
              <Card>
                <CardContent className="pt-4 space-y-1.5">
                  {history.map((log) => (
                    <div key={log.id} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                      <div>
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatDate(log.log_date)}</span>
                        <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
                          {log.sleep_time}{log.wake_time && log.wake_time !== '' ? ` - ${log.wake_time}` : ''}
                        </span>
                      </div>
                      <span className="font-bold" style={{ color: log.points_earned >= 15 ? 'var(--success)' : log.points_earned >= 8 ? 'var(--accent-color)' : 'var(--text-muted)' }}>
                        +{log.points_earned}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>暂无记录</p>
            )}
          </div>
        )}
      </div>

      {/* 辅助区域 — 睡眠状态（始终可见） */}
      {todayState.log && (
        <div className="px-4 pb-3">
          <div
            className="flex items-center justify-between px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <span style={{ color: 'var(--text-muted)' }}>
              睡眠：{todayState.log.sleep_time}
              {todayState.log.wake_time && todayState.log.wake_time !== '' ? ` - ${todayState.log.wake_time}` : ''}
            </span>
            <span className="font-bold" style={{ color: 'var(--scene-dorm)' }}>+{todayState.log.points_earned}</span>
          </div>
        </div>
      )}

      {/* 快捷链接 — 不抢注意力，但随时可用 */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-center gap-4">
          {coreContent !== 'plan' && (
            <button
              onClick={() => { setShowPlanForm(true); setShowReviewForm(false); setShowSleepHistory(false) }}
              className="flex items-center gap-1 text-xs transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <ClipboardList className="size-3" />
              修改规划
            </button>
          )}
          {coreContent !== 'review' && (
            <button
              onClick={() => { setShowReviewForm(true); setShowPlanForm(false); setShowSleepHistory(false) }}
              className="flex items-center gap-1 text-xs transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <PenLine className="size-3" />
              写总结
            </button>
          )}
          {coreContent !== 'sleep-history' && coreContent !== 'sleep' && (
            <button
              onClick={() => { setShowSleepHistory(true); setShowPlanForm(false); setShowReviewForm(false) }}
              className="flex items-center gap-1 text-xs transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <Moon className="size-3" />
              睡眠记录
            </button>
          )}
          {coreContent !== 'progress' && hasPlan && (
            <button
              onClick={() => { setShowPlanForm(false); setShowReviewForm(false); setShowSleepHistory(false) }}
              className="flex items-center gap-1 text-xs transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <ChevronRight className="size-3" />
              返回
            </button>
          )}
        </div>
      </div>

      {/* 底部固定栏 */}
      <div className="fixed bottom-0 left-0 right-0 backdrop-blur-sm border-t px-4 py-3" style={{ backgroundColor: 'color-mix(in srgb, var(--bg-card) 80%, transparent)', borderColor: 'var(--border-color)' }}>
        <div className="mx-auto max-w-lg">
          <Button
            variant="outline"
            className="w-full"
            style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }}
            onClick={handleLeave}
          >
            离开宿舍
          </Button>
        </div>
      </div>
    </div>
  )
}
