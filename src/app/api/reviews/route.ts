import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ============================================================
// GET /api/reviews — 获取总结
// GET /api/reviews?action=list — 获取总结列表
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
    const action = searchParams.get('action')

    // ----------------------------------------------------------
    // action=list: 获取总结列表
    // ----------------------------------------------------------
    if (action === 'list') {
      const period = searchParams.get('period')
      const limit = parseInt(searchParams.get('limit') || '10', 10)

      let query = supabase
        .from('reviews')
        .select('*')
        .eq('user_id', user.id)
        .order('period_start', { ascending: false })
        .limit(limit)

      if (period) {
        query = query.eq('period', period)
      }

      const { data: reviews, error } = await query

      if (error) {
        console.error('查询总结列表失败:', error)
        return NextResponse.json({ error: '查询失败' }, { status: 500 })
      }

      return NextResponse.json({ reviews: reviews ?? [] })
    }

    // ----------------------------------------------------------
    // 默认: 获取指定日期的总结
    // ----------------------------------------------------------
    const period = searchParams.get('period') as 'daily' | 'weekly' | 'monthly' | null
    const dateStr = searchParams.get('date')

    if (!period || !['daily', 'weekly', 'monthly'].includes(period)) {
      return NextResponse.json({ error: '缺少 period 参数或参数无效' }, { status: 400 })
    }

    let periodStart: string

    if (period === 'daily') {
      periodStart = dateStr || new Date().toISOString().split('T')[0]
    } else if (period === 'weekly') {
      // 计算指定日期所在周的周一
      const { data, error } = await supabase.rpc('get_week_start', {
        input_date: dateStr || new Date().toISOString().split('T')[0]
      })
      if (error || !data) {
        // fallback: 用 SQL 查询
        const date = dateStr ? new Date(dateStr) : new Date()
        const day = date.getDay()
        const diff = date.getDate() - day + (day === 0 ? -6 : 1)
        const monday = new Date(date)
        monday.setDate(diff)
        periodStart = monday.toISOString().split('T')[0]
      } else {
        periodStart = data
      }
    } else {
      // monthly: 计算指定日期所在月的1号
      const date = dateStr ? new Date(dateStr) : new Date()
      periodStart = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
    }

    const { data: review, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('user_id', user.id)
      .eq('period', period)
      .eq('period_start', periodStart)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('查询总结失败:', error)
      return NextResponse.json({ error: '查询失败' }, { status: 500 })
    }

    return NextResponse.json({ review: review ?? null })
  } catch (error) {
    console.error('获取总结异常:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// ============================================================
// POST /api/reviews — 创建/更新总结
// ============================================================
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: '请求格式不正确' }, { status: 400 })
    }

    const { period, content, tomorrow_plan, mood, period_start } = body

    if (!period || !['daily', 'weekly', 'monthly'].includes(period)) {
      return NextResponse.json({ error: '缺少 period 参数或参数无效' }, { status: 400 })
    }

    if (!content && content !== '') {
      return NextResponse.json({ error: '缺少 content 参数' }, { status: 400 })
    }

    // 计算 period_start 和 period_end
    const today = new Date()
    let pStart: string
    let pEnd: string

    if (period === 'daily') {
      pStart = period_start || today.toISOString().split('T')[0]
      pEnd = pStart
    } else if (period === 'weekly') {
      // 计算本周周一
      const day = today.getDay()
      const diff = today.getDate() - day + (day === 0 ? -6 : 1)
      const monday = new Date(today)
      monday.setDate(diff)
      pStart = period_start || monday.toISOString().split('T')[0]
      // 本周日 = 周一 + 6
      const sunday = new Date(pStart)
      sunday.setDate(sunday.getDate() + 6)
      pEnd = sunday.toISOString().split('T')[0]
    } else {
      // monthly
      const year = today.getFullYear()
      const month = today.getMonth()
      pStart = period_start || `${year}-${String(month + 1).padStart(2, '0')}-01`
      // 本月最后一天
      const lastDay = new Date(year, month + 1, 0)
      pEnd = lastDay.toISOString().split('T')[0]
    }

    // 自动统计数据
    let tasksCompleted = 0
    let tasksTotal = 0
    let studyMinutes = 0
    let plannedMinutes = 0

    if (period === 'daily') {
      // 从 daily_plans 和 tasks 表统计当日数据
      const { data: plan } = await supabase
        .from('daily_plans')
        .select('id, tasks')
        .eq('user_id', user.id)
        .eq('plan_date', pStart)
        .single()

      if (plan) {
        // 计划中的任务数
        tasksTotal = plan.tasks ? plan.tasks.length : 0

        // 从 tasks 表获取实际完成情况
        const { data: tasks } = await supabase
          .from('tasks')
          .select('status, estimated_minutes, actual_minutes')
          .eq('plan_id', plan.id)

        if (tasks && tasks.length > 0) {
          tasksTotal = tasks.length
          tasksCompleted = tasks.filter(t => t.status === 'completed').length
          plannedMinutes = tasks.reduce((sum, t) => sum + (t.estimated_minutes || 0), 0)
          studyMinutes = tasks
            .filter(t => t.status === 'completed')
            .reduce((sum, t) => sum + (t.actual_minutes || 0), 0)
        }
      }
    } else if (period === 'weekly') {
      // 统计本周所有日总结数据汇总
      const { data: weekReviews } = await supabase
        .from('reviews')
        .select('tasks_completed, tasks_total, study_minutes, planned_minutes')
        .eq('user_id', user.id)
        .eq('period', 'daily')
        .gte('period_start', pStart)
        .lte('period_start', pEnd)

      if (weekReviews && weekReviews.length > 0) {
        tasksCompleted = weekReviews.reduce((sum, r) => sum + (r.tasks_completed || 0), 0)
        tasksTotal = weekReviews.reduce((sum, r) => sum + (r.tasks_total || 0), 0)
        studyMinutes = weekReviews.reduce((sum, r) => sum + (r.study_minutes || 0), 0)
        plannedMinutes = weekReviews.reduce((sum, r) => sum + (r.planned_minutes || 0), 0)
      }
    } else {
      // monthly: 统计本月所有周总结数据汇总
      const { data: monthReviews } = await supabase
        .from('reviews')
        .select('tasks_completed, tasks_total, study_minutes, planned_minutes')
        .eq('user_id', user.id)
        .eq('period', 'weekly')
        .gte('period_start', pStart)
        .lte('period_start', pEnd)

      if (monthReviews && monthReviews.length > 0) {
        tasksCompleted = monthReviews.reduce((sum, r) => sum + (r.tasks_completed || 0), 0)
        tasksTotal = monthReviews.reduce((sum, r) => sum + (r.tasks_total || 0), 0)
        studyMinutes = monthReviews.reduce((sum, r) => sum + (r.study_minutes || 0), 0)
        plannedMinutes = monthReviews.reduce((sum, r) => sum + (r.planned_minutes || 0), 0)
      }
    }

    // 计算偏差率
    const deviationRate = plannedMinutes > 0
      ? Math.abs(studyMinutes - plannedMinutes) / plannedMinutes * 100
      : 0

    // 检查是否已存在
    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('user_id', user.id)
      .eq('period', period)
      .eq('period_start', pStart)
      .single()

    let review

    if (existing) {
      // 更新已有总结（注意：更新时不触发积分触发器）
      const { data, error } = await supabase
        .from('reviews')
        .update({
          content,
          tomorrow_plan: tomorrow_plan ?? '',
          mood: mood ?? 3,
          period_end: pEnd,
          tasks_completed: tasksCompleted,
          tasks_total: tasksTotal,
          study_minutes: studyMinutes,
          planned_minutes: plannedMinutes,
          deviation_rate: Math.round(deviationRate * 100) / 100,
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('更新总结失败:', error)
        return NextResponse.json({ error: '更新总结失败' }, { status: 500 })
      }

      review = data
    } else {
      // 创建新总结（触发积分）
      const { data, error } = await supabase
        .from('reviews')
        .insert({
          user_id: user.id,
          period,
          period_start: pStart,
          period_end: pEnd,
          content,
          tomorrow_plan: tomorrow_plan ?? '',
          mood: mood ?? 3,
          tasks_completed: tasksCompleted,
          tasks_total: tasksTotal,
          study_minutes: studyMinutes,
          planned_minutes: plannedMinutes,
          deviation_rate: Math.round(deviationRate * 100) / 100,
        })
        .select()
        .single()

      if (error) {
        console.error('创建总结失败:', error)
        return NextResponse.json({ error: '创建总结失败' }, { status: 500 })
      }

      review = data
    }

    return NextResponse.json({ review }, { status: existing ? 200 : 201 })
  } catch (error) {
    console.error('创建总结异常:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
