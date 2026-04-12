import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ============================================================
// GET /api/kanban — 看板聚合数据
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

    // 场景名称映射
    const sceneNames: Record<string, string> = {
      library: '图书馆',
      'study-room': '自习室',
      'exam-center': '考试中心',
      sports: '运动场',
      canteen: '食堂',
      dormitory: '宿舍',
      bulletin: '公告栏',
      shop: '校园商店',
    }

    // ----------------------------------------------------------
    // 1. 今日规划 + 任务
    // ----------------------------------------------------------
    const { data: plan, error: planError } = await supabase
      .from('daily_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('plan_date', today)
      .single()

    if (planError && planError.code !== 'PGRST116') {
      console.error('查询规划失败:', planError)
    }

    let tasks: unknown[] = []
    if (plan) {
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('plan_id', plan.id)
        .order('task_index', { ascending: true })

      if (!tasksError && tasksData) {
        tasks = tasksData
      }
    }

    // ----------------------------------------------------------
    // 2. 当前活跃签到
    // ----------------------------------------------------------
    const { data: activeCheckin } = await supabase
      .from('scene_checkins')
      .select('*')
      .eq('user_id', user.id)
      .is('check_out_at', null)
      .maybeSingle()

    // ----------------------------------------------------------
    // 3. 今日签到时间线
    // ----------------------------------------------------------
    const { data: todayCheckins } = await supabase
      .from('scene_checkins')
      .select('*')
      .eq('user_id', user.id)
      .gte('check_in_at', `${today}T00:00:00`)
      .lt('check_in_at', `${today}T23:59:59`)
      .order('check_in_at', { ascending: true })

    // ----------------------------------------------------------
    // 4. 今日积分
    // ----------------------------------------------------------
    const { data: todayLogs } = await supabase
      .from('points_logs')
      .select('points')
      .eq('user_id', user.id)
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`)

    const todayPoints = (todayLogs ?? []).reduce((sum, l) => sum + l.points, 0)

    // ----------------------------------------------------------
    // 5. plan_vs_actual: 规划 vs 实际
    // ----------------------------------------------------------
    let plannedMinutes = 0
    let actualMinutes = 0
    let completionRate = 0
    let accuracyAvg = 0

    if (plan && tasks.length > 0) {
      const allTasks = tasks as Array<{
        estimated_minutes: number
        actual_minutes: number | null
        accuracy_rate: number | null
        status: string
      }>

      plannedMinutes = allTasks.reduce((s, t) => s + t.estimated_minutes, 0)
      actualMinutes = allTasks
        .filter((t) => t.status === 'completed' && t.actual_minutes !== null)
        .reduce((s, t) => s + t.actual_minutes!, 0)

      const completedCount = allTasks.filter((t) => t.status === 'completed').length
      completionRate =
        allTasks.length > 0
          ? Number(((completedCount / allTasks.length) * 100).toFixed(1))
          : 0

      const completedWithAccuracy = allTasks.filter(
        (t) => t.status === 'completed' && t.accuracy_rate !== null
      )
      accuracyAvg =
        completedWithAccuracy.length > 0
          ? Number(
              (
                completedWithAccuracy.reduce((s, t) => s + t.accuracy_rate!, 0) /
                completedWithAccuracy.length
              ).toFixed(1)
            )
          : 0
    }

    const deviationRate =
      plannedMinutes > 0
        ? Number(
            (
              (Math.abs(actualMinutes - plannedMinutes) / plannedMinutes) *
              100
            ).toFixed(1)
          )
        : 0

    // ----------------------------------------------------------
    // 6. todo_items: 待办检查
    // ----------------------------------------------------------
    // 6a. 今日是否已写总结
    const { data: todayReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('user_id', user.id)
      .eq('period', 'daily')
      .eq('period_start', today)
      .maybeSingle()

    const hasDailyReview = !!todayReview

    // 6b. 今日是否已打卡睡眠
    const { data: todaySleep } = await supabase
      .from('sleep_logs')
      .select('id')
      .eq('user_id', user.id)
      .eq('log_date', today)
      .maybeSingle()

    const hasSleepLog = !!todaySleep

    // 6c. 连续天数（连续有规划的天数）
    const { data: recentPlans } = await supabase
      .from('daily_plans')
      .select('plan_date')
      .eq('user_id', user.id)
      .order('plan_date', { ascending: false })
      .limit(30)

    let streakDays = 0
    if (recentPlans && recentPlans.length > 0) {
      const checkDate = new Date()
      // 从今天开始往前检查连续天数
      for (let i = 0; i < 365; i++) {
        const dateStr = new Date(
          checkDate.getTime() - i * 24 * 60 * 60 * 1000
        )
          .toISOString()
          .split('T')[0]
        const hasPlan = recentPlans.some((p) => p.plan_date === dateStr)
        if (hasPlan) {
          streakDays++
        } else {
          // 如果是今天没有规划，不中断连续（可能还没创建）
          if (i === 0) continue
          break
        }
      }
    }

    // ----------------------------------------------------------
    // 7. 未读播报数量
    // ----------------------------------------------------------
    const { data: publishedBroadcasts } = await supabase
      .from('broadcasts')
      .select('id')
      .eq('is_published', true)
      .lt('published_at', `${today}T23:59:59`)

    const broadcastIds = (publishedBroadcasts ?? []).map((b) => b.id)

    let unreadBroadcasts = 0
    if (broadcastIds.length > 0) {
      const { data: views } = await supabase
        .from('broadcast_views')
        .select('broadcast_id')
        .eq('user_id', user.id)
        .in('broadcast_id', broadcastIds)

      const viewedIds = new Set((views ?? []).map((v) => v.broadcast_id))
      unreadBroadcasts = broadcastIds.filter((id) => !viewedIds.has(id)).length
    }

    // ----------------------------------------------------------
    // 组装返回
    // ----------------------------------------------------------
    return NextResponse.json({
      has_plan: !!plan,
      plan: plan
        ? {
            study_blocks: plan.study_blocks ?? [],
            rest_blocks: plan.rest_blocks ?? [],
            tasks: plan.tasks ?? [],
          }
        : null,
      tasks,
      active_scene: activeCheckin
        ? {
            scene: activeCheckin.scene,
            scene_name: sceneNames[activeCheckin.scene] ?? activeCheckin.scene,
            checkin_id: activeCheckin.id,
            started_at: activeCheckin.check_in_at,
          }
        : null,
      today_checkins: (todayCheckins ?? []).map((c: Record<string, unknown>) => ({
        id: c.id,
        scene: c.scene,
        scene_name: sceneNames[c.scene as string] ?? String(c.scene),
        check_in_at: c.check_in_at,
        check_out_at: c.check_out_at,
        duration_minutes: c.duration_minutes,
      })),
      today_points: todayPoints,
      plan_vs_actual: {
        planned_minutes: plannedMinutes,
        actual_minutes: actualMinutes,
        deviation_rate: deviationRate,
        completion_rate: completionRate,
        accuracy_avg: accuracyAvg,
      },
      todo_items: {
        has_daily_review: hasDailyReview,
        has_sleep_log: hasSleepLog,
        streak_days: streakDays,
      },
      unread_broadcasts: unreadBroadcasts,
    })
  } catch (error) {
    console.error('获取看板数据异常:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
