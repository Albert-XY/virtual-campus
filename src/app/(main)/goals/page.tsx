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
import GoalGuard from '@/components/goals/GoalGuard'

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

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return { label: '已完成', color: 'var(--success)', bg: 'var(--success-light, rgba(34,197,94,0.1))' }
    case 'abandoned':
      return { label: '已放弃', color: 'var(--text-muted)', bg: 'var(--bg-secondary)' }
    default:
      return { label: '进行中', color: 'var(--accent-color)', bg: 'var(--accent-light)' }
  }
}

// ============================================================
// Progress bar component
// ============================================================
function ProgressBar({ completed, total, status, track }: {
  completed: number; total: number; status: string; track: boolean | null
}) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span style={{ color: 'var(--text-secondary)' }}>{completed}/{total}</span>
        <span style={{ color: 'var(--text-muted)' }}>{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden" style={{ borderRadius: '9999px', backgroundColor: 'var(--bg-secondary)' }}>
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${Math.min(pct, 100)}%`,
            borderRadius: '9999px',
            backgroundColor: status === 'completed' ? 'var(--success)' : track === false ? 'var(--danger)' : 'var(--accent-color)',
          }}
        />
      </div>
    </div>
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
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--accent-color)' }} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/')} style={{ color: 'var(--text-secondary)' }}>
            <ArrowLeft className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <Target className="size-5" style={{ color: 'var(--accent-color)' }} />
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>学习目标</h1>
          </div>
        </div>
        <Button size="sm" onClick={handleCreateMonthly} style={{ backgroundColor: 'var(--accent-color)' }}>
          <Plus className="size-4" />
          月目标
        </Button>
      </div>

      {/* Empty state */}
      {monthlyGoals.length === 0 && !formState.open && (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="flex size-16 items-center justify-center" style={{ borderRadius: '50%', backgroundColor: 'var(--accent-light)' }}>
            <Target className="size-8" style={{ color: 'var(--accent-color)' }} />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>还没有设置目标</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>从设定这个月的学习目标开始</p>
          </div>
          <Button onClick={handleCreateMonthly} style={{ backgroundColor: 'var(--accent-color)' }}>
            <Plus className="size-4" />
            创建月目标
          </Button>
        </div>
      )}

      {/* Monthly goals — each with nested weekly goals */}
      {monthlyGoals.map((monthly) => {
        const isExpanded = expandedId === monthly.id
        const weekChildren = monthly.children ?? []
        const mPace = calcPace(monthly)
        const mTrack = isOnTrack(monthly)
        const mStatus = getStatusBadge(monthly.status)

        return (
          <Card key={monthly.id}>
            <CardContent className="pt-4">
              {/* Monthly goal header */}
              <button type="button" onClick={() => setExpandedId(isExpanded ? null : monthly.id)} className="w-full text-left">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 font-medium" style={{ borderRadius: '4px', backgroundColor: 'var(--accent-light)', color: 'var(--accent-color)' }}>
                        月目标
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5" style={{ borderRadius: '4px', backgroundColor: mStatus.bg, color: mStatus.color }}>
                        {mStatus.label}
                      </span>
                    </div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{monthly.title}</p>
                    <ProgressBar completed={monthly.completed_units} total={monthly.total_units} status={monthly.status} track={mTrack} />
                    <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {monthly.target_date && (
                        <span className="flex items-center gap-1"><Calendar className="size-3" />截止 {formatTargetDate(monthly.target_date)}</span>
                      )}
                      {mTrack === false && <span style={{ color: 'var(--danger)' }}>进度落后</span>}
                      {mTrack === true && <span style={{ color: 'var(--success)' }}>进度正常</span>}
                      {mPace != null && mPace > 0 && <span>每天需 {mPace} 单位</span>}
                      {weekChildren.length > 0 && (
                        <span className="flex items-center gap-1"><ListTree className="size-3" />{weekChildren.length} 个周目标</span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 mt-1" style={{ color: 'var(--text-muted)' }}>
                    {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  </div>
                </div>
              </button>

              {/* Expanded: weekly children + actions */}
              {isExpanded && (
                <div className="mt-3 pt-3 space-y-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                  {monthly.description && (
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{monthly.description}</p>
                  )}

                  {/* Weekly children */}
                  {weekChildren.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                          <ListTree className="size-3 inline mr-1" />周目标拆解
                        </p>
                      </div>
                      {weekChildren.map((week) => {
                        const wTrack = isOnTrack(week)
                        const wStatus = getStatusBadge(week.status)
                        return (
                          <div key={week.id} className="flex items-start gap-2 px-3 py-2" style={{ borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-secondary)' }}>
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] px-1.5 py-0.5" style={{ borderRadius: '4px', backgroundColor: 'rgba(99,102,241,0.06)', color: 'var(--text-secondary)' }}>
                                  周
                                </span>
                                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{week.title}</span>
                                <span className="text-[10px] px-1 py-0.5" style={{ borderRadius: '4px', backgroundColor: wStatus.bg, color: wStatus.color }}>
                                  {wStatus.label}
                                </span>
                              </div>
                              <ProgressBar completed={week.completed_units} total={week.total_units} status={week.status} track={wTrack} />
                              <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                {week.target_date && <span>截止 {formatTargetDate(week.target_date)}</span>}
                                {wTrack === false && <span style={{ color: 'var(--danger)' }}>落后</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => handleEdit(week)} className="p-1 rounded hover:bg-black/5" style={{ color: 'var(--text-muted)' }}>
                                <Edit className="size-3" />
                              </button>
                              <button onClick={() => handleDelete(week)} className="p-1 rounded hover:bg-black/5" style={{ color: 'var(--danger)' }}>
                                <Trash2 className="size-3" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(monthly)}>
                      <Edit className="size-3.5" /> 编辑月目标
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleCreateWeekly(monthly)}>
                      <Plus className="size-3.5" /> 添加周目标
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(monthly)} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
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
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setFormState((s) => ({ ...s, open: false }))} className="text-sm" style={{ color: 'var(--text-muted)' }}>
              ← 返回
            </button>
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
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
