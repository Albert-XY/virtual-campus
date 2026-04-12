import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ============================================================
// GET /api/goals/progress — 获取目标进度汇总（看板用）
// ============================================================
export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const today = new Date().toISOString().split('T')[0]

    // 查询当前用户活跃的 monthly 和 weekly 目标
    const { data: goals, error: goalsError } = await supabase
      .from('learning_goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('period', ['monthly', 'weekly'])
      .order('start_date', { ascending: false })

    if (goalsError) {
      console.error('查询学习目标失败:', goalsError)
      return NextResponse.json({ error: '查询学习目标失败' }, { status: 500 })
    }

    if (!goals || goals.length === 0) {
      return NextResponse.json({ goals: [] })
    }

    const goalIds = goals.map((g) => g.id)

    // 查询与这些目标关联的、今日已完成的任务数量
    const { data: completedTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('goal_id')
      .in('goal_id', goalIds)
      .eq('status', 'completed')
      .gte('completed_at', `${today}T00:00:00`)
      .lt('completed_at', `${today}T23:59:59`)

    if (tasksError) {
      console.error('查询关联任务失败:', tasksError)
      // 任务查询失败不影响进度返回
    }

    // 统计每个目标今日完成的任务数
    const tasksCompletedTodayMap = new Map<string, number>()
    if (completedTasks) {
      for (const task of completedTasks) {
        const goalId = task.goal_id as string
        tasksCompletedTodayMap.set(
          goalId,
          (tasksCompletedTodayMap.get(goalId) ?? 0) + 1
        )
      }
    }

    // 计算每个目标的进度指标
    const goalsWithProgress = goals.map((goal) => {
      const totalUnits = goal.total_units as number
      const completedUnits = goal.completed_units as number
      const startDate = goal.start_date as string
      const targetDate = goal.target_date as string | null

      // 进度百分比
      const progressPercent =
        totalUnits > 0
          ? Math.round((completedUnits / totalUnits) * 100)
          : 0

      // 剩余单元数
      const remainingUnits = Math.max(0, totalUnits - completedUnits)

      // 计算天数相关指标
      let daysRemaining: number | null = null
      let pace: number | null = null
      let onTrack: boolean | null = null

      const now = new Date()
      now.setHours(0, 0, 0, 0)

      if (targetDate) {
        const target = new Date(targetDate)
        target.setHours(0, 0, 0, 0)
        const diffMs = target.getTime() - now.getTime()
        daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))

        // pace: 每天需要完成的单元数
        if (daysRemaining > 0 && remainingUnits > 0) {
          pace = Number((remainingUnits / daysRemaining).toFixed(2))
        } else if (daysRemaining === 0 && remainingUnits > 0) {
          pace = Infinity
        } else {
          pace = 0
        }

        // on_track: 当前 pace 是否 <= 平均 pace
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        const totalDays = Math.max(
          1,
          Math.ceil((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
        )
        const averagePace = totalUnits / totalDays

        if (pace !== null && pace !== Infinity) {
          onTrack = pace <= averagePace
        } else if (pace === Infinity) {
          onTrack = false
        } else {
          // remainingUnits === 0，已完成
          onTrack = true
        }
      }

      return {
        ...goal,
        progress_percent: progressPercent,
        remaining_units: remainingUnits,
        days_remaining: daysRemaining,
        pace: pace,
        on_track: onTrack,
        tasks_completed_today: tasksCompletedTodayMap.get(goal.id) ?? 0,
      }
    })

    return NextResponse.json({ goals: goalsWithProgress })
  } catch (error) {
    console.error('获取目标进度异常:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
