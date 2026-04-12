import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ============================================================
// GET /api/broadcasts/view — 获取当前用户未读播报
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

    const now = new Date().toISOString()

    // 查询已发布的播报
    const { data: publishedBroadcasts, error: pubError } = await supabase
      .from('broadcasts')
      .select('id')
      .eq('is_published', true)
      .lte('published_at', now)

    if (pubError) {
      console.error('查询已发布播报失败:', pubError)
      return NextResponse.json({ error: '查询播报失败' }, { status: 500 })
    }

    const allIds = (publishedBroadcasts ?? []).map((b) => b.id)

    if (allIds.length === 0) {
      return NextResponse.json({ broadcasts: [] })
    }

    // 查询用户已查看的播报
    const { data: views, error: viewError } = await supabase
      .from('broadcast_views')
      .select('broadcast_id')
      .eq('user_id', user.id)
      .in('broadcast_id', allIds)

    if (viewError) {
      console.error('查询已读记录失败:', viewError)
      return NextResponse.json({ error: '查询已读记录失败' }, { status: 500 })
    }

    const viewedIds = new Set((views ?? []).map((v) => v.broadcast_id))
    const unreadIds = allIds.filter((id) => !viewedIds.has(id))

    if (unreadIds.length === 0) {
      return NextResponse.json({ broadcasts: [] })
    }

    // 获取未读播报的完整内容
    const { data: broadcasts, error } = await supabase
      .from('broadcasts')
      .select('*')
      .in('id', unreadIds)
      .order('published_at', { ascending: true })

    if (error) {
      console.error('查询未读播报失败:', error)
      return NextResponse.json({ error: '查询播报失败' }, { status: 500 })
    }

    return NextResponse.json({ broadcasts: broadcasts ?? [] })
  } catch (error) {
    console.error('获取未读播报异常:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// ============================================================
// POST /api/broadcasts/view — 标记播报为已读
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const { broadcast_id } = body

    if (!broadcast_id) {
      return NextResponse.json(
        { error: '缺少必填字段: broadcast_id' },
        { status: 400 }
      )
    }

    // 使用 upsert 处理重复标记
    const { error } = await supabase
      .from('broadcast_views')
      .upsert(
        {
          user_id: user.id,
          broadcast_id,
          viewed_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,broadcast_id' }
      )

    if (error) {
      console.error('标记已读失败:', error)
      return NextResponse.json({ error: '标记已读失败' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('标记播报已读异常:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
