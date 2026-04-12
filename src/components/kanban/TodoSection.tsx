'use client'

import Link from 'next/link'
import { ChevronRight, CheckCircle2, Flame } from 'lucide-react'

// ============================================================
// Types
// ============================================================
interface TodoSectionProps {
  hasDailyReview: boolean
  hasSleepLog: boolean
  streakDays: number
}

// ============================================================
// Component
// ============================================================
export default function TodoSection({
  hasDailyReview,
  hasSleepLog,
  streakDays,
}: TodoSectionProps) {
  return (
    <div className="space-y-2">
      {/* 标题 */}
      <h3
        className="text-sm font-semibold"
        style={{ color: 'var(--text-primary)' }}
      >
        待办事项
      </h3>

      {/* 待办列表 */}
      <div className="space-y-0">
        {/* 日总结 */}
        <div
          className="flex items-center justify-between px-3 py-2.5"
          style={{
            borderTop: '1px solid var(--border-color)',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div className="flex items-center gap-2">
            {hasDailyReview ? (
              <CheckCircle2 className="size-4" style={{ color: 'var(--success)' }} />
            ) : (
              <span
                className="size-4 rounded-full border-2"
                style={{ borderColor: 'var(--border-color)' }}
              />
            )}
            <span
              className="text-sm"
              style={{
                color: hasDailyReview ? 'var(--text-secondary)' : 'var(--text-primary)',
                textDecoration: hasDailyReview ? 'line-through' : 'none',
              }}
            >
              日总结
            </span>
          </div>
          {hasDailyReview ? (
            <span className="text-xs" style={{ color: 'var(--success)' }}>
              已完成
            </span>
          ) : (
            <Link
              href="/review/daily"
              className="flex items-center gap-0.5 text-xs font-medium px-2.5 py-1 transition-colors"
              style={{
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--accent-color)',
                color: '#fff',
              }}
            >
              去总结
              <ChevronRight className="size-3" />
            </Link>
          )}
        </div>

        {/* 睡眠打卡 */}
        <div
          className="flex items-center justify-between px-3 py-2.5"
          style={{
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div className="flex items-center gap-2">
            {hasSleepLog ? (
              <CheckCircle2 className="size-4" style={{ color: 'var(--success)' }} />
            ) : (
              <span
                className="size-4 rounded-full border-2"
                style={{ borderColor: 'var(--border-color)' }}
              />
            )}
            <span
              className="text-sm"
              style={{
                color: hasSleepLog ? 'var(--text-secondary)' : 'var(--text-primary)',
                textDecoration: hasSleepLog ? 'line-through' : 'none',
              }}
            >
              睡眠打卡
            </span>
          </div>
          {hasSleepLog ? (
            <span className="text-xs" style={{ color: 'var(--success)' }}>
              已完成
            </span>
          ) : (
            <Link
              href="/campus/dormitory"
              className="flex items-center gap-0.5 text-xs font-medium px-2.5 py-1 transition-colors"
              style={{
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--accent-color)',
                color: '#fff',
              }}
            >
              去打卡
              <ChevronRight className="size-3" />
            </Link>
          )}
        </div>
      </div>

      {/* 连续规划天数 */}
      {streakDays > 0 && (
        <div
          className="flex items-center justify-center gap-1.5 pt-1"
          style={{ color: 'var(--accent-color)' }}
        >
          <Flame className="size-3.5" />
          <span className="text-xs font-medium">
            连续规划 {streakDays} 天
          </span>
        </div>
      )}
    </div>
  )
}
