'use client'

import { AlertTriangle, CheckCircle2, Calendar } from 'lucide-react'

interface GoalProgressCardProps {
  goal: {
    id: string
    period: 'monthly' | 'weekly'
    title: string
    total_units: number
    completed_units: number
    target_date: string | null
    start_date: string
    status: string
  }
  pace?: number // units per day needed
  onTrack?: boolean
  onClick?: () => void
}

export default function GoalProgressCard({
  goal,
  pace,
  onTrack,
  onClick,
}: GoalProgressCardProps) {
  const percentage =
    goal.total_units > 0
      ? Math.round((goal.completed_units / goal.total_units) * 100)
      : 0

  const isMonthly = goal.period === 'monthly'
  const periodLabel = isMonthly ? '月目标' : '周目标'
  const periodColor = isMonthly
    ? 'var(--accent-color)'
    : 'var(--scene-library)'

  const formatTargetDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left transition-all active:scale-[0.98]"
      style={{
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-card)',
        boxShadow: 'var(--shadow)',
      }}
    >
      <div className="p-3 space-y-2">
        {/* Top row: period badge + status */}
        <div className="flex items-center justify-between">
          <span
            className="text-xs font-medium px-2 py-0.5"
            style={{
              borderRadius: '9999px',
              backgroundColor: `${periodColor}15`,
              color: periodColor,
            }}
          >
            {periodLabel}
          </span>
          {onTrack === true && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--success)' }}>
              <CheckCircle2 className="size-3" />
              进度正常
            </span>
          )}
          {onTrack === false && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--danger)' }}>
              <AlertTriangle className="size-3" />
              进度落后
            </span>
          )}
        </div>

        {/* Title */}
        <p
          className="text-sm font-medium truncate"
          style={{ color: 'var(--text-primary)' }}
        >
          {goal.title}
        </p>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: 'var(--text-secondary)' }}>
              {goal.completed_units}/{goal.total_units}
            </span>
            <span style={{ color: 'var(--text-muted)' }}>{percentage}%</span>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden"
            style={{
              borderRadius: '9999px',
              backgroundColor: 'var(--border-light, var(--muted))',
            }}
          >
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${Math.min(percentage, 100)}%`,
                borderRadius: '9999px',
                backgroundColor:
                  goal.status === 'completed'
                    ? 'var(--success)'
                    : onTrack === false
                      ? 'var(--danger)'
                      : 'var(--accent-color)',
              }}
            />
          </div>
        </div>

        {/* Bottom info row */}
        <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
          {pace != null && pace > 0 && (
            <span>还需每天 {pace} 单位</span>
          )}
          {goal.target_date && (
            <span className="flex items-center gap-1">
              <Calendar className="size-3" />
              截止 {formatTargetDate(goal.target_date)}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
