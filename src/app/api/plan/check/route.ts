import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    const { data: plan, error } = await supabase
      .from('daily_plans')
      .select('id')
      .eq('user_id', user.id)
      .eq('plan_date', today)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('检查规划失败:', error)
      return NextResponse.json({ has_plan: false }, { status: 500 })
    }

    return NextResponse.json({
      has_plan: !!plan,
      plan_id: plan?.id ?? undefined,
    })
  } catch (error) {
    console.error('检查规划异常:', error)
    return NextResponse.json({ has_plan: false }, { status: 500 })
  }
}
