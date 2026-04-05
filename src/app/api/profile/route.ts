import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ============================================================
// GET /api/profile — 获取用户信息
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

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('查询用户信息失败:', error)
      return NextResponse.json({ error: '查询失败' }, { status: 500 })
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('获取用户信息异常:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// ============================================================
// PUT /api/profile — 更新用户信息
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
    const { nickname, avatar_url } = body as {
      nickname?: string
      avatar_url?: string
    }

    const updates: Record<string, unknown> = {}
    if (nickname !== undefined) {
      const trimmed = nickname.trim()
      if (trimmed.length === 0 || trimmed.length > 20) {
        return NextResponse.json(
          { error: '昵称长度需在1-20个字符之间' },
          { status: 400 }
        )
      }
      updates.nickname = trimmed
    }
    if (avatar_url !== undefined) {
      if (avatar_url !== null && avatar_url !== '') {
        try {
          new URL(avatar_url)
        } catch {
          return NextResponse.json(
            { error: '头像链接格式不正确' },
            { status: 400 }
          )
        }
      }
      updates.avatar_url = avatar_url
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '没有需要更新的字段' }, { status: 400 })
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      console.error('更新用户信息失败:', error)
      return NextResponse.json({ error: '更新失败' }, { status: 500 })
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('更新用户信息异常:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
