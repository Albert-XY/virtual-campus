'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, ClipboardList } from 'lucide-react'
import PlanForm from '@/components/PlanForm'
import PlanSummary from '@/components/PlanSummary'
import SummaryTab from '@/components/SummaryTab'
import type { DailyPlan, Task } from '@/types'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<DailyPlan | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [isReplanning, setIsReplanning] = useState(false)

  const fetchPlan = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/plan')
      const data = await res.json()

      if (res.ok && data.plan) {
        setPlan(data.plan)
        setTasks(data.tasks ?? [])
      } else {
        setPlan(null)
        setTasks([])
      }
    } catch (error) {
      console.error('获取规划失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPlan()
  }, [fetchPlan])

  const handlePlanCreated = useCallback(() => {
    setIsReplanning(false)
    fetchPlan()
  }, [fetchPlan])

  const handleReplan = useCallback(() => {
    setIsReplanning(true)
  }, [])

  const handleCancelReplan = useCallback(() => {
    setIsReplanning(false)
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--accent-color)' }} />
      </div>
    )
  }

  // 重新规划模式
  if (isReplanning && plan) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center size-14 rounded-full" style={{ backgroundColor: 'var(--accent-light)' }}>
            <ClipboardList className="size-7" style={{ color: 'var(--accent-color)' }} />
          </div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--accent-color)' }}>
            修改今日规划
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            调整你的学习安排
          </p>
        </div>

        <PlanForm
          onSuccess={handlePlanCreated}
          editPlan={plan}
        />

        <button
          onClick={handleCancelReplan}
          className="w-full text-center text-sm py-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          取消修改
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      {/* 页面标题 */}
      <div className="text-center space-y-2 mb-4">
        <div className="inline-flex items-center justify-center size-14 rounded-full" style={{ backgroundColor: 'var(--accent-light)' }}>
          <ClipboardList className="size-7" style={{ color: 'var(--accent-color)' }} />
        </div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--accent-color)' }}>
          规划中心
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          先规划，再行动。完成规划后即可进入校园学习。
        </p>
      </div>

      {/* 日规划 */}
      {plan ? (
        <PlanSummary
          plan={plan}
          tasks={tasks}
          onReplan={handleReplan}
        />
      ) : (
        <div id="guide-plan-form" className="space-y-6">
          <PlanForm onSuccess={handlePlanCreated} />
        </div>
      )}

      {/* 总结 */}
      <div className="mt-8">
        <SummaryTab />
      </div>
    </div>
  )
}
