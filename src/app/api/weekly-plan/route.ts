import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ============================================================
// GET /api/weekly-plan — 获取本周规划
// GET /api/weekly-plan?action=history — 获取历史周规划
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
    // action=history: 获取历史周规划
    // ----------------------------------------------------------
    if (action === 'history') {
      const limit = parseInt(searchParams.get('limit') || '10', 10)

      const { data: plans, error } = await supabase
        .from('weekly_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('week_start', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('查询历史周规划失败:', error)
        return NextResponse.json({ error: '查询失败' }, { status: 500 })
      }

      return NextResponse.json({ plans: plans ?? [] })
    }

    // ----------------------------------------------------------
    // 默认: 获取本周规划
    // ----------------------------------------------------------
    // 计算本周周一
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(today)
    monday.setDate(diff)
    const weekStart = monday.toISOString().split('T')[0]

    const { data: plan, error } = await supabase
      .from('weekly_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start', weekStart)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('查询周规划失败:', error)
      return NextResponse.json({ error: '查询失败' }, { status: 500 })
    }

    return NextResponse.json({ plan: plan ?? null })
  } catch (error) {
    console.error('获取周规划异常:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// ============================================================
// POST /api/weekly-plan — 创建/更新周规划
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

    const { goals, focus_subjects, study_days, notes } = body

    if (!goals || !Array.isArray(goals)) {
      return NextResponse.json({ error: '缺少 goals 参数' }, { status: 400 })
    }

    // 计算本周周一
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(today)
    monday.setDate(diff)
    const weekStart = monday.toISOString().split('T')[0]

    // 检查是否已存在
    const { data: existing } = await supabase
      .from('weekly_plans')
      .select('id')
      .eq('user_id', user.id)
      .eq('week_start', weekStart)
      .single()

    let plan

    if (existing) {
      // 更新已有规划
      const { data, error } = await supabase
        .from('weekly_plans')
        .update({
          goals,
          focus_subjects: focus_subjects ?? [],
          study_days: study_days ?? [1, 2, 3, 4, 5],
          notes: notes ?? '',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('更新周规划失败:', error)
        return NextResponse.json({ error: '更新周规划失败' }, { status: 500 })
      }

      plan = data
    } else {
      // 创建新规划（触发积分）
      const { data, error } = await supabase
        .from('weekly_plans')
        .insert({
          user_id: user.id,
          week_start: weekStart,
          goals,
          focus_subjects: focus_subjects ?? [],
          study_days: study_days ?? [1, 2, 3, 4, 5],
          notes: notes ?? '',
        })
        .select()
        .single()

      if (error) {
        console.error('创建周规划失败:', error)
        return NextResponse.json({ error: '创建周规划失败' }, { status: 500 })
      }

      plan = data
    }

    return NextResponse.json({ plan }, { status: existing ? 200 : 201 })
  } catch (error) {
    console.error('创建周规划异常:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
