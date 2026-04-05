import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SceneType } from '@/types'

const VALID_SCENE_TYPES: SceneType[] = [
  'library',
  'study-room',
  'exam-center',
  'sports',
  'canteen',
  'dormitory',
  'bulletin',
  'shop',
]

// ============================================================
// POST /api/scene/checkin — 开始签到
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
    const { scene } = body as { scene: SceneType }

    if (!scene) {
      return NextResponse.json({ error: '缺少场景参数' }, { status: 400 })
    }

    if (!VALID_SCENE_TYPES.includes(scene)) {
      return NextResponse.json({ error: '无效的场景参数' }, { status: 400 })
    }

    // 检查是否已在其他场景签到（同时只能在一个场景）
    const { data: activeCheckin, error: activeError } = await supabase
      .from('scene_checkins')
      .select('*')
      .eq('user_id', user.id)
      .is('check_out_at', null)
      .maybeSingle()

    if (activeError) {
      console.error('查询活跃签到失败:', activeError)
      return NextResponse.json({ error: '查询签到状态失败' }, { status: 500 })
    }

    if (activeCheckin) {
      const sceneNames: Record<SceneType, string> = {
        library: '图书馆',
        'study-room': '自习室',
        'exam-center': '考试中心',
        sports: '运动场',
        canteen: '食堂',
        dormitory: '宿舍',
        bulletin: '公告栏',
        shop: '校园商店',
      }
      const currentScene = sceneNames[activeCheckin.scene as SceneType] ?? String(activeCheckin.scene)
      return NextResponse.json(
        { error: `你当前正在${currentScene}中，请先离开后再进入其他场景` },
        { status: 409 }
      )
    }

    // 获取今日规划
    const today = new Date().toISOString().split('T')[0]
    const { data: plan, error: planError } = await supabase
      .from('daily_plans')
      .select('id, study_blocks')
      .eq('user_id', user.id)
      .eq('plan_date', today)
      .single()

    if (planError && planError.code !== 'PGRST116') {
      console.error('查询今日规划失败:', planError)
      return NextResponse.json({ error: '查询规划失败' }, { status: 500 })
    }

    // 判断当前是否在学习区间内
    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    let isInStudyBlock = false

    const studyBlocks = (plan as { id: string; study_blocks?: { start: string; end: string }[] } | null)?.study_blocks
    if (studyBlocks && Array.isArray(studyBlocks)) {
      isInStudyBlock = studyBlocks.some(
        (block: { start: string; end: string }) =>
          currentTime >= block.start && currentTime <= block.end
      )
    }

    // 创建签到记录
    const { data: checkin, error: checkinError } = await supabase
      .from('scene_checkins')
      .insert({
        user_id: user.id,
        plan_id: plan?.id ?? null,
        scene,
        is_in_study_block: isInStudyBlock,
      })
      .select()
      .single()

    if (checkinError) {
      console.error('创建签到失败:', checkinError)
      return NextResponse.json({ error: '签到失败' }, { status: 500 })
    }

    return NextResponse.json({ checkin }, { status: 201 })
  } catch (error) {
    console.error('签到异常:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// ============================================================
// PUT /api/scene/checkout — 结束签到
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
    const { checkin_id } = body as { checkin_id: string }

    if (!checkin_id) {
      return NextResponse.json({ error: '缺少签到ID' }, { status: 400 })
    }

    // 验证签到记录属于当前用户
    const { data: existing, error: fetchError } = await supabase
      .from('scene_checkins')
      .select('*')
      .eq('id', checkin_id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: '签到记录不存在' }, { status: 404 })
    }

    if (existing.check_out_at) {
      return NextResponse.json({ error: '已离开该场景' }, { status: 409 })
    }

    // 计算时长（分钟）
    const checkInTime = new Date(existing.check_in_at)
    const checkOutTime = new Date()
    const durationMinutes = Math.round(
      (checkOutTime.getTime() - checkInTime.getTime()) / 60000
    )

    // 更新签到记录
    const { data: checkin, error: updateError } = await supabase
      .from('scene_checkins')
      .update({
        check_out_at: checkOutTime.toISOString(),
        duration_minutes: durationMinutes,
      })
      .eq('id', checkin_id)
      .select()
      .single()

    if (updateError) {
      console.error('更新签到失败:', updateError)
      return NextResponse.json({ error: '离开场景失败' }, { status: 500 })
    }

    return NextResponse.json({ checkin })
  } catch (error) {
    console.error('离开场景异常:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// ============================================================
// GET /api/scene/active — 获取当前活跃的签到
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

    const { data: activeCheckin, error } = await supabase
      .from('scene_checkins')
      .select('*')
      .eq('user_id', user.id)
      .is('check_out_at', null)
      .maybeSingle()

    if (error) {
      console.error('查询活跃签到失败:', error)
      return NextResponse.json({ error: '查询签到状态失败' }, { status: 500 })
    }

    return NextResponse.json({ active_checkin: activeCheckin ?? null })
  } catch (error) {
    console.error('查询活跃签到异常:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
