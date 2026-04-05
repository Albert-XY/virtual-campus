'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Moon, Star, Clock, TrendingUp, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { SleepLog } from '@/types'
import { calculateSleepPoints } from '@/lib/points'

type SleepStatus = 'idle' | 'sleeping' | 'completed'

interface TodayState {
  status: SleepStatus
  log: SleepLog | null
  streak: number
}

function formatTimeNow(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function getTimeMessage(time: string): { text: string; level: 'gold' | 'warning' | 'late' } {
  const [h, m] = time.split(':').map(Number)
  const minutes = h * 60 + m
  if (minutes <= 22 * 60 + 30) return { text: '现在是早睡黄金时间！', level: 'gold' }
  if (minutes <= 23 * 60) return { text: '还可以赶上早睡打卡', level: 'warning' }
  return { text: '今天已经过了早睡打卡时间', level: 'late' }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const month = d.getMonth() + 1
  const day = d.getDate()
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  return `${month}月${day}日 周${weekDays[d.getDay()]}`
}

export default function DormitoryPage() {
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

  const fetchData = useCallback(async () => {
    try {
      const [todayRes, historyRes, streakRes] = await Promise.all([
        fetch('/api/sleep/today'),
        fetch('/api/sleep/today?action=history'),
        fetch('/api/sleep/today?action=streak'),
      ])

      const todayData = await todayRes.json()
      const historyData = await historyRes.json()
      const streakData = await streakRes.json()

      let status: SleepStatus = 'idle'
      let log: SleepLog | null = todayData.log

      if (log) {
        if (log.wake_time && log.wake_time !== '') {
          status = 'completed'
        } else {
          status = 'sleeping'
        }
      }

      setTodayState({
        status,
        log,
        streak: streakData.streak ?? 0,
      })
      setHistory(historyData.logs ?? [])
    } catch {
      toast.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(formatTimeNow())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleSleepCheckin = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/sleep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sleep_time: sleepTime }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || '打卡失败')
        return
      }

      toast.success('晚安！祝你做个好梦')
      setTodayState({ status: 'sleeping', log: data.log, streak: todayState.streak })
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setSubmitting(false)
    }
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

      if (!res.ok) {
        toast.error(data.error || '打卡失败')
        return
      }

      const points = data.log?.points_earned ?? 0
      toast.success(`早安！新的一天开始了 +${points}积分`)
      setTodayState({ status: 'completed', log: data.log, streak: todayState.streak })
      // 刷新历史
      const historyRes = await fetch('/api/sleep/today?action=history')
      const historyData = await historyRes.json()
      setHistory(historyData.logs ?? [])
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const timeInfo = getTimeMessage(currentTime)
  const currentPoints = calculateSleepPoints(currentTime)

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-4 space-y-6">
      {/* 顶部栏 */}
      <div className="flex items-center gap-3">
        <Link href="/campus">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="size-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold">🌙 宿舍</h1>
      </div>

      {/* 状态展示区 */}
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="text-6xl">🌙</div>
        <div className="text-2xl font-mono font-bold text-[#7C3AED]">
          {currentTime}
        </div>
        <p
          className={`text-sm font-medium px-3 py-1 rounded-full ${
            timeInfo.level === 'gold'
              ? 'bg-green-100 text-green-700'
              : timeInfo.level === 'warning'
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-red-100 text-red-600'
          }`}
        >
          {timeInfo.text}
        </p>
        {todayState.streak > 0 && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <TrendingUp className="size-4 text-[#7C3AED]" />
            连续早睡 {todayState.streak} 天
          </div>
        )}
      </div>

      {/* 积分规则卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Star className="size-4 text-[#7C3AED]" />
            积分规则
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                currentPoints === 15
                  ? 'bg-[#7C3AED]/10 border border-[#7C3AED]/30 font-semibold text-[#7C3AED]'
                  : 'bg-muted'
              }`}
            >
              <span>22:30 前入睡</span>
              <span className="font-bold">+15 积分</span>
            </div>
            <div
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                currentPoints === 8
                  ? 'bg-[#7C3AED]/10 border border-[#7C3AED]/30 font-semibold text-[#7C3AED]'
                  : 'bg-muted'
              }`}
            >
              <span>23:00 前入睡</span>
              <span className="font-bold">+8 积分</span>
            </div>
            <div
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                currentPoints === 0
                  ? 'bg-[#7C3AED]/10 border border-[#7C3AED]/30 font-semibold text-[#7C3AED]'
                  : 'bg-muted'
              }`}
            >
              <span>23:00 后入睡</span>
              <span className="font-bold">+0 积分</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 打卡区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="size-4 text-[#7C3AED]" />
            {todayState.status === 'idle'
              ? '晚安打卡'
              : todayState.status === 'sleeping'
              ? '早安打卡'
              : '今日已完成打卡'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayState.status === 'idle' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">
                  入睡时间
                </label>
                <input
                  type="time"
                  value={sleepTime}
                  onChange={(e) => setSleepTime(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2"
                />
              </div>
              <Button
                onClick={handleSleepCheckin}
                disabled={submitting}
                className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    打卡中...
                  </>
                ) : (
                  '晚安打卡'
                )}
              </Button>
            </div>
          )}

          {todayState.status === 'sleeping' && todayState.log && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Moon className="size-4 text-[#7C3AED]" />
                昨晚入睡时间：{todayState.log.sleep_time}
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">
                  起床时间
                </label>
                <input
                  type="time"
                  value={wakeTime}
                  onChange={(e) => setWakeTime(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2"
                />
              </div>
              <Button
                onClick={handleWakeUp}
                disabled={submitting}
                className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    打卡中...
                  </>
                ) : (
                  '早安打卡'
                )}
              </Button>
            </div>
          )}

          {todayState.status === 'completed' && todayState.log && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">入睡时间</span>
                <span className="font-medium">{todayState.log.sleep_time}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">起床时间</span>
                <span className="font-medium">{todayState.log.wake_time}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">获得积分</span>
                <span className="font-bold text-[#7C3AED]">
                  +{todayState.log.points_earned} 积分
                </span>
              </div>
              <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-center text-sm text-green-700 font-medium">
                今日已完成打卡
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 历史记录区 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">最近 7 天记录</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              暂无睡眠记录
            </p>
          ) : (
            <div className="space-y-2">
              {history.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5 text-sm"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{formatDate(log.log_date)}</span>
                    <span className="text-xs text-muted-foreground">
                      {log.sleep_time}
                      {log.wake_time && log.wake_time !== '' ? ` - ${log.wake_time}` : ' (未起床)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="size-3.5 text-yellow-500" />
                    <span
                      className={`font-bold ${
                        log.points_earned >= 15
                          ? 'text-green-600'
                          : log.points_earned >= 8
                          ? 'text-yellow-600'
                          : 'text-muted-foreground'
                      }`}
                    >
                      +{log.points_earned}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
