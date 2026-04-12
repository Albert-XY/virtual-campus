'use client'

import { Flame, Clock, TrendingUp, Target } from 'lucide-react'

// ============================================================
// Types
// ============================================================
interface MilestoneBarProps {
  streakDays: number
  todayPoints: number
  completionRate: number
  deviationRate: number
}

// ============================================================
// Component
// ============================================================
export default function MilestoneBar({
  streakDays,
  todayPoints,
  completionRate,
  deviationRate,
}: MilestoneBarProps) {
  // 只有有数据时才显示
  const hasData = streakDays > 0 || todayPoints > 0 || completionRate > 0

  if (!hasData) return null

  // 偏差率评价
  const deviationLabel =
    deviationRate <= 20 ? '精准' : deviationRate <= 40 ? '尚可' : deviationRate < 100 ? '偏高' : '--'

  const deviationColor =
    deviationRate <= 20
      ? 'var(--success, #22C55E)'
      : deviationRate <= 40
        ? 'var(--accent-color, #6366F1)'
        : 'var(--danger, #EF4444)'

  return (
    <div
      className="flex items-center justify-between px-4 py-2.5"
      style={{
        borderRadius: 'var(--radius-sm, 8px)',
        backgroundColor: 'var(--bg-secondary, rgba(0,0,0,0.02))',
        border: '1px solid var(--border-color, #e5e7eb)',
      }}
    >
      {/* 连续天数 */}
      {streakDays > 0 && (
        <div className="flex items-center gap-1.5">
          <Flame className="size-3.5" style={{ color: streakDays >= 7 ? 'var(--accent-color, #6366F1)' : 'var(--text-muted, #9ca3af)' }} />
          <span className="text-xs" style={{ color: 'var(--text-secondary, #6b7280)' }}>
            连续 <strong style={{ color: 'var(--text-primary, #111827)' }}>{streakDays}</strong> 天
          </span>
        </div>
      )}

      {/* 今日积分 */}
      {todayPoints > 0 && (
        <div className="flex items-center gap-1.5">
          <Target className="size-3.5" style={{ color: 'var(--points-color, #F59E0B)' }} />
          <span className="text-xs" style={{ color: 'var(--text-secondary, #6b7280)' }}>
            今日 <strong style={{ color: 'var(--text-primary, #111827)' }}>{todayPoints}</strong> 分
          </span>
        </div>
      )}

      {/* 完成率 */}
      {completionRate > 0 && (
        <div className="flex items-center gap-1.5">
          <Clock className="size-3.5" style={{ color: completionRate >= 80 ? 'var(--success, #22C55E)' : 'var(--text-muted, #9ca3af)' }} />
          <span className="text-xs" style={{ color: 'var(--text-secondary, #6b7280)' }}>
            完成 <strong style={{ color: 'var(--text-primary, #111827)' }}>{completionRate}%</strong>
          </span>
        </div>
      )}

      {/* 偏差率 */}
      {deviationRate > 0 && deviationRate < 100 && (
        <div className="flex items-center gap-1.5">
          <TrendingUp className="size-3.5" style={{ color: deviationColor }} />
          <span className="text-xs" style={{ color: 'var(--text-secondary, #6b7280)' }}>
            偏差 <strong style={{ color: deviationColor }}>{deviationLabel}</strong>
          </span>
        </div>
      )}
    </div>
  )
}
