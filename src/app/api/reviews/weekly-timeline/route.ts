import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ============================================================
// GET /api/reviews/weekly-timeline?date=2026-04-13
// 返回周复盘页面的完整时间线数据
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
    const dateParam = searchParams.get('date')
    const targetDate = dateParam
      ? new Date(dateParam + 'T00:00:00')
      : new Date()

    // ----------------------------------------------------------
    // 1. 计算本周的周一 ~ 周日
    // ----------------------------------------------------------
    const dayOfWeek = targetDate.getDay()
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(targetDate)
    monday.setDate(monday.getDate() + diffToMonday)
    const sunday = new Date(monday)
    sunday.setDate(sunday.getDate() + 6)

    const weekStartStr = formatDate(monday)
    const weekEndStr = formatDate(sunday)

    // ----------------------------------------------------------
    // 2. 计算上周的周一 ~ 周日
    // ----------------------------------------------------------
    const lastMonday = new Date(monday)
    lastMonday.setDate(lastMonday.getDate() - 7)
    const lastSunday = new Date(lastMonday)
    lastSunday.setDate(lastSunday.getDate() + 6)
    const lastWeekStartStr = formatDate(lastMonday)
    const lastWeekEndStr = formatDate(lastSunday)

    // ----------------------------------------------------------
    // 3. 获取本周每天的详细数据
    // ----------------------------------------------------------
    const days: DayData[] = []
    const weekdayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(d.getDate() + i)
      const dateStr = formatDate(d)
      const dayData = await getDayTimelineData(supabase, user.id, dateStr)
      days.push({
        date: dateStr,
        weekday: weekdayNames[i],
        ...dayData,
      })
    }

    // ----------------------------------------------------------
    // 4. 汇总本周 summary
    // ----------------------------------------------------------
    const weekSummary = buildWeekSummary(days)

    // ----------------------------------------------------------
    // 5. 获取上周 summary
    // ----------------------------------------------------------
    const lastWeekSummary = await buildLastWeekSummary(
      supabase,
      user.id,
      lastWeekStartStr,
      lastWeekEndStr
    )

    // ----------------------------------------------------------
    // 6. 获取本周目标进度
    // ----------------------------------------------------------
    const goalProgress = await getGoalProgress(
      supabase,
      user.id,
      weekStartStr,
      weekEndStr
    )

    // ----------------------------------------------------------
    // 7. 模式检测
    // ----------------------------------------------------------
    const patterns = detectPatterns(days)

    // ----------------------------------------------------------
    // 8. 获取上周 KISS（最近一条周总结）
    // ----------------------------------------------------------
    const lastWeekKiss = await getLastWeekKiss(supabase, user.id)

    return NextResponse.json({
      week_start: weekStartStr,
      week_end: weekEndStr,
      summary: weekSummary,
      last_week_summary: lastWeekSummary,
      goal_progress: goalProgress,
      days,
      patterns,
      last_week_kiss: lastWeekKiss,
    })
  } catch (error) {
    console.error('获取周时间线数据异常:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// ============================================================
// 类型定义
// ============================================================
interface DayData {
  date: string
  weekday: string
  mood: number | null
  pomodoros: number
  focus_minutes: number
  tasks_completed: number
  tasks_total: number
  deviation_rate: number
  subjects: Array<{ subject: string; completed: number; total_minutes: number }>
  review: {
    proud_moment: string | null
    biggest_difficulty: string | null
    tomorrow_priority: string | null
  } | null
  has_review: boolean
}

// ============================================================
// 工具函数
// ============================================================

/** 格式化日期为 YYYY-MM-DD */
function formatDate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** 解析 review content JSON */
function parseReviewContent(content: unknown): Record<string, string> {
  if (!content) return {}
  try {
    const parsed = typeof content === 'string' ? JSON.parse(content) : content
    if (parsed && typeof parsed === 'object' && parsed.structured) {
      return parsed.structured as Record<string, string>
    }
    return {}
  } catch {
    return {}
  }
}

// ============================================================
// 获取单日时间线数据
// ============================================================
async function getDayTimelineData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  dateStr: string
): Promise<Omit<DayData, 'date' | 'weekday'>> {
  const dayStart = `${dateStr}T00:00:00`
  const dayEnd = `${dateStr}T23:59:59`

  // 1. 查询番茄钟
  const { data: sessions } = await supabase
    .from('pomodoro_sessions')
    .select('id, focus_minutes, is_completed')
    .eq('user_id', userId)
    .eq('is_completed', true)
    .gte('started_at', dayStart)
    .lte('started_at', dayEnd)

  const completedSessions = sessions ?? []
  const pomodoros = completedSessions.length
  const focusMinutes = completedSessions.reduce(
    (sum, s) => sum + (s.focus_minutes || 0),
    0
  )

  // 2. 查询 daily_plans → tasks
  const { data: plans } = await supabase
    .from('daily_plans')
    .select('id')
    .eq('user_id', userId)
    .eq('plan_date', dateStr)

  const planIds = (plans ?? []).map((p) => p.id)

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

  const completedTasks = tasks.filter((t) => t.status === 'completed')
  const tasksCompleted = completedTasks.length
  const tasksTotal = tasks.length

  // 计算偏差率
  let deviationRate = 0
  const tasksWithEstimate = completedTasks.filter(
    (t) => t.estimated_minutes !== null && t.estimated_minutes > 0
  )
  if (tasksWithEstimate.length > 0) {
    const totalDeviation = tasksWithEstimate.reduce((sum, t) => {
      const actual = t.actual_minutes ?? 0
      const estimated = t.estimated_minutes!
      return sum + Math.abs(actual - estimated) / estimated
    }, 0)
    deviationRate = Math.round((totalDeviation / tasksWithEstimate.length) * 100)
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

  // 3. 查询当日 review
  const { data: review } = await supabase
    .from('reviews')
    .select('content, mood')
    .eq('user_id', userId)
    .eq('period', 'daily')
    .eq('period_start', dateStr)
    .single()

  let reviewData: DayData['review'] = null
  let hasReview = false

  if (review) {
    hasReview = true
    const structured = parseReviewContent(review.content)
    reviewData = {
      proud_moment: structured.proud_moment || null,
      biggest_difficulty: structured.biggest_difficulty || null,
      tomorrow_priority: structured.tomorrow_priority || null,
    }
  }

  return {
    mood: review?.mood ?? null,
    pomodoros,
    focus_minutes: focusMinutes,
    tasks_completed: tasksCompleted,
    tasks_total: tasksTotal,
    deviation_rate: deviationRate,
    subjects,
    review: reviewData,
    has_review: hasReview,
  }
}

// ============================================================
// 汇总本周 summary
// ============================================================
function buildWeekSummary(days: DayData[]) {
  let totalPomodoros = 0
  let totalFocusMinutes = 0
  let tasksCompleted = 0
  let tasksTotal = 0
  let deviationSum = 0
  let deviationCount = 0
  let moodSum = 0
  let moodCount = 0
  let reviewDays = 0

  for (const day of days) {
    totalPomodoros += day.pomodoros
    totalFocusMinutes += day.focus_minutes
    tasksCompleted += day.tasks_completed
    tasksTotal += day.tasks_total

    if (day.deviation_rate > 0) {
      deviationSum += day.deviation_rate
      deviationCount++
    }

    if (day.mood !== null) {
      moodSum += day.mood
      moodCount++
    }

    if (day.has_review) {
      reviewDays++
    }
  }

  return {
    total_pomodoros: totalPomodoros,
    total_focus_minutes: totalFocusMinutes,
    tasks_completed: tasksCompleted,
    tasks_total: tasksTotal,
    avg_deviation_rate: deviationCount > 0 ? Math.round(deviationSum / deviationCount) : 0,
    avg_mood: moodCount > 0 ? Math.round((moodSum / moodCount) * 10) / 10 : 0,
    review_days: reviewDays,
  }
}

// ============================================================
// 获取上周 summary（简化版，不需要每天详细数据）
// ============================================================
async function buildLastWeekSummary(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  weekStart: string,
  weekEnd: string
) {
  // 番茄钟
  const { data: sessions } = await supabase
    .from('pomodoro_sessions')
    .select('id, focus_minutes, is_completed')
    .eq('user_id', userId)
    .eq('is_completed', true)
    .gte('started_at', `${weekStart}T00:00:00`)
    .lte('started_at', `${weekEnd}T23:59:59`)

  const completedSessions = sessions ?? []
  const totalPomodoros = completedSessions.length
  const totalFocusMinutes = completedSessions.reduce(
    (sum, s) => sum + (s.focus_minutes || 0),
    0
  )

  // daily_plans → tasks
  const { data: plans } = await supabase
    .from('daily_plans')
    .select('id')
    .eq('user_id', userId)
    .gte('plan_date', weekStart)
    .lte('plan_date', weekEnd)

  const planIds = (plans ?? []).map((p) => p.id)

  let tasks: Array<{
    status: string
    estimated_minutes: number | null
    actual_minutes: number | null
  }> = []

  if (planIds.length > 0) {
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('status, estimated_minutes, actual_minutes')
      .eq('user_id', userId)
      .in('plan_id', planIds)

    tasks = tasksData ?? []
  }

  const completedTasks = tasks.filter((t) => t.status === 'completed')
  const tasksCompleted = completedTasks.length
  const tasksTotal = tasks.length

  // 偏差率
  let deviationRate = 0
  const tasksWithEstimate = completedTasks.filter(
    (t) => t.estimated_minutes !== null && t.estimated_minutes > 0
  )
  if (tasksWithEstimate.length > 0) {
    const totalDeviation = tasksWithEstimate.reduce((sum, t) => {
      const actual = t.actual_minutes ?? 0
      const estimated = t.estimated_minutes!
      return sum + Math.abs(actual - estimated) / estimated
    }, 0)
    deviationRate = Math.round((totalDeviation / tasksWithEstimate.length) * 100)
  }

  // 心情
  const { data: reviews } = await supabase
    .from('reviews')
    .select('mood')
    .eq('user_id', userId)
    .eq('period', 'daily')
    .gte('period_start', weekStart)
    .lte('period_start', weekEnd)

  const moods = (reviews ?? []).filter((r) => r.mood !== null).map((r) => r.mood as number)
  const avgMood =
    moods.length > 0 ? Math.round((moods.reduce((a, b) => a + b, 0) / moods.length) * 10) / 10 : 0

  return {
    total_pomodoros: totalPomodoros,
    total_focus_minutes: totalFocusMinutes,
    tasks_completed: tasksCompleted,
    tasks_total: tasksTotal,
    avg_deviation_rate: deviationRate,
    avg_mood: avgMood,
  }
}

// ============================================================
// 获取本周目标进度
// ============================================================
async function getGoalProgress(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  weekStart: string,
  weekEnd: string
) {
  try {
    // 查找本周内的活跃周目标
    const { data: goals } = await supabase
      .from('learning_goals')
      .select('id, title, completed_units, total_units, target_date, status')
      .eq('user_id', userId)
      .eq('period', 'weekly')
      .eq('status', 'active')
      .gte('target_date', weekStart)
    // 不加 lte(weekEnd)，因为目标可能跨周，取最近的活跃周目标

    if (!goals || goals.length === 0) {
      // 如果本周没有目标，尝试获取最近的活跃周目标
      const { data: recentGoals } = await supabase
        .from('learning_goals')
        .select('id, title, completed_units, total_units, target_date, status')
        .eq('user_id', userId)
        .eq('period', 'weekly')
        .eq('status', 'active')
        .order('target_date', { ascending: true })
        .limit(1)

      if (!recentGoals || recentGoals.length === 0) {
        return null
      }

      const goal = recentGoals[0]
      const completed = goal.completed_units || 0
      const total = goal.total_units || 0
      const onTrack = total > 0 ? completed >= Math.floor(total / 2) : false

      return {
        title: goal.title,
        completed,
        total,
        on_track: onTrack,
      }
    }

    // 取最相关的目标（target_date 最接近本周的）
    const goal = goals[0]
    const completed = goal.completed_units || 0
    const total = goal.total_units || 0
    const onTrack = total > 0 ? completed >= Math.floor(total / 2) : false

    return {
      title: goal.title,
      completed,
      total,
      on_track: onTrack,
    }
  } catch {
    return null
  }
}

// ============================================================
// 模式检测
// ============================================================
function detectPatterns(
  days: DayData[]
): {
  frequent_overtime_subjects: string[]
  best_day: { weekday: string; avg_pomodoros: number } | null
  worst_day: { weekday: string; avg_pomodoros: number } | null
  mood_trend: 'improving' | 'declining' | 'stable'
} {
  // 1. frequent_overtime_subjects: 超时科目（偏差率 > 20%）出现超过 2 天
  const overtimeSubjectDays = new Map<string, number>()
  for (const day of days) {
    if (day.deviation_rate > 20) {
      // 找出当天偏差最大的科目
      for (const subject of day.subjects) {
        overtimeSubjectDays.set(
          subject.subject,
          (overtimeSubjectDays.get(subject.subject) || 0) + 1
        )
      }
    }
  }
  const frequentOvertimeSubjects = Array.from(overtimeSubjectDays.entries())
    .filter(([, count]) => count > 2)
    .map(([subject]) => subject)

  // 2. best_day / worst_day: 番茄钟最多/最少的天
  let bestDay: DayData | null = null
  let worstDay: DayData | null = null

  for (const day of days) {
    if (bestDay === null || day.pomodoros > bestDay.pomodoros) {
      bestDay = day
    }
    if (worstDay === null || day.pomodoros < worstDay.pomodoros) {
      worstDay = day
    }
  }

  // 3. mood_trend: 前3天 vs 后3天平均心情
  const firstHalf = days.slice(0, 3).filter((d) => d.mood !== null).map((d) => d.mood!)
  const secondHalf = days.slice(4).filter((d) => d.mood !== null).map((d) => d.mood!)

  const avgFirst =
    firstHalf.length > 0
      ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
      : 0
  const avgSecond =
    secondHalf.length > 0
      ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
      : 0

  let moodTrend: 'improving' | 'declining' | 'stable' = 'stable'
  if (avgFirst > 0 && avgSecond > 0) {
    const diff = avgSecond - avgFirst
    if (diff > 0.3) {
      moodTrend = 'improving'
    } else if (diff < -0.3) {
      moodTrend = 'declining'
    }
  }

  return {
    frequent_overtime_subjects: frequentOvertimeSubjects,
    best_day: bestDay
      ? { weekday: bestDay.weekday, avg_pomodoros: bestDay.pomodoros }
      : null,
    worst_day: worstDay
      ? { weekday: worstDay.weekday, avg_pomodoros: worstDay.pomodoros }
      : null,
    mood_trend: moodTrend,
  }
}

// ============================================================
// 获取上周 KISS（最近一条周总结的 kiss_review 和 next_week_focus）
// ============================================================
async function getLastWeekKiss(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  try {
    const { data: weeklyReview } = await supabase
      .from('reviews')
      .select('content')
      .eq('user_id', userId)
      .eq('period', 'weekly')
      .order('period_start', { ascending: false })
      .limit(1)
      .single()

    if (!weeklyReview?.content) {
      return null
    }

    const structured = parseReviewContent(weeklyReview.content)
    const kissReview = structured.kiss_review || null
    const nextWeekFocus = structured.next_week_focus || null

    if (!kissReview && !nextWeekFocus) {
      return null
    }

    return {
      kiss_review: kissReview,
      next_week_focus: nextWeekFocus,
    }
  } catch {
    return null
  }
}
