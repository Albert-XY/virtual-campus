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
  Loader2,
  ListTree,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  const remainingDays = Math.max(1, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
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
  const totalDays = Math.max(1, Math.ceil((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
  const elapsedDays = Math.max(1, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
  const expectedCompleted = (goal.total_units / totalDays) * elapsedDays
  return goal.completed_units >= expectedCompleted
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'completed':
      return { label: '已完成', variant: 'success' as const }
    case 'abandoned':
      return { label: '已放弃', variant: 'default' as const }
    default:
      return { label: '进行中', variant: 'primary' as const }
  }
}

// ============================================================
// Progress bar component - 主题感知
// ============================================================
function ProgressBar({ completed, total, status, track }: {
  completed: number; total: number; status: string; track: boolean | null
}) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  const variant = status === 'completed' ? 'success' : track === false ? 'danger' : 'default'

  return (
    <div className="themed-progress-wrapper space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-secondary">{completed}/{total}</span>
        <span className="text-muted">{pct}%</span>
      </div>
      <div className="themed-progress">
        <div
          className={`themed-progress__fill themed-progress--${variant}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  )
}

// ============================================================
// Badge component - 主题感知
// ============================================================
function StatusBadge({ status }: { status: string }) {
  const config = getStatusConfig(status)
  return (
    <span className={`themed-badge themed-badge--${config.variant}`}>
      {config.label}
    </span>
  )
}

function PeriodBadge({ period }: { period: 'monthly' | 'weekly' }) {
  return (
    <span className="themed-badge">
      {period === 'monthly' ? '月目标' : '周'}
    </span>
  )
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
  }>({ open: false, period: 'monthly', parentGoal: null, editGoal: null })

  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch('/api/goals?include_children=true')
      if (res.ok) {
        const json = await res.json()
        setGoals(json.goals ?? [])
      }
    } catch {
      toast.error('网络错误')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchGoals() }, [fetchGoals])

  // Only monthly goals are top-level; weekly goals are children
  const monthlyGoals = goals.filter((g) => g.period === 'monthly')

  const handleCreateMonthly = () => {
    setFormState({ open: true, period: 'monthly', parentGoal: null, editGoal: null })
  }

  const handleCreateWeekly = (parent: GoalItem) => {
    setFormState({
      open: true, period: 'weekly',
      parentGoal: { id: parent.id, title: parent.title, total_units: parent.total_units },
      editGoal: null,
    })
  }

  const handleEdit = (goal: GoalItem) => {
    setFormState({ open: true, period: goal.period, parentGoal: null, editGoal: goal })
  }

  const handleDelete = async (goal: GoalItem) => {
    if (!confirm(`确定要删除"${goal.title}"吗？${goal.children?.length ? '子目标也会一并删除。' : ''}`)) return
    try {
      const res = await fetch('/api/goals', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: goal.id }),
      })
      if (res.ok) {
        toast.success('已删除')
        setExpandedId(null)
        fetchGoals()
      } else {
        const json = await res.json()
        toast.error(json.error || '删除失败')
      }
    } catch {
      toast.error('网络错误')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div className="goals-page mx-auto max-w-lg px-4 py-6 space-y-6">
      {/* Header */}
      <div className="goals-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/')} className="text-secondary hover:text-primary transition-colors">
            <ArrowLeft className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <Target className="size-5 text-accent" />
            <h1 className="page-title text-lg">学习目标</h1>
          </div>
        </div>
        <Button size="sm" onClick={handleCreateMonthly} className="themed-button--primary">
          <Plus className="size-4" />
          月目标
        </Button>
      </div>

      {/* Empty state */}
      {monthlyGoals.length === 0 && !formState.open && (
        <div className="empty-state flex flex-col items-center gap-4 py-12">
          <div className="empty-state-icon flex size-16 items-center justify-center">
            <Target className="size-8 text-accent" />
          </div>
          <div className="empty-state-text text-center space-y-1">
            <p className="text-sm text-secondary">还没有设置目标</p>
            <p className="text-xs text-muted">从设定这个月的学习目标开始</p>
          </div>
          <Button onClick={handleCreateMonthly} className="themed-button--primary">
            <Plus className="size-4" />
            创建月目标
          </Button>
        </div>
      )}

      {/* Monthly goals — each with nested weekly goals */}
      {monthlyGoals.map((monthly) => {
        const isExpanded = expandedId === monthly.id
        const weekChildren = monthly.children ?? []
        const mTrack = isOnTrack(monthly)

        return (
          <Card key={monthly.id} className="themed-card">
            <CardContent className="pt-4">
              {/* Monthly goal header */}
              <button type="button" onClick={() => setExpandedId(isExpanded ? null : monthly.id)} className="w-full text-left">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <PeriodBadge period="monthly" />
                      <StatusBadge status={monthly.status} />
                    </div>
                    <p className="goal-title text-sm font-medium">{monthly.title}</p>
                    <ProgressBar completed={monthly.completed_units} total={monthly.total_units} status={monthly.status} track={mTrack} />
                    <div className="goal-meta flex items-center gap-3 text-xs text-muted">
                      {monthly.target_date && (
                        <span className="flex items-center gap-1"><Calendar className="size-3" />截止 {formatTargetDate(monthly.target_date)}</span>
                      )}
                      {mTrack === false && <span className="text-danger">进度落后</span>}
                      {mTrack === true && <span className="text-success">进度正常</span>}
                      {calcPace(monthly) != null && calcPace(monthly)! > 0 && <span>每天需 {calcPace(monthly)} 单位</span>}
                      {weekChildren.length > 0 && (
                        <span className="flex items-center gap-1"><ListTree className="size-3" />{weekChildren.length} 个周目标</span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 mt-1 text-muted">
                    {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  </div>
                </div>
              </button>

              {/* Expanded: weekly children + actions */}
              {isExpanded && (
                <div className="goal-expanded mt-3 pt-3 space-y-3 border-t border-border">
                  {monthly.description && (
                    <p className="goal-description text-xs text-secondary">{monthly.description}</p>
                  )}

                  {/* Weekly children */}
                  {weekChildren.length > 0 && (
                    <div className="weekly-goals space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-secondary">
                          <ListTree className="size-3 inline mr-1" />周目标拆解
                        </p>
                      </div>
                      {weekChildren.map((week) => {
                        const wTrack = isOnTrack(week)
                        return (
                          <div key={week.id} className="weekly-goal-item flex items-start gap-2 px-3 py-2 rounded-lg bg-secondary/50">
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-1.5">
                                <PeriodBadge period="weekly" />
                                <span className="text-sm">{week.title}</span>
                                <StatusBadge status={week.status} />
                              </div>
                              <ProgressBar completed={week.completed_units} total={week.total_units} status={week.status} track={wTrack} />
                              <div className="flex items-center gap-2 text-[10px] text-muted">
                                {week.target_date && <span>截止 {formatTargetDate(week.target_date)}</span>}
                                {wTrack === false && <span className="text-danger">落后</span>}
                              </div>
                            </div>
                            <div className="goal-actions flex items-center gap-1 shrink-0">
                              <button onClick={() => handleEdit(week)} className="p-1 rounded hover:bg-black/5 text-muted hover:text-primary transition-colors">
                                <Edit className="size-3" />
                              </button>
                              <button onClick={() => handleDelete(week)} className="p-1 rounded hover:bg-black/5 text-danger transition-colors">
                                <Trash2 className="size-3" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="goal-actions flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(monthly)}>
                      <Edit className="size-3.5" /> 编辑月目标
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleCreateWeekly(monthly)}>
                      <Plus className="size-3.5" /> 添加周目标
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(monthly)} className="text-danger border-danger hover:bg-danger/10">
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      {/* Form overlay */}
      {formState.open && (
        <div className="goal-form space-y-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setFormState((s) => ({ ...s, open: false }))} className="text-sm text-muted hover:text-primary transition-colors">
              ← 返回
            </button>
            <span className="text-sm font-medium text-secondary">
              {formState.editGoal ? '编辑目标' : `创建${formState.period === 'monthly' ? '月' : '周'}目标`}
            </span>
          </div>
          <GoalForm
            period={formState.period}
            parentGoal={formState.parentGoal}
            editGoal={formState.editGoal ? {
              id: formState.editGoal.id,
              title: formState.editGoal.title,
              description: formState.editGoal.description,
              total_units: formState.editGoal.total_units,
              target_date: formState.editGoal.target_date,
            } : null}
            onSuccess={() => { setFormState((s) => ({ ...s, open: false })); fetchGoals() }}
            onCancel={() => setFormState((s) => ({ ...s, open: false }))}
          />
        </div>
      )}
    </div>
  )
}
