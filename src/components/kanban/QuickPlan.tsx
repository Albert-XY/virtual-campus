'use client'

import Link from 'next/link'
import { Zap, ClipboardList, Copy, Loader2 } from 'lucide-react'

// ============================================================
// Types
// ============================================================
interface QuickPlanProps {
  hasYesterdayPlan: boolean
  onQuickPlan: () => void
  onCopyYesterday: () => void
  quickPlanning: boolean
  copying: boolean
}

// ============================================================
// Component
// ============================================================
export default function QuickPlan({
  hasYesterdayPlan,
  onQuickPlan,
  onCopyYesterday,
  quickPlanning,
  copying,
}: QuickPlanProps) {
  return (
    <div className="space-y-4">
      {/* Hero 卡片 */}
      <div
        className="p-6 text-white transition-all duration-300"
        style={{
          borderRadius: 'var(--radius-lg)',
          background: `linear-gradient(135deg, var(--hero-gradient-from) 0%, var(--hero-gradient-via) 50%, var(--hero-gradient-to) 100%)`,
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex size-12 shrink-0 items-center justify-center"
            style={{
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.2)',
            }}
          >
            <ClipboardList className="size-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold">
              新的一天，先规划一下今天吧！
            </h3>
            <p
              className="mt-1 text-sm"
              style={{ color: 'var(--hero-subtext)' }}
            >
              完成规划后即可进入虚拟校园开始学习
            </p>
          </div>
        </div>
      </div>

      {/* 快速规划 + 详细规划 */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onQuickPlan}
          disabled={quickPlanning}
          className="flex flex-col items-center gap-2 p-4 transition-all active:scale-[0.97] disabled:opacity-50"
          style={{
            borderRadius: 'var(--radius-md)',
            border: '2px solid color-mix(in srgb, var(--accent-color) 20%, transparent)',
            backgroundColor: 'color-mix(in srgb, var(--accent-color) 5%, transparent)',
          }}
        >
          {quickPlanning ? (
            <Loader2
              className="size-6 animate-spin"
              style={{ color: 'var(--accent-color)' }}
            />
          ) : (
            <Zap
              className="size-6"
              style={{ color: 'var(--accent-color)' }}
            />
          )}
          <span
            className="text-sm font-semibold"
            style={{ color: 'var(--accent-color)' }}
          >
            快速规划
          </span>
          <span
            className="text-xs text-center"
            style={{ color: 'var(--text-secondary)' }}
          >
            使用默认模板一键创建
          </span>
        </button>

        <Link
          href="/dashboard"
          className="flex flex-col items-center gap-2 p-4 transition-all active:scale-[0.97]"
          style={{
            borderRadius: 'var(--radius-md)',
            border: '2px solid color-mix(in srgb, var(--success) 20%, transparent)',
            backgroundColor: 'color-mix(in srgb, var(--success) 5%, transparent)',
          }}
        >
          <ClipboardList
            className="size-6"
            style={{ color: 'var(--success)' }}
          />
          <span
            className="text-sm font-semibold"
            style={{ color: 'var(--success)' }}
          >
            详细规划
          </span>
          <span
            className="text-xs text-center"
            style={{ color: 'var(--text-secondary)' }}
          >
            自定义学习区间和任务
          </span>
        </Link>
      </div>

      {/* 复制昨天的规划 */}
      {hasYesterdayPlan && (
        <button
          onClick={onCopyYesterday}
          disabled={copying}
          className="flex w-full items-center justify-center gap-2 p-3 text-sm transition-colors disabled:opacity-50"
          style={{
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-color)',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-secondary)',
          }}
        >
          {copying ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Copy className="size-4" />
          )}
          复制昨天的规划
        </button>
      )}
    </div>
  )
}
