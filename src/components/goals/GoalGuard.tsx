'use client'

import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

// ============================================================
// Types
// ============================================================
interface GoalGuardProps {
  /** What the user is trying to do */
  action: 'create_weekly' | 'create_daily_plan' | 'start_learning'
  /** Whether the user has a monthly goal */
  hasMonthlyGoal: boolean
  /** Whether the user has a weekly goal */
  hasWeeklyGoal: boolean
  /** Whether the user has a daily plan */
  hasDailyPlan: boolean
  /** Children to render if prerequisites are met (or strict=false) */
  children: React.ReactNode
  /** If strict=true, ONLY show the warning (block the action). Default: false */
  strict?: boolean
}

// ============================================================
// Helpers
// ============================================================
interface GuardConfig {
  missing: boolean
  message: string
  href: string
  linkText: string
}

function getGuardConfig(props: Omit<GoalGuardProps, 'children' | 'strict'>): GuardConfig | null {
  switch (props.action) {
    case 'create_weekly':
      if (!props.hasMonthlyGoal) {
        return {
          missing: true,
          message: '建议先设置月目标，这样周目标才有方向',
          href: '/goals',
          linkText: '去设置',
        }
      }
      return null

    case 'create_daily_plan':
      if (!props.hasWeeklyGoal && !props.hasMonthlyGoal) {
        return {
          missing: true,
          message: '建议先设置学习目标，这样日计划才有依据',
          href: '/goals',
          linkText: '去设置',
        }
      }
      return null

    case 'start_learning':
      if (!props.hasDailyPlan) {
        return {
          missing: true,
          message: '今天还没有规划，先花1分钟规划一下',
          href: '/',
          linkText: '去规划',
        }
      }
      return null

    default:
      return null
  }
}

// ============================================================
// Component
// ============================================================
export default function GoalGuard({
  strict = false,
  children,
  action,
  hasMonthlyGoal,
  hasWeeklyGoal,
  hasDailyPlan,
}: GoalGuardProps) {
  const config = getGuardConfig({ action, hasMonthlyGoal, hasWeeklyGoal, hasDailyPlan })

  // Prerequisites met - render children only
  if (!config) {
    return <>{children}</>
  }

  // Prerequisites not met
  return (
    <div className="space-y-3">
      {/* Warning banner */}
      <div
        className="flex items-start gap-3 p-4"
        style={{
          borderRadius: 'var(--radius-md, 8px)',
          border: '1px solid color-mix(in srgb, var(--warning, #F59E0B) 30%, transparent)',
          backgroundColor: 'color-mix(in srgb, var(--warning, #F59E0B) 8%, var(--bg-card, white))',
        }}
      >
        <AlertTriangle
          className="mt-0.5 size-5 shrink-0"
          style={{ color: 'var(--warning, #F59E0B)' }}
        />
        <div className="flex-1 min-w-0">
          <p
            className="text-sm"
            style={{ color: 'var(--text-primary)' }}
          >
            {config.message}
          </p>
          <Link
            href={config.href}
            className="mt-2 inline-flex items-center text-sm font-medium transition-opacity hover:opacity-80"
            style={{ color: 'var(--warning, #F59E0B)' }}
          >
            {config.linkText} &rarr;
          </Link>
        </div>
      </div>

      {/* If not strict, also render children below the warning */}
      {!strict && children}
    </div>
  )
}
