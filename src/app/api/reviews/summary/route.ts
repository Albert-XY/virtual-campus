import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ============================================================
// GET /api/reviews/summary?period=daily&date=2026-04-13
// ============================================================
export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = (searchParams.get('period') ?? 'daily') as 'daily' | 'weekly'
    const dateStr = searchParams.get('date') ?? new Date().toISOString().split('T')[0]

    if (!['daily', 'weekly'].includes(period)) {
      return NextResponse.json({ error: 'period 参数无效，仅支持 daily 或 weekly' }, { status: 400 })
    }

    if (period === 'daily') {
      return handleDailySummary(supabase, user.id, dateStr)
    } else {
      return handleWeeklySummary(supabase, user.id, dateStr)
    }
  } catch (error) {
    console.error('获取总结数据异常:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// ============================================================
// 通用工具函数
// ============================================================

/** 获取指定日期的统计数据 */
async function getDayStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  date: string
) {
  const dayStart = `${date}T00:00:00`
  const dayEnd = `${date}T23:59:59`

  // 1. 查询当日的 daily_plans
  const { data: plans } = await supabase
    .from('daily_plans')
    .select('id')
    .eq('user_id', userId)
    .eq('plan_date', date)

  const planIds = (plans ?? []).map((p) => p.id)

  // 2. 查询当日的 tasks（通过 plan_id 关联）
  let tasks: Array<{
    id: string
    status: string
    subject: string | null
    estimated_minutes: number | null
    actual_minutes: number | null
  }> = []

  if (planIds.length > 0) {
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('id, status, subject, estimated_minutes, actual_minutes')
      .eq('user_id', userId)
      .in('plan_id', planIds)

    tasks = tasksData ?? []
  }

  // 3. 查询当日的 pomodoro_sessions（通过 started_at 日期过滤）
  const { data: sessions } = await supabase
    .from('pomodoro_sessions')
    .select('id, focus_minutes, is_completed')
    .eq('user_id', userId)
    .eq('is_completed', true)
    .gte('started_at', dayStart)
    .lte('started_at', dayEnd)

  const completedSessions = sessions ?? []

  // 统计番茄钟
  const totalPomodoros = completedSessions.length
  const totalFocusMinutes = completedSessions.reduce((sum, s) => sum + (s.focus_minutes || 0), 0)

  // 统计任务
  const completedTasks = tasks.filter((t) => t.status === 'completed')
  const tasksCompleted = completedTasks.length
  const tasksTotal = tasks.length

  // 计算偏差率：(actual - estimated) / estimated 的平均值
  let deviationRate = 0
  const tasksWithEstimate = completedTasks.filter(
    (t) => t.estimated_minutes !== null && t.estimated_minutes > 0
  )
  if (tasksWithEstimate.length > 0) {
    const totalDeviation = tasksWithEstimate.reduce((sum, t) => {
      const actual = t.actual_minutes ?? 0
      const estimated = t.estimated_minutes!
      return sum + (actual - estimated) / estimated
    }, 0)
    deviationRate = Math.round((totalDeviation / tasksWithEstimate.length) * 10000) / 10000
  }

  // 按科目分组
  const subjectMap = new Map<string, { completed: number; total_minutes: number }>()
  for (const t of tasks) {
    const subject = t.subject || '未分类'
    if (!subjectMap.has(subject)) {
      subjectMap.set(subject, { completed: 0, total_minutes: 0 })
    }
    const entry = subjectMap.get(subject)!
    if (t.status === 'completed') {
      entry.completed++
      entry.total_minutes += t.actual_minutes ?? t.estimated_minutes ?? 0
    }
  }
  const subjects = Array.from(subjectMap.entries()).map(([subject, data]) => ({
    subject,
    completed: data.completed,
    total_minutes: data.total_minutes,
  }))

  return {
    total_pomodoros: totalPomodoros,
    total_focus_minutes: totalFocusMinutes,
    tasks_completed: tasksCompleted,
    tasks_total: tasksTotal,
    deviation_rate: deviationRate,
    subjects,
  }
}

/** 获取连续复习天数 */
async function getStreakInfo(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data: reviews } = await supabase
    .from('reviews')
    .select('period_start')
    .eq('user_id', userId)
    .eq('period', 'daily')
    .order('period_start', { ascending: false })

  if (!reviews || reviews.length === 0) {
    return { consecutive_review_days: 0 }
  }

  // 去重并排序
  const uniqueDates = [...new Set(reviews.map((r) => r.period_start))].sort().reverse()

  // 从今天开始检查连续性
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  // 如果最近一条记录不是今天或昨天，则连续天数为 0
  if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
    return { consecutive_review_days: 0 }
  }

  let streak = 1
  for (let i = 1; i < uniqueDates.length; i++) {
    const current = new Date(uniqueDates[i - 1])
    const prev = new Date(uniqueDates[i])
    const diffDays = (current.getTime() - prev.getTime()) / 86400000

    if (Math.round(diffDays) === 1) {
      streak++
    } else {
      break
    }
  }

  return { consecutive_review_days: streak }
}

// ============================================================
// 每日总结
// ============================================================
async function handleDailySummary(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  dateStr: string
) {
  // 1. 今日统计
  const todayStats = await getDayStats(supabase, userId, dateStr)

  // 2. 昨日统计（用于对比）
  const yesterdayDate = new Date(dateStr)
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0]
  const yesterdayStats = await getDayStats(supabase, userId, yesterdayStr)

  // 3. 近 7 天趋势
  const weeklyTrend = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(dateStr)
    d.setDate(d.getDate() - i)
    const dStr = d.toISOString().split('T')[0]
    const dayStats = await getDayStats(supabase, userId, dStr)
    weeklyTrend.push({
      date: dStr,
      pomodoros: dayStats.total_pomodoros,
      tasks_completed: dayStats.tasks_completed,
      tasks_total: dayStats.tasks_total,
      deviation_rate: dayStats.deviation_rate,
    })
  }

  // 4. 连续天数
  const streakInfo = await getStreakInfo(supabase, userId)

  return NextResponse.json({
    period: 'daily',
    date: dateStr,
    today: todayStats,
    yesterday: yesterdayStats,
    weekly_trend: weeklyTrend,
    streak: streakInfo,
  })
}

// ============================================================
// 每周总结
// ============================================================
async function handleWeeklySummary(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  dateStr: string
) {
  // 计算指定日期所在周的周一到周日
  const targetDate = new Date(dateStr)
  const dayOfWeek = targetDate.getDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(targetDate)
  monday.setDate(monday.getDate() + diffToMonday)
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)

  const mondayStr = monday.toISOString().split('T')[0]
  const sundayStr = sunday.toISOString().split('T')[0]

  // 1. 汇总本周每日统计
  let weekTotalPomodoros = 0
  let weekTotalFocusMinutes = 0
  let weekTasksCompleted = 0
  let weekTasksTotal = 0
  let weekDeviationNumerator = 0
  let weekDeviationDenominator = 0
  const weekSubjectMap = new Map<string, { completed: number; total_minutes: number }>()
  const dailyReviews: Array<{
    date: string
    mood: number | null
    key_insight: string | null
  }> = []

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    const dStr = d.toISOString().split('T')[0]

    const dayStats = await getDayStats(supabase, userId, dStr)

    weekTotalPomodoros += dayStats.total_pomodoros
    weekTotalFocusMinutes += dayStats.total_focus_minutes
    weekTasksCompleted += dayStats.tasks_completed
    weekTasksTotal += dayStats.tasks_total

    // 累加偏差率分子分母
    // 重新获取有估算的已完成任务来计算
    const dayStart = `${dStr}T00:00:00`
    const dayEnd = `${dStr}T23:59:59`
    const { data: plans } = await supabase
      .from('daily_plans')
      .select('id')
      .eq('user_id', userId)
      .eq('plan_date', dStr)
    const planIds = (plans ?? []).map((p) => p.id)

    if (planIds.length > 0) {
      const { data: dayTasks } = await supabase
        .from('tasks')
        .select('status, estimated_minutes, actual_minutes')
        .eq('user_id', userId)
        .in('plan_id', planIds)

      if (dayTasks) {
        const completedWithEstimate = dayTasks.filter(
          (t) =>
            t.status === 'completed' &&
            t.estimated_minutes !== null &&
            t.estimated_minutes > 0
        )
        for (const t of completedWithEstimate) {
          weekDeviationNumerator += (t.actual_minutes ?? 0) - t.estimated_minutes!
          weekDeviationDenominator += t.estimated_minutes!
        }
      }
    }

    // 合并科目统计
    for (const s of dayStats.subjects) {
      if (!weekSubjectMap.has(s.subject)) {
        weekSubjectMap.set(s.subject, { completed: 0, total_minutes: 0 })
      }
      const entry = weekSubjectMap.get(s.subject)!
      entry.completed += s.completed
      entry.total_minutes += s.total_minutes
    }

    // 查询当日 review 的 mood 和 key insight
    const { data: review } = await supabase
      .from('reviews')
      .select('content, mood')
      .eq('user_id', userId)
      .eq('period', 'daily')
      .eq('period_start', dStr)
      .single()

    let keyInsight: string | null = null
    if (review?.content) {
      try {
        const contentObj = typeof review.content === 'string'
          ? JSON.parse(review.content)
          : review.content
        // 尝试从 structured 或 free_text 中提取关键信息
        if (contentObj?.structured) {
          const structured = contentObj.structured
          // 取第一个非空字段作为 key insight
          const keys = Object.keys(structured)
          for (const key of keys) {
            const val = structured[key]
            if (val && typeof val === 'string' && val.trim()) {
              keyInsight = val.trim()
              break
            }
          }
        }
        if (!keyInsight && contentObj?.free_text) {
          keyInsight =
            contentObj.free_text.length > 100
              ? contentObj.free_text.substring(0, 100) + '...'
              : contentObj.free_text
        }
      } catch {
        // content 解析失败，忽略
      }
    }

    dailyReviews.push({
      date: dStr,
      mood: review?.mood ?? null,
      key_insight: keyInsight,
    })
  }

  const weekDeviationRate =
    weekDeviationDenominator > 0
      ? Math.round((weekDeviationNumerator / weekDeviationDenominator) * 10000) / 10000
      : 0

  const weekSubjects = Array.from(weekSubjectMap.entries()).map(([subject, data]) => ({
    subject,
    completed: data.completed,
    total_minutes: data.total_minutes,
  }))

  // 2. 连续天数
  const streakInfo = await getStreakInfo(supabase, userId)

  return NextResponse.json({
    period: 'weekly',
    week_start: mondayStr,
    week_end: sundayStr,
    stats: {
      total_pomodoros: weekTotalPomodoros,
      total_focus_minutes: weekTotalFocusMinutes,
      tasks_completed: weekTasksCompleted,
      tasks_total: weekTasksTotal,
      deviation_rate: weekDeviationRate,
      subjects: weekSubjects,
    },
    daily_reviews: dailyReviews,
    streak: streakInfo,
  })
}
