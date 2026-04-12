import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns'
import { zhCN } from 'date-fns/locale'

// ============================================================
// GET /api/trends?metric=deviation|study_time|completion|accuracy&period=daily|weekly|monthly&days=7
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
    const metric = searchParams.get('metric') ?? 'deviation'
    const days = Math.min(Math.max(Number(searchParams.get('days')) || 7, 1), 90)

    const now = new Date()
    const startDate = startOfDay(subDays(now, days - 1))
    const dateRange = eachDayOfInterval({ start: startDate, end: startOfDay(now) })

    const labels = dateRange.map((d) => format(d, 'MM/dd', { locale: zhCN }))
    const values: number[] = new Array(dateRange.length).fill(0)

    for (let i = 0; i < dateRange.length; i++) {
      const dayStart = format(dateRange[i], "yyyy-MM-dd'T'00:00:00")
      const dayEnd = format(dateRange[i], "yyyy-MM-dd'T'23:59:59")

      if (metric === 'deviation') {
        // |actual_minutes - estimated_minutes| / estimated_minutes * 100，按天聚合取平均
        const { data: tasks } = await supabase
          .from('tasks')
          .select('estimated_minutes, actual_minutes')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('completed_at', dayStart)
          .lte('completed_at', dayEnd)
          .gt('estimated_minutes', 0)

        if (tasks && tasks.length > 0) {
          const deviations = tasks
            .filter((t) => t.actual_minutes !== null)
            .map(
              (t) =>
                (Math.abs(t.actual_minutes! - t.estimated_minutes) /
                  t.estimated_minutes) *
                100
            )
          values[i] =
            deviations.length > 0
              ? Number((deviations.reduce((a, b) => a + b, 0) / deviations.length).toFixed(1))
              : 0
        }
      } else if (metric === 'study_time') {
        // pomodoro_sessions.focus_minutes 按天聚合
        const { data: sessions } = await supabase
          .from('pomodoro_sessions')
          .select('focus_minutes')
          .eq('user_id', user.id)
          .eq('is_completed', true)
          .gte('started_at', dayStart)
          .lte('started_at', dayEnd)

        values[i] = sessions
          ? sessions.reduce((sum, s) => sum + s.focus_minutes, 0)
          : 0
      } else if (metric === 'completion') {
        // tasks中status='completed'的数量 / 总数量 * 100
        const { data: allTasks } = await supabase
          .from('tasks')
          .select('status')
          .eq('user_id', user.id)
          .gte('created_at', dayStart)
          .lte('created_at', dayEnd)

        if (allTasks && allTasks.length > 0) {
          const completed = allTasks.filter((t) => t.status === 'completed').length
          values[i] = Number(
            ((completed / allTasks.length) * 100).toFixed(1)
          )
        }
      } else if (metric === 'accuracy') {
        // tasks中accuracy_rate的平均值
        const { data: tasks } = await supabase
          .from('tasks')
          .select('accuracy_rate')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .not('accuracy_rate', 'is', null)
          .gte('completed_at', dayStart)
          .lte('completed_at', dayEnd)

        if (tasks && tasks.length > 0) {
          const sum = tasks.reduce((s, t) => s + t.accuracy_rate!, 0)
          values[i] = Number((sum / tasks.length).toFixed(1))
        }
      }
    }

    return NextResponse.json({ labels, values })
  } catch (error) {
    console.error('获取趋势数据异常:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
