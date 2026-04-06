import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ============================================================
// GET /api/today — 返回今日状态概览
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

    // 1. 查询今日规划
    const { data: plan, error: planError } = await supabase
      .from('daily_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('plan_date', today)
      .single()

    if (planError && planError.code !== 'PGRST116') {
      console.error('查询规划失败:', planError)
      return NextResponse.json({ error: '查询规划失败' }, { status: 500 })
    }

    // 2. 查询任务
    let tasks: unknown[] = []
    if (plan) {
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('plan_id', plan.id)
        .order('task_index', { ascending: true })

      if (tasksError) {
        console.error('查询任务失败:', tasksError)
      } else {
        tasks = tasksData ?? []
      }
    }

    // 3. 查询当前活跃签到
    const { data: activeCheckin, error: activeError } = await supabase
      .from('scene_checkins')
      .select('*')
      .eq('user_id', user.id)
      .is('check_out_at', null)
      .maybeSingle()

    if (activeError) {
      console.error('查询活跃签到失败:', activeError)
    }

    // 4. 查询今日签到记录（时间线）
    const { data: todayCheckins, error: checkinsError } = await supabase
      .from('scene_checkins')
      .select('*')
      .eq('user_id', user.id)
      .gte('check_in_at', `${today}T00:00:00`)
      .lt('check_in_at', `${today}T23:59:59`)
      .order('check_in_at', { ascending: true })

    if (checkinsError) {
      console.error('查询今日签到记录失败:', checkinsError)
    }

    // 5. 查询今日积分
    const { data: todayLogs, error: pointsError } = await supabase
      .from('points_logs')
      .select('points')
      .eq('user_id', user.id)
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`)

    let todayPoints = 0
    if (!pointsError && todayLogs) {
      todayPoints = todayLogs.reduce((sum, l) => sum + l.points, 0)
    }

    // 6. 查询昨天的规划（用于复制）
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    const { data: yesterdayPlan, error: yesterdayError } = await supabase
      .from('daily_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('plan_date', yesterdayStr)
      .single()

    if (yesterdayError && yesterdayError.code !== 'PGRST116') {
      console.error('查询昨天规划失败:', yesterdayError)
    }

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

    return NextResponse.json({
      has_plan: !!plan,
      plan: plan ?? null,
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
      yesterday_plan: yesterdayPlan ?? null,
    })
  } catch (error) {
    console.error('获取今日概览异常:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
