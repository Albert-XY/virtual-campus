import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/sleep/today - 获取今日睡眠记录
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

    const today = new Date().toISOString().split('T')[0]

    if (action === 'history') {
      // 获取最近7天记录
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

      const { data: logs, error } = await supabase
        .from('sleep_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('log_date', sevenDaysAgoStr)
        .order('log_date', { ascending: false })

      if (error) {
        console.error('查询睡眠历史失败:', error)
        return NextResponse.json({ error: '查询失败' }, { status: 500 })
      }

      return NextResponse.json({ logs: logs ?? [] })
    }

    if (action === 'streak') {
      // 获取连续早睡天数（sleep_time <= '22:30'）
      const { data: logs, error } = await supabase
        .from('sleep_logs')
        .select('log_date, sleep_time')
        .eq('user_id', user.id)
        .order('log_date', { ascending: false })
        .limit(30)

      if (error) {
        console.error('查询连续早睡失败:', error)
        return NextResponse.json({ error: '查询失败' }, { status: 500 })
      }

      let streak = 0
      const sortedLogs = (logs ?? []).sort(
        (a, b) => b.log_date.localeCompare(a.log_date)
      )

      // 从最近一天开始往前数连续早睡天数
      for (const log of sortedLogs) {
        const [h, m] = log.sleep_time.split(':').map(Number)
        const minutes = h * 60 + m
        if (minutes <= 22 * 60 + 30) {
          streak++
        } else {
          break
        }
      }

      return NextResponse.json({ streak })
    }

    // 默认：获取今日记录
    const { data: log, error } = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('log_date', today)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('查询今日睡眠记录失败:', error)
      return NextResponse.json({ error: '查询失败' }, { status: 500 })
    }

    return NextResponse.json({ log: log ?? null })
  } catch (error) {
    console.error('获取睡眠记录异常:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// POST /api/sleep/checkin - 晚安打卡
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
    const { action, sleep_time, wake_time } = body

    if (action === 'wakeup') {
      // 早安打卡：更新今日 sleep_logs 的 wake_time
      if (!wake_time) {
        return NextResponse.json(
          { error: '请提供起床时间' },
          { status: 400 }
        )
      }

      const today = new Date().toISOString().split('T')[0]

      const { data: existingLog, error: findError } = await supabase
        .from('sleep_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('log_date', today)
        .single()

      if (findError || !existingLog) {
        return NextResponse.json(
          { error: '未找到今日晚安打卡记录，请先打卡晚安' },
          { status: 404 }
        )
      }

      // 检查是否已经起床打卡
      if (existingLog) {
        const { data: fullLog } = await supabase
          .from('sleep_logs')
          .select('wake_time')
          .eq('id', existingLog.id)
          .single()

        if (fullLog && fullLog.wake_time && fullLog.wake_time !== '') {
          return NextResponse.json(
            { error: '今日已完成起床打卡' },
            { status: 409 }
          )
        }
      }

      const { data: log, error: updateError } = await supabase
        .from('sleep_logs')
        .update({ wake_time })
        .eq('id', existingLog.id)
        .select()
        .single()

      if (updateError) {
        console.error('起床打卡失败:', updateError)
        return NextResponse.json({ error: '起床打卡失败' }, { status: 500 })
      }

      return NextResponse.json({ log })
    }

    // 晚安打卡
    if (!sleep_time) {
      return NextResponse.json(
        { error: '请提供入睡时间' },
        { status: 400 }
      )
    }

    // 验证时间格式
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
    if (!timeRegex.test(sleep_time)) {
      return NextResponse.json(
        { error: '时间格式不正确，请使用 HH:MM 格式' },
        { status: 400 }
      )
    }

    const today = new Date().toISOString().split('T')[0]

    // 检查今日是否已打卡
    const { data: existingLog } = await supabase
      .from('sleep_logs')
      .select('id')
      .eq('user_id', user.id)
      .eq('log_date', today)
      .single()

    if (existingLog) {
      return NextResponse.json(
        { error: '今日已打卡，请勿重复打卡' },
        { status: 409 }
      )
    }

    // 创建睡眠记录，wake_time 暂填空字符串
    const { data: log, error: insertError } = await supabase
      .from('sleep_logs')
      .insert({
        user_id: user.id,
        log_date: today,
        sleep_time,
        wake_time: '',
        points_earned: 0, // 触发器会自动计算
      })
      .select()
      .single()

    if (insertError) {
      console.error('晚安打卡失败:', insertError)
      return NextResponse.json({ error: '晚安打卡失败' }, { status: 500 })
    }

    return NextResponse.json({ log }, { status: 201 })
  } catch (error) {
    console.error('睡眠打卡异常:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
