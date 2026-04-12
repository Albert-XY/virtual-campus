'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Lightbulb, Clock, TrendingUp, Flame } from 'lucide-react'

// ============================================================
// Types
// ============================================================
interface Nudge {
  id: string
  icon: React.ReactNode
  text: string
  type: 'info' | 'warning' | 'celebration'
}

interface ContextNudgeProps {
  hasPlan: boolean
  activeScene: { scene: string; started_at: string } | null
  hasDailyReview: boolean
  streakDays: number
  deviationRate: number
  todayPoints: number
}

// ============================================================
// 计算提示
// ============================================================
function computeNudges(props: ContextNudgeProps): Nudge[] {
  const nudges: Nudge[] = []
  const hour = new Date().getHours()
  const now = Date.now()

  // 上午9点后没规划
  if (!props.hasPlan && hour >= 9 && hour < 12) {
    nudges.push({
      id: 'morning-plan',
      icon: <Lightbulb className="size-4" />,
      text: '已经9点了，花1分钟规划一下今天吧',
      type: 'info',
    })
  }

  // 连续学习超过2小时（检查活跃场景的 started_at）
  if (props.activeScene) {
    const startedAt = new Date(props.activeScene.started_at).getTime()
    const elapsedMinutes = (now - startedAt) / 60000
    if (elapsedMinutes >= 120) {
      nudges.push({
        id: 'rest-reminder',
        icon: <Clock className="size-4" />,
        text: `已经专注 ${Math.floor(elapsedMinutes / 60)} 小时了，起来活动一下吧`,
        type: 'warning',
      })
    }
  }

  // 晚上10点没写总结
  if (props.hasPlan && !props.hasDailyReview && hour >= 22) {
    nudges.push({
      id: 'evening-review',
      icon: <Lightbulb className="size-4" />,
      text: '今天还没总结，花几分钟回顾一下吧',
      type: 'info',
    })
  }

  // 连续规划里程碑
  if (props.streakDays === 7) {
    nudges.push({
      id: 'streak-7',
      icon: <Flame className="size-4" />,
      text: '连续规划一周了！保持这个节奏',
      type: 'celebration',
    })
  } else if (props.streakDays === 30) {
    nudges.push({
      id: 'streak-30',
      icon: <Flame className="size-4" />,
      text: '连续规划一个月！你太厉害了',
      type: 'celebration',
    })
  } else if (props.streakDays > 0 && props.streakDays % 7 === 0) {
    nudges.push({
      id: `streak-${props.streakDays}`,
      icon: <Flame className="size-4" />,
      text: `连续规划 ${props.streakDays} 天！`,
      type: 'celebration',
    })
  }

  // 偏差率偏高提醒（只在有实际数据时）
  if (props.deviationRate > 30 && props.deviationRate < 100) {
    nudges.push({
      id: 'high-deviation',
      icon: <TrendingUp className="size-4" />,
      text: '最近规划的时间不太够用，考虑适当增加预估时长？',
      type: 'warning',
    })
  }

  return nudges
}

// ============================================================
// Component
// ============================================================
export default function ContextNudge(props: ContextNudgeProps) {
  const [nudges, setNudges] = useState<Nudge[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const updateNudges = useCallback(() => {
    const computed = computeNudges(props)
    setNudges(computed.filter((n) => !dismissed.has(n.id)))
  }, [props, dismissed])

  useEffect(() => {
    updateNudges()
  }, [updateNudges])

  // 每5分钟重新计算一次
  useEffect(() => {
    const interval = setInterval(updateNudges, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [updateNudges])

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id))
    setNudges((prev) => prev.filter((n) => n.id !== id))
  }

  if (nudges.length === 0) return null

  // 只显示第一条
  const nudge = nudges[0]

  const colorMap = {
    info: {
      bg: 'var(--accent-light, rgba(99,102,241,0.08))',
      border: 'var(--accent-color, #6366F1)',
      text: 'var(--accent-color, #6366F1)',
    },
    warning: {
      bg: 'rgba(245,158,11,0.08)',
      border: '#F59E0B',
      text: '#D97706',
    },
    celebration: {
      bg: 'var(--success-light, rgba(34,197,94,0.08))',
      border: 'var(--success, #22C55E)',
      text: 'var(--success, #22C55E)',
    },
  }

  const colors = colorMap[nudge.type]

  return (
    <div
      className="flex items-start gap-2.5 px-3.5 py-2.5"
      style={{
        borderRadius: 'var(--radius-sm, 8px)',
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}30`,
      }}
    >
      <div style={{ color: colors.text, marginTop: '2px' }}>
        {nudge.icon}
      </div>
      <p className="flex-1 text-xs leading-relaxed" style={{ color: 'var(--text-secondary, #6b7280)' }}>
        {nudge.text}
      </p>
      <button
        onClick={() => handleDismiss(nudge.id)}
        className="shrink-0 mt-0.5 opacity-40 hover:opacity-70 transition-opacity"
        style={{ color: 'var(--text-secondary, #6b7280)' }}
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}
