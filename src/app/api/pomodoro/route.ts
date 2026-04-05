import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SceneType } from '@/types'

// ============================================================
// POST /api/pomodoro/start — 开始番茄钟
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
    const { scene, checkin_id, focus_minutes, break_minutes } = body as {
      scene: SceneType
      checkin_id?: string
      focus_minutes?: number
      break_minutes?: number
    }

    if (!scene) {
      return NextResponse.json({ error: '缺少场景参数' }, { status: 400 })
    }

    const focusMin = focus_minutes ?? 25
    const breakMin = break_minutes ?? 5

    if (focusMin < 1 || focusMin > 120) {
      return NextResponse.json(
        { error: '专注时长需在1-120分钟之间' },
        { status: 400 }
      )
    }

    if (breakMin < 1 || breakMin > 30) {
      return NextResponse.json(
        { error: '休息时长需在1-30分钟之间' },
        { status: 400 }
      )
    }

    const { data: session, error } = await supabase
      .from('pomodoro_sessions')
      .insert({
        user_id: user.id,
        checkin_id: checkin_id ?? null,
        scene,
        focus_minutes: focusMin,
        break_minutes: breakMin,
      })
      .select()
      .single()

    if (error) {
      console.error('创建番茄钟会话失败:', error)
      return NextResponse.json({ error: '创建会话失败' }, { status: 500 })
    }

    return NextResponse.json({ session }, { status: 201 })
  } catch (error) {
    console.error('开始番茄钟异常:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// ============================================================
// PUT /api/pomodoro/end — 结束番茄钟
// ============================================================
export async function PUT(request: Request) {
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
    const { session_id, is_completed } = body as {
      session_id: string
      is_completed: boolean
    }

    if (!session_id) {
      return NextResponse.json({ error: '缺少会话ID' }, { status: 400 })
    }

    // 验证会话属于当前用户
    const { data: existing, error: fetchError } = await supabase
      .from('pomodoro_sessions')
      .select('*')
      .eq('id', session_id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: '会话不存在' }, { status: 404 })
    }

    if (existing.ended_at) {
      return NextResponse.json({ error: '会话已结束' }, { status: 409 })
    }

    const { data: session, error } = await supabase
      .from('pomodoro_sessions')
      .update({
        ended_at: new Date().toISOString(),
        is_completed: is_completed ?? false,
      })
      .eq('id', session_id)
      .select()
      .single()

    if (error) {
      console.error('更新番茄钟会话失败:', error)
      return NextResponse.json({ error: '更新会话失败' }, { status: 500 })
    }

    return NextResponse.json({ session })
  } catch (error) {
    console.error('结束番茄钟异常:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// ============================================================
// GET /api/pomodoro/today — 获取今日番茄钟统计
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

    const { data: sessions, error } = await supabase
      .from('pomodoro_sessions')
      .select('*')
      .eq('user_id', user.id)
      .gte('started_at', `${today}T00:00:00`)
      .lt('started_at', `${today}T23:59:59`)
      .order('started_at', { ascending: false })

    if (error) {
      console.error('查询今日番茄钟失败:', error)
      return NextResponse.json({ error: '查询失败' }, { status: 500 })
    }

    const completedSessions = sessions?.filter((s) => s.is_completed) ?? []
    const totalFocusMinutes = completedSessions.reduce(
      (sum, s) => sum + s.focus_minutes,
      0
    )

    return NextResponse.json({
      sessions: sessions ?? [],
      total_focus_minutes: totalFocusMinutes,
      completed_count: completedSessions.length,
    })
  } catch (error) {
    console.error('获取今日番茄钟统计异常:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
