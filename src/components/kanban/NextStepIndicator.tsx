'use client'

import Link from 'next/link'
import {
  ClipboardList,
  Play,
  CheckCircle2,
  PenLine,
  Moon,
  Sparkles,
  ArrowRight,
} from 'lucide-react'

// ============================================================
// Types
// ============================================================
export interface NextStep {
  id: string
  icon: React.ReactNode
  text: string
  subtext?: string
  action?: 'quick_plan' | 'open_scene' | 'link'
  actionLabel?: string
  actionHref?: string
  priority: 'high' | 'normal' | 'done'
}

interface NextStepIndicatorProps {
  hasPlan: boolean
  tasks: Array<{ status: string }>
  activeScene: { scene: string; scene_name: string } | null
  hasDailyReview: boolean
  hasSleepLog: boolean
  streakDays: number
  onQuickPlan: () => void
  onOpenScene: () => void
}

// ============================================================
// 计算下一步
// ============================================================
function computeNextStep(props: NextStepIndicatorProps): NextStep {
  const { hasPlan, tasks, activeScene, hasDailyReview, hasSleepLog, streakDays } = props
  const hour = new Date().getHours()

  // 没有规划
  if (!hasPlan) {
    if (hour >= 9) {
      return {
        id: 'plan-urgent',
        icon: <ClipboardList className="size-5" />,
        text: '新的一天开始了，先规划一下今天吧',
        subtext: streakDays > 0 ? `已连续规划 ${streakDays} 天，继续保持` : undefined,
        action: 'quick_plan',
        actionLabel: '快速规划',
        priority: 'high',
      }
    }
    return {
      id: 'plan-morning',
      icon: <ClipboardList className="size-5" />,
      text: '新的一天，准备好了吗',
      subtext: '花1分钟规划今天的学习',
      action: 'quick_plan',
      actionLabel: '开始规划',
      priority: 'normal',
    }
  }

  // 有规划，计算任务状态
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => t.status === 'completed').length
  const pendingTasks = tasks.filter((t) => t.status === 'pending').length
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length

  // 有规划，没进入场景，有待完成任务
  if (!activeScene && (pendingTasks > 0 || inProgressTasks > 0)) {
    return {
      id: 'start-scene',
      icon: <Play className="size-5" />,
      text: '开始今天的第一个任务吧',
      subtext: `今日进度 ${completedTasks}/${totalTasks}`,
      action: 'open_scene',
      actionLabel: '进入学习',
      priority: 'high',
    }
  }

  // 在场景中，有未完成任务
  if (activeScene && completedTasks < totalTasks) {
    return {
      id: 'continue-tasks',
      icon: <Play className="size-5" />,
      text: `正在${activeScene.scene_name}中，继续完成今日任务`,
      subtext: `进度 ${completedTasks}/${totalTasks}`,
      priority: 'normal',
    }
  }

  // 所有任务完成，没写总结
  if (completedTasks === totalTasks && totalTasks > 0 && !hasDailyReview) {
    return {
      id: 'write-review',
      icon: <PenLine className="size-5" />,
      text: '任务都完成了，花几分钟回顾一下',
      subtext: '总结帮助你看清自己的学习模式',
      action: 'link',
      actionLabel: '去总结',
      actionHref: '/review/daily',
      priority: 'high',
    }
  }

  // 总结写完，没打卡睡眠
  if (hasDailyReview && !hasSleepLog) {
    if (hour >= 21) {
      return {
        id: 'sleep-urgent',
        icon: <Moon className="size-5" />,
        text: '今天辛苦了，早点休息吧',
        subtext: '记录睡眠时间，养成规律作息',
        action: 'link',
        actionLabel: '去打卡',
        actionHref: '/campus/dormitory',
        priority: 'high',
      }
    }
    return {
      id: 'sleep-normal',
      icon: <Moon className="size-5" />,
      text: '今日目标已达成 ✓',
      subtext: '晚上别忘了睡眠打卡',
      action: 'link',
      actionLabel: '睡眠打卡',
      actionHref: '/campus/dormitory',
      priority: 'normal',
    }
  }

  // 全部完成
  return {
    id: 'all-done',
    icon: <Sparkles className="size-5" />,
    text: '今日目标已全部达成',
    subtext: streakDays > 1 ? `连续规划 ${streakDays} 天，太棒了` : '好好休息，明天继续',
    priority: 'done',
  }
}

// ============================================================
// Component
// ============================================================
export default function NextStepIndicator(props: NextStepIndicatorProps) {
  const step = computeNextStep(props)

  const handleAction = () => {
    if (step.action === 'quick_plan') {
      props.onQuickPlan()
    } else if (step.action === 'open_scene') {
      props.onOpenScene()
    }
  }

  const isHigh = step.priority === 'high'
  const isDone = step.priority === 'done'

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 transition-all"
      style={{
        borderRadius: 'var(--radius-md, 12px)',
        backgroundColor: isDone
          ? 'var(--success-light, rgba(34,197,94,0.08))'
          : isHigh
            ? 'var(--accent-light, rgba(99,102,241,0.08))'
            : 'var(--bg-secondary, rgba(0,0,0,0.02))',
        border: `1px solid ${
          isDone
            ? 'var(--success, #22C55E)'
            : isHigh
              ? 'var(--accent-color, #6366F1)'
              : 'var(--border-color, #e5e7eb)'
        }`,
        opacity: isDone ? 0.8 : 1,
      }}
    >
      {/* Icon */}
      <div
        className="flex size-10 shrink-0 items-center justify-center"
        style={{
          borderRadius: '50%',
          backgroundColor: isDone
            ? 'var(--success-light, rgba(34,197,94,0.15))'
            : isHigh
              ? 'var(--accent-light, rgba(99,102,241,0.15))'
              : 'var(--bg-secondary, rgba(0,0,0,0.04))',
          color: isDone
            ? 'var(--success, #22C55E)'
            : isHigh
              ? 'var(--accent-color, #6366F1)'
              : 'var(--text-secondary, #6b7280)',
        }}
      >
        {step.icon}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium"
          style={{
            color: isDone
              ? 'var(--success, #22C55E)'
              : 'var(--text-primary, #111827)',
          }}
        >
          {step.text}
        </p>
        {step.subtext && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary, #6b7280)' }}>
            {step.subtext}
          </p>
        )}
      </div>

      {/* Action button */}
      {step.action && step.actionLabel && !isDone && (
        step.action === 'link' && step.actionHref ? (
          <Link
            href={step.actionHref}
            className="flex items-center gap-1 shrink-0 px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
            style={{
              borderRadius: '9999px',
              backgroundColor: isHigh
                ? 'var(--accent-color, #6366F1)'
                : 'var(--text-secondary, #6b7280)',
            }}
          >
            {step.actionLabel}
            <ArrowRight className="size-3" />
          </Link>
        ) : (
          <button
            onClick={handleAction}
            className="flex items-center gap-1 shrink-0 px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
            style={{
              borderRadius: '9999px',
              backgroundColor: isHigh
                ? 'var(--accent-color, #6366F1)'
                : 'var(--text-secondary, #6b7280)',
            }}
          >
            {step.actionLabel}
            <ArrowRight className="size-3" />
          </button>
        )
      )}

      {/* Done checkmark */}
      {isDone && (
        <CheckCircle2
          className="size-5 shrink-0"
          style={{ color: 'var(--success, #22C55E)' }}
        />
      )}
    </div>
  )
}
