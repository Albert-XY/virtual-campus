import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ============================================================
// GET /api/monthly-plan — 获取本月规划
// GET /api/monthly-plan?action=history — 获取历史月规划
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
    // action=history: 获取历史月规划
    // ----------------------------------------------------------
    if (action === 'history') {
      const limit = parseInt(searchParams.get('limit') || '12', 10)

      const { data: plans, error } = await supabase
        .from('monthly_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('month_start', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('查询历史月规划失败:', error)
        return NextResponse.json({ error: '查询失败' }, { status: 500 })
      }

      return NextResponse.json({ plans: plans ?? [] })
    }

    // ----------------------------------------------------------
    // 默认: 获取本月规划
    // ----------------------------------------------------------
    const today = new Date()
    const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`

    const { data: plan, error } = await supabase
      .from('monthly_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('month_start', monthStart)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('查询月规划失败:', error)
      return NextResponse.json({ error: '查询失败' }, { status: 500 })
    }

    return NextResponse.json({ plan: plan ?? null })
  } catch (error) {
    console.error('获取月规划异常:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// ============================================================
// POST /api/monthly-plan — 创建/更新月规划
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

    const { goals, focus_areas, notes } = body

    if (!goals || !Array.isArray(goals)) {
      return NextResponse.json({ error: '缺少 goals 参数' }, { status: 400 })
    }

    // 计算本月1号
    const today = new Date()
    const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`

    // 检查是否已存在
    const { data: existing } = await supabase
      .from('monthly_plans')
      .select('id')
      .eq('user_id', user.id)
      .eq('month_start', monthStart)
      .single()

    let plan

    if (existing) {
      // 更新已有规划
      const { data, error } = await supabase
        .from('monthly_plans')
        .update({
          goals,
          focus_areas: focus_areas ?? [],
          notes: notes ?? '',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('更新月规划失败:', error)
        return NextResponse.json({ error: `更新失败: ${error.message}` }, { status: 500 })
      }

      plan = data
    } else {
      // 创建新规划（触发积分）
      const { data, error } = await supabase
        .from('monthly_plans')
        .insert({
          user_id: user.id,
          month_start: monthStart,
          goals,
          focus_areas: focus_areas ?? [],
          notes: notes ?? '',
        })
        .select()
        .single()

      if (error) {
        console.error('创建月规划失败:', error)
        return NextResponse.json({ error: `创建失败: ${error.message}` }, { status: 500 })
      }

      plan = data
    }

    return NextResponse.json({ plan }, { status: existing ? 200 : 201 })
  } catch (error) {
    console.error('创建月规划异常:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
