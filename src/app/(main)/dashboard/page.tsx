'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, ClipboardList } from 'lucide-react'
import PlanForm from '@/components/PlanForm'
import PlanSummary from '@/components/PlanSummary'
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
        <Loader2 className="size-8 animate-spin text-[#1E40AF]" />
      </div>
    )
  }

  // 重新规划模式
  if (isReplanning && plan) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center size-14 rounded-full bg-[#F97316]/10">
            <ClipboardList className="size-7 text-[#F97316]" />
          </div>
          <h2 className="text-xl font-bold text-[#1E40AF]">
            修改今日规划
          </h2>
          <p className="text-sm text-muted-foreground">
            调整你的学习安排
          </p>
        </div>

        <PlanForm
          onSuccess={handlePlanCreated}
          editPlan={plan}
        />

        <button
          onClick={handleCancelReplan}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground py-2"
        >
          取消修改
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      {plan ? (
        <PlanSummary
          plan={plan}
          tasks={tasks}
          onReplan={handleReplan}
        />
      ) : (
        <div className="space-y-6">
          {/* 欢迎语 */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center size-14 rounded-full bg-[#1E40AF]/10">
              <ClipboardList className="size-7 text-[#1E40AF]" />
            </div>
            <h2 className="text-xl font-bold text-[#1E40AF]">
              规划中心
            </h2>
            <p className="text-sm text-muted-foreground">
              先规划，再行动。完成今日规划后即可进入校园学习。
            </p>
          </div>

          <PlanForm onSuccess={handlePlanCreated} />
        </div>
      )}
    </div>
  )
}
