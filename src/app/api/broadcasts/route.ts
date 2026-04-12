import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ============================================================
// GET /api/broadcasts — 获取已发布播报列表
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const now = new Date().toISOString()

    // 查询已发布且发布时间已到的播报
    const { data: broadcasts, error } = await supabase
      .from('broadcasts')
      .select('*')
      .eq('is_published', true)
      .lte('published_at', now)
      .order('published_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('查询播报失败:', error)
      return NextResponse.json({ error: '查询播报失败' }, { status: 500 })
    }

    // 查询当前用户已查看的播报
    const broadcastIds = (broadcasts ?? []).map((b) => b.id)
    let viewedIds = new Set<string>()

    if (broadcastIds.length > 0) {
      const { data: views } = await supabase
        .from('broadcast_views')
        .select('broadcast_id')
        .eq('user_id', user.id)
        .in('broadcast_id', broadcastIds)

      viewedIds = new Set((views ?? []).map((v) => v.broadcast_id))
    }

    const result = (broadcasts ?? []).map((b) => ({
      ...b,
      viewed: viewedIds.has(b.id),
    }))

    return NextResponse.json({ broadcasts: result })
  } catch (error) {
    console.error('获取播报列表异常:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// ============================================================
// POST /api/broadcasts — 创建播报（管理员/未来使用）
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
    const { title, content_type, content, media_url, expires_at } = body

    if (!title || !content_type || content === undefined) {
      return NextResponse.json(
        { error: '缺少必填字段: title, content_type, content' },
        { status: 400 }
      )
    }

    if (!['text', 'image', 'video'].includes(content_type)) {
      return NextResponse.json(
        { error: 'content_type 必须是 text, image 或 video' },
        { status: 400 }
      )
    }

    const { data: broadcast, error } = await supabase
      .from('broadcasts')
      .insert({
        title,
        content_type,
        content,
        media_url: media_url || null,
        expires_at: expires_at || null,
        created_by: user.id,
        is_published: false,
      })
      .select()
      .single()

    if (error) {
      console.error('创建播报失败:', error)
      return NextResponse.json({ error: '创建播报失败' }, { status: 500 })
    }

    return NextResponse.json({ broadcast }, { status: 201 })
  } catch (error) {
    console.error('创建播报异常:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// ============================================================
// PUT /api/broadcasts — 发布/取消发布播报
// ============================================================
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const { id, is_published } = body

    if (!id || is_published === undefined) {
      return NextResponse.json(
        { error: '缺少必填字段: id, is_published' },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = { is_published }
    if (is_published) {
      updateData.published_at = new Date().toISOString()
    }

    const { data: broadcast, error } = await supabase
      .from('broadcasts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('更新播报失败:', error)
      return NextResponse.json({ error: '更新播报失败' }, { status: 500 })
    }

    return NextResponse.json({ broadcast })
  } catch (error) {
    console.error('更新播报异常:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
