import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ============================================================
// GET /api/points — 获取积分余额和日志
// GET /api/points?action=stats — 获取积分统计
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
    // action=stats: 按类型分组统计总积分
    // ----------------------------------------------------------
    if (action === 'stats') {
      const { data: logs, error } = await supabase
        .from('points_logs')
        .select('type, points')
        .eq('user_id', user.id)

      if (error) {
        console.error('查询积分统计失败:', error)
        return NextResponse.json({ error: '查询失败' }, { status: 500 })
      }

      const stats: Record<string, number> = {
        scene_checkin: 0,
        task_complete: 0,
        daily_bonus: 0,
        sleep: 0,
        pomodoro: 0,
      }

      for (const log of logs ?? []) {
        if (stats[log.type] !== undefined) {
          stats[log.type] += log.points
        }
      }

      return NextResponse.json({ stats })
    }

    // ----------------------------------------------------------
    // 默认: 获取积分余额、今日获得和最近日志
    // ----------------------------------------------------------
    const today = new Date().toISOString().split('T')[0]

    // 查询总积分
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('total_points')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('查询积分余额失败:', profileError)
      return NextResponse.json({ error: '查询失败' }, { status: 500 })
    }

    // 查询今日获得积分
    const { data: todayLogs, error: todayError } = await supabase
      .from('points_logs')
      .select('points')
      .eq('user_id', user.id)
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`)

    if (todayError) {
      console.error('查询今日积分失败:', todayError)
      return NextResponse.json({ error: '查询失败' }, { status: 500 })
    }

    const todayEarned = (todayLogs ?? []).reduce((sum, l) => sum + l.points, 0)

    // 查询最近50条日志
    const { data: logs, error: logsError } = await supabase
      .from('points_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (logsError) {
      console.error('查询积分日志失败:', logsError)
      return NextResponse.json({ error: '查询失败' }, { status: 500 })
    }

    return NextResponse.json({
      balance: profile?.total_points ?? 0,
      today_earned: todayEarned,
      logs: logs ?? [],
    })
  } catch (error) {
    console.error('获取积分异常:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
