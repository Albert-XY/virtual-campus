'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Target,
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  Calendar,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import GoalForm from '@/components/goals/GoalForm'

// ============================================================
// Types
// ============================================================
interface GoalItem {
  id: string
  period: 'monthly' | 'weekly'
  title: string
  description: string
  total_units: number
  completed_units: number
  target_date: string | null
  start_date: string
  status: string
  parent_goal_id: string | null
  children?: GoalItem[]
}

// ============================================================
// Helpers
// ============================================================
function formatTargetDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function calcPace(goal: GoalItem): number | null {
  if (!goal.target_date || goal.status === 'completed') return null
  const now = new Date()
  const target = new Date(goal.target_date)
  const remainingDays = Math.max(
    1,
    Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  )
  const remaining = goal.total_units - goal.completed_units
  if (remaining <= 0) return 0
  return Math.ceil((remaining / remainingDays) * 10) / 10
}

function isOnTrack(goal: GoalItem): boolean | null {
  if (!goal.target_date || goal.status === 'completed') return null
  const pace = calcPace(goal)
  if (pace === null) return null
  const now = new Date()
  const start = new Date(goal.start_date)
  const target = new Date(goal.target_date)
  const totalDays = Math.max(
    1,
    Math.ceil((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  )
  const elapsedDays = Math.max(
    1,
    Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  )
  const expectedCompleted = (goal.total_units / totalDays) * elapsedDays
  return goal.completed_units >= expectedCompleted
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return {
        label: '已完成',
        style: {
          backgroundColor: 'var(--success-light)',
          color: 'var(--success)',
        },
      }
    case 'abandoned':
      return {
        label: '已放弃',
        style: {
          backgroundColor: 'var(--border-light, var(--muted))',
          color: 'var(--text-muted)',
        },
      }
    default:
      return {
        label: '进行中',
        style: {
          backgroundColor: 'var(--accent-light)',
          color: 'var(--accent-color)',
        },
      }
  }
}

// ============================================================
// Main Page
// ============================================================
export default function GoalsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [goals, setGoals] = useState<GoalItem[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [formState, setFormState] = useState<{
    open: boolean
    period: 'monthly' | 'weekly'
    parentGoal: { id: string; title: string; total_units: number } | null
    editGoal: GoalItem | null
  }>({
    open: false,
    period: 'monthly',
    parentGoal: null,
    editGoal: null,
  })

  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch('/api/goals?include_children=true')
      if (res.ok) {
        const json = await res.json()
        setGoals(json.goals ?? [])
      } else {
        toast.error('获取目标失败')
      }
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  // Separate goals
  const monthlyGoals = goals.filter((g) => g.period === 'monthly')
  const weeklyGoals = goals.filter((g) => g.period === 'weekly')

  // Handlers
  const handleCreateGoal = (period: 'monthly' | 'weekly') => {
    setFormState({ open: true, period, parentGoal: null, editGoal: null })
  }

  const handleCreateChildGoal = (parent: GoalItem) => {
    setFormState({
      open: true,
      period: 'weekly',
      parentGoal: {
        id: parent.id,
        title: parent.title,
        total_units: parent.total_units,
      },
      editGoal: null,
    })
  }

  const handleEditGoal = (goal: GoalItem) => {
    setFormState({
      open: true,
      period: goal.period,
      parentGoal: null,
      editGoal: goal,
    })
  }

  const handleDeleteGoal = async (goal: GoalItem) => {
    if (!confirm(`确定要删除目标"${goal.title}"吗？`)) return

    try {
      const res = await fetch(`/api/goals/${goal.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('目标已删除')
        setExpandedId(null)
        fetchGoals()
      } else {
        const json = await res.json()
        toast.error(json.error || '删除失败')
      }
    } catch {
      toast.error('网络错误，请重试')
    }
  }

  const handleFormSuccess = () => {
    setFormState((s) => ({ ...s, open: false }))
    fetchGoals()
  }

  const handleFormCancel = () => {
    setFormState((s) => ({ ...s, open: false }))
  }

  // Loading
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2
          className="size-8 animate-spin"
          style={{ color: 'var(--accent-color)' }}
        />
      </div>
    )
  }

  const hasGoals = goals.length > 0

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex items-center gap-2">
          <Target
            className="size-5"
            style={{ color: 'var(--accent-color)' }}
          />
          <h1
            className="text-lg font-bold"
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--text-primary)',
            }}
          >
            学习目标
          </h1>
        </div>
      </div>

      {/* Empty state */}
      {!hasGoals && !formState.open && (
        <div className="flex flex-col items-center gap-4 py-12">
          <div
            className="flex size-16 items-center justify-center"
            style={{
              borderRadius: '50%',
              backgroundColor: 'var(--accent-light)',
            }}
          >
            <Target
              className="size-8"
              style={{ color: 'var(--accent-color)' }}
            />
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>
            还没有设置目标
          </p>
          <Button
            onClick={() => handleCreateGoal('monthly')}
            style={{ backgroundColor: 'var(--accent-color)' }}
          >
            <Plus className="size-4" />
            创建第一个目标
          </Button>
        </div>
      )}

      {/* Monthly goals section */}
      {monthlyGoals.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2
              className="text-base font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              月目标
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCreateGoal('monthly')}
            >
              <Plus className="size-3.5" />
              创建目标
            </Button>
          </div>

          <div className="space-y-2">
            {monthlyGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                expanded={expandedId === goal.id}
                onToggle={() =>
                  setExpandedId(expandedId === goal.id ? null : goal.id)
                }
                onEdit={() => handleEditGoal(goal)}
                onDelete={() => handleDeleteGoal(goal)}
                onCreateChild={() => handleCreateChildGoal(goal)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Weekly goals section (top-level only) */}
      {weeklyGoals.filter((g) => !g.parent_goal_id).length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2
              className="text-base font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              周目标
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCreateGoal('weekly')}
            >
              <Plus className="size-3.5" />
              创建目标
            </Button>
          </div>

          <div className="space-y-2">
            {weeklyGoals
              .filter((g) => !g.parent_goal_id)
              .map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  expanded={expandedId === goal.id}
                  onToggle={() =>
                    setExpandedId(expandedId === goal.id ? null : goal.id)
                  }
                  onEdit={() => handleEditGoal(goal)}
                  onDelete={() => handleDeleteGoal(goal)}
                  onCreateChild={null}
                />
              ))}
          </div>
        </section>
      )}

      {/* Create buttons when no goals in a section */}
      {hasGoals && (
        <div className="flex gap-3">
          {monthlyGoals.length === 0 && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleCreateGoal('monthly')}
            >
              <Plus className="size-4" />
              创建月目标
            </Button>
          )}
          {weeklyGoals.filter((g) => !g.parent_goal_id).length === 0 && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleCreateGoal('weekly')}
            >
              <Plus className="size-4" />
              创建周目标
            </Button>
          )}
        </div>
      )}

      {/* Form overlay */}
      {formState.open && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleFormCancel}
              className="text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              取消
            </button>
            <span
              className="text-sm font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              {formState.editGoal ? '编辑目标' : `创建${formState.period === 'monthly' ? '月' : '周'}目标`}
            </span>
          </div>
          <GoalForm
            period={formState.period}
            parentGoal={formState.parentGoal}
            editGoal={
              formState.editGoal
                ? {
                    id: formState.editGoal.id,
                    title: formState.editGoal.title,
                    description: formState.editGoal.description,
                    total_units: formState.editGoal.total_units,
                    target_date: formState.editGoal.target_date,
                  }
                : null
            }
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </div>
      )}
    </div>
  )
}

// ============================================================
// GoalCard sub-component
// ============================================================
function GoalCard({
  goal,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onCreateChild,
}: {
  goal: GoalItem
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onCreateChild: (() => void) | null
}) {
  const percentage =
    goal.total_units > 0
      ? Math.round((goal.completed_units / goal.total_units) * 100)
      : 0
  const pace = calcPace(goal)
  const track = isOnTrack(goal)
  const statusBadge = getStatusBadge(goal.status)
  const childGoals = goal.children ?? []

  return (
    <Card>
      <CardContent className="pt-4">
        {/* Clickable header */}
        <button
          type="button"
          onClick={onToggle}
          className="w-full text-left"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center gap-2">
                <p
                  className="text-sm font-medium truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {goal.title}
                </p>
                <span
                  className="shrink-0 text-xs px-2 py-0.5"
                  style={{
                    borderRadius: '9999px',
                    ...statusBadge.style,
                  }}
                >
                  {statusBadge.label}
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {goal.completed_units}/{goal.total_units}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {percentage}%
                  </span>
                </div>
                <div
                  className="h-1.5 w-full overflow-hidden"
                  style={{
                    borderRadius: '9999px',
                    backgroundColor:
                      'var(--border-light, var(--muted))',
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
                          : track === false
                            ? 'var(--danger)'
                            : 'var(--accent-color)',
                    }}
                  />
                </div>
              </div>

              {/* Meta row */}
              <div
                className="flex items-center gap-3 text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                {goal.target_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3" />
                    截止 {formatTargetDate(goal.target_date)}
                  </span>
                )}
                {track === false && (
                  <span style={{ color: 'var(--danger)' }}>进度落后</span>
                )}
                {track === true && (
                  <span style={{ color: 'var(--success)' }}>进度正常</span>
                )}
              </div>
            </div>

            {/* Expand icon */}
            <div
              className="shrink-0 mt-0.5"
              style={{ color: 'var(--text-muted)' }}
            >
              {expanded ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </div>
          </div>
        </button>

        {/* Expanded details */}
        {expanded && (
          <div
            className="mt-3 pt-3 space-y-3"
            style={{ borderTop: '1px solid var(--border-color)' }}
          >
            {/* Description */}
            {goal.description && (
              <p
                className="text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                {goal.description}
              </p>
            )}

            {/* Pace info */}
            {pace != null && pace > 0 && (
              <p
                className="text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                还需每天 {pace} 单位
              </p>
            )}

            {/* Child goals */}
            {childGoals.length > 0 && (
              <div className="space-y-2">
                <p
                  className="text-xs font-medium"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  子目标（{childGoals.length}）
                </p>
                {childGoals.map((child) => {
                  const childPct =
                    child.total_units > 0
                      ? Math.round(
                          (child.completed_units / child.total_units) * 100
                        )
                      : 0
                  const childStatus = getStatusBadge(child.status)

                  return (
                    <div
                      key={child.id}
                      className="flex items-center gap-2 px-3 py-2"
                      style={{
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-secondary)',
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-sm truncate"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {child.title}
                          </span>
                          <span
                            className="shrink-0 text-[10px] px-1.5 py-0.5"
                            style={{
                              borderRadius: '9999px',
                              ...childStatus.style,
                            }}
                          >
                            {childStatus.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div
                            className="h-1 flex-1 overflow-hidden"
                            style={{
                              borderRadius: '9999px',
                              backgroundColor:
                                'var(--border-light, var(--muted))',
                            }}
                          >
                            <div
                              className="h-full transition-all duration-300"
                              style={{
                                width: `${Math.min(childPct, 100)}%`,
                                borderRadius: '9999px',
                                backgroundColor:
                                  child.status === 'completed'
                                    ? 'var(--success)'
                                    : 'var(--accent-color)',
                              }}
                            />
                          </div>
                          <span
                            className="text-[10px] shrink-0"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {child.completed_units}/{child.total_units}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="size-3.5" />
                编辑
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
                style={{
                  color: 'var(--danger)',
                  borderColor: 'var(--danger)',
                }}
              >
                <Trash2 className="size-3.5" />
                删除
              </Button>
              {onCreateChild && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCreateChild}
                >
                  <Plus className="size-3.5" />
                  添加子目标
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
