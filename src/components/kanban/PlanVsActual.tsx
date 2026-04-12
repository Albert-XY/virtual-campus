'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

// ============================================================
// Types
// ============================================================
interface PlanVsActualProps {
  plannedMinutes: number
  actualMinutes: number
  deviationRate: number
  completionRate: number
  accuracyAvg: number
}

// ============================================================
// Helpers
// ============================================================
function getDeviationColor(rate: number): string {
  if (rate < 20) return 'var(--success)'
  if (rate <= 40) return 'var(--accent-color)'
  return 'var(--danger)'
}

function getCompletionColor(rate: number): string {
  if (rate > 80) return 'var(--success)'
  if (rate >= 40) return 'var(--accent-color)'
  return 'var(--danger)'
}

// ============================================================
// Component
// ============================================================
export default function PlanVsActual({
  plannedMinutes,
  actualMinutes,
  deviationRate,
  completionRate,
  accuracyAvg,
}: PlanVsActualProps) {
  const deviationColor = getDeviationColor(deviationRate)
  const completionColor = getCompletionColor(completionRate)

  return (
    <Card size="sm">
      <CardContent className="pt-3">
        <h3
          className="text-xs font-semibold mb-3"
          style={{ color: 'var(--text-secondary)' }}
        >
          计划 vs 实际
        </h3>

        {/* 指标网格 */}
        <div className="grid grid-cols-2 gap-3">
          {/* 规划时长 */}
          <div className="space-y-1">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              规划时长
            </span>
            <div className="flex items-baseline gap-0.5">
              <span
                className="text-lg font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                {plannedMinutes}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                min
              </span>
            </div>
          </div>

          {/* 实际时长 */}
          <div className="space-y-1">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              实际时长
            </span>
            <div className="flex items-baseline gap-0.5">
              <span
                className="text-lg font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                {actualMinutes}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                min
              </span>
            </div>
          </div>

          {/* 偏差率 */}
          <div className="space-y-1">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              偏差率
            </span>
            <div className="flex items-baseline gap-0.5">
              <span
                className="text-lg font-bold"
                style={{ color: deviationColor }}
              >
                {deviationRate.toFixed(1)}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                %
              </span>
            </div>
          </div>

          {/* 完成率 */}
          <div className="space-y-1">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              完成率
            </span>
            <div className="flex items-baseline gap-0.5">
              <span
                className="text-lg font-bold"
                style={{ color: completionColor }}
              >
                {completionRate.toFixed(1)}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                %
              </span>
            </div>
          </div>
        </div>

        {/* 完成率进度条 */}
        <div className="mt-3">
          <Progress value={completionRate}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${completionRate}%`,
                backgroundColor: completionColor,
              }}
            />
          </Progress>
        </div>

        {/* 平均正确率 */}
        {accuracyAvg > 0 && (
          <div className="mt-2.5 flex items-center justify-between text-xs">
            <span style={{ color: 'var(--text-secondary)' }}>平均正确率</span>
            <span
              className="font-medium"
              style={{ color: 'var(--accent-color)' }}
            >
              {accuracyAvg.toFixed(1)}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
