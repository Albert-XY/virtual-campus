import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ============================================================
// GET /api/insights?type=task_complete|review_submit|plan_create
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
    const type = searchParams.get('type') || 'task_complete'
    const subject = searchParams.get('subject')
    const estimatedMin = parseInt(searchParams.get('estimated_min') || '0', 10)
    const actualMin = parseInt(searchParams.get('actual_min') || '0', 10)

    const insights: string[] = []

    // ----------------------------------------------------------
    // 通用数据：最近7天的总结
    // ----------------------------------------------------------
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

    const { data: recentReviews } = await supabase
      .from('reviews')
      .select('period, deviation_rate, tasks_completed, tasks_total, study_minutes, created_at')
      .eq('user_id', user.id)
      .eq('period', 'daily')
      .gte('period_start', sevenDaysAgoStr)
      .order('period_start', { ascending: true })

    // ----------------------------------------------------------
    // 通用数据：最近7天的任务完成情况
    // ----------------------------------------------------------
    const { data: recentTasks } = await supabase
      .from('tasks')
      .select('subject, estimated_minutes, actual_minutes, accuracy_rate, status, created_at')
      .eq('user_id', user.id)
      .gte('created_at', sevenDaysAgoStr)
      .order('created_at', { ascending: false })

    // ----------------------------------------------------------
    // 通用数据：连续规划天数
    // ----------------------------------------------------------
    const { data: recentPlans } = await supabase
      .from('daily_plans')
      .select('plan_date')
      .eq('user_id', user.id)
      .gte('plan_date', sevenDaysAgoStr)
      .order('plan_date', { ascending: false })

    const streakDays = recentPlans ? recentPlans.length : 0

    // ----------------------------------------------------------
    // type=task_complete: 完成任务后的洞察
    // ----------------------------------------------------------
    if (type === 'task_complete' && subject && actualMin > 0) {
      // 1. 与预估时长的对比
      if (estimatedMin > 0) {
        const diff = actualMin - estimatedMin
        const diffPercent = Math.round((Math.abs(diff) / estimatedMin) * 100)

        if (diff <= -5) {
          // 比预估快
          insights.push(`${subject}比预估快了${Math.abs(diff)}分钟，你对这块掌握得不错`)
        } else if (diff >= 5) {
          // 比预估慢
          insights.push(`${subject}比预估多用了${diff}分钟，下次可以预估${actualMin}分钟左右`)
        } else {
          insights.push(`${subject}用时和预估几乎一致，时间把控很好`)
        }
      }

      // 2. 与历史同科目平均对比
      if (recentTasks) {
        const sameSubjectTasks = recentTasks.filter(
          (t) => t.subject === subject && t.status === 'completed' && t.actual_minutes
        )
        if (sameSubjectTasks.length >= 2) {
          const avgMin = Math.round(
            sameSubjectTasks.reduce((sum, t) => sum + (t.actual_minutes || 0), 0) /
              sameSubjectTasks.length
          )
          if (actualMin < avgMin - 5) {
            insights.push(`你最近${subject}平均用${avgMin}分钟，这次快了不少`)
          } else if (actualMin > avgMin + 10) {
            insights.push(`你最近${subject}平均用${avgMin}分钟，这次稍慢了一些`)
          }
        }
      }

      // 3. 今日完成进度
      const todayStr = new Date().toISOString().split('T')[0]
      const { data: todayPlan } = await supabase
        .from('daily_plans')
        .select('id')
        .eq('user_id', user.id)
        .eq('plan_date', todayStr)
        .single()

      if (todayPlan) {
        const { data: todayTasks } = await supabase
          .from('tasks')
          .select('status')
          .eq('user_id', user.id)
          .eq('plan_id', todayPlan.id)

        if (todayTasks && todayTasks.length > 0) {
          const completed = todayTasks.filter((t) => t.status === 'completed').length
          const total = todayTasks.length
          if (completed === total) {
            insights.push(`今日任务全部完成！`)
          } else if (completed === Math.ceil(total / 2)) {
            insights.push(`已完成一半任务，继续保持`)
          }
        }
      }
    }

    // ----------------------------------------------------------
    // type=review_submit: 提交总结后的洞察
    // ----------------------------------------------------------
    if (type === 'review_submit') {
      // 1. 偏差率趋势
      if (recentReviews && recentReviews.length >= 2) {
        const latest = recentReviews[recentReviews.length - 1]
        const previous = recentReviews[recentReviews.length - 2]
        const latestDev = latest?.deviation_rate ?? 0
        const prevDev = previous?.deviation_rate ?? 0

        if (prevDev > 0 && latestDev < prevDev) {
          const improved = prevDev - latestDev
          insights.push(`偏差率从${prevDev}%降到了${latestDev}%，降低了${improved}个百分点`)
        } else if (prevDev > 0 && latestDev > prevDev) {
          insights.push(`偏差率从${prevDev}%升到了${latestDev}%，看看是什么原因`)
        }
      }

      // 2. 连续天数反馈
      if (streakDays >= 3) {
        insights.push(`连续写总结${streakDays}天了，坚持就是进步`)
      }

      // 3. 任务完成率趋势
      if (recentReviews && recentReviews.length >= 3) {
        const recentThree = recentReviews.slice(-3)
        const avgCompletion = recentThree.reduce(
          (sum, r) =>
            sum +
            (r.tasks_total > 0 ? (r.tasks_completed / r.tasks_total) * 100 : 0),
          0
        ) / recentThree.length

        if (avgCompletion >= 80) {
          insights.push(`最近3天平均完成率${Math.round(avgCompletion)}%，效率很高`)
        } else if (avgCompletion < 50 && recentThree[0].tasks_total > 0) {
          insights.push(`最近完成率偏低，考虑减少每天的任务量`)
        }
      }
    }

    // ----------------------------------------------------------
    // type=plan_create: 创建规划后的反馈
    // ----------------------------------------------------------
    if (type === 'plan_create') {
      // 1. 连续规划天数
      if (streakDays >= 7) {
        insights.push(`连续规划${streakDays}天，节奏很稳定`)
      } else if (streakDays >= 3) {
        insights.push(`连续规划${streakDays}天，再坚持${7 - streakDays}天就满一周`)
      }

      // 2. 历史偏差率建议
      if (recentReviews && recentReviews.length >= 2) {
        const avgDev =
          recentReviews.reduce((sum, r) => sum + (r.deviation_rate || 0), 0) /
          recentReviews.length

        if (avgDev > 30) {
          insights.push(`最近平均偏差率${Math.round(avgDev)}%，建议适当增加预估时长`)
        } else if (avgDev <= 15 && avgDev > 0) {
          insights.push(`最近时间预估很准确，继续保持`)
        }
      }

      // 3. 同科目历史用时建议
      if (recentTasks && subject) {
        const sameSubjectDone = recentTasks.filter(
          (t) => t.subject === subject && t.status === 'completed' && t.actual_minutes
        )
        if (sameSubjectDone.length >= 2) {
          const avg = Math.round(
            sameSubjectDone.reduce((s, t) => s + (t.actual_minutes || 0), 0) /
              sameSubjectDone.length
          )
          insights.push(`${subject}历史平均用时${avg}分钟，可以参考这个预估`)
        }
      }
    }

    // ----------------------------------------------------------
    // type=subject_history: 查询某科目历史平均用时（供 PlanForm 使用）
    // ----------------------------------------------------------
    if (type === 'subject_history' && subject) {
      const { data: subjectTasks } = await supabase
        .from('tasks')
        .select('subject, estimated_minutes, actual_minutes, status')
        .eq('user_id', user.id)
        .eq('subject', subject)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20)

      if (subjectTasks && subjectTasks.length >= 2) {
        const avgActual = Math.round(
          subjectTasks.reduce((s, t) => s + (t.actual_minutes || 0), 0) / subjectTasks.length
        )
        const avgEstimated = Math.round(
          subjectTasks.reduce((s, t) => s + (t.estimated_minutes || 0), 0) / subjectTasks.length
        )
        const avgDeviation = avgEstimated > 0
          ? Math.round(((avgActual - avgEstimated) / avgEstimated) * 100)
          : 0

        return NextResponse.json({
          subject,
          count: subjectTasks.length,
          avg_actual: avgActual,
          avg_estimated: avgEstimated,
          avg_deviation: avgDeviation,
          suggested_min: Math.max(15, Math.round(avgActual * 1.1 / 5) * 5), // 向上取整到5分钟，加10%缓冲
        })
      }

      return NextResponse.json({ subject, count: 0 })
    }

    // ----------------------------------------------------------
    // type=review_context: 获取总结上下文数据（供 StructuredReview 使用）
    // ----------------------------------------------------------
    if (type === 'review_context') {
      const todayStr = new Date().toISOString().split('T')[0]

      // 今日任务数据
      const { data: todayPlan } = await supabase
        .from('daily_plans')
        .select('id')
        .eq('user_id', user.id)
        .eq('plan_date', todayStr)
        .single()

      let todayTasks: Array<{ subject: string; topic: string; status: string; estimated_minutes: number; actual_minutes: number | null }> = []
      if (todayPlan) {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('subject, topic, status, estimated_minutes, actual_minutes')
          .eq('user_id', user.id)
          .eq('plan_id', todayPlan.id)
        todayTasks = tasks ?? []
      }

      // 找出超时最多的科目
      const overTasks = todayTasks
        .filter((t) => t.status === 'completed' && t.actual_minutes && t.estimated_minutes)
        .map((t) => ({
          subject: t.subject,
          topic: t.topic,
          overMinutes: t.actual_minutes! - t.estimated_minutes,
          actualMinutes: t.actual_minutes!,
          estimatedMinutes: t.estimated_minutes,
        }))
        .filter((t) => t.overMinutes > 0)
        .sort((a, b) => b.overMinutes - a.overMinutes)

      // 找出完成得快的科目
      const fastTasks = todayTasks
        .filter((t) => t.status === 'completed' && t.actual_minutes && t.estimated_minutes)
        .map((t) => ({
          subject: t.subject,
          topic: t.topic,
          savedMinutes: t.estimated_minutes - t.actual_minutes!,
          actualMinutes: t.actual_minutes!,
          estimatedMinutes: t.estimated_minutes,
        }))
        .filter((t) => t.savedMinutes > 0)
        .sort((a, b) => b.savedMinutes - a.savedMinutes)

      // 未完成的任务
      const unfinishedTasks = todayTasks.filter((t) => t.status !== 'completed' && (t.subject || t.topic))

      // 前一天总结的偏差率
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      const { data: yesterdayReview } = await supabase
        .from('reviews')
        .select('deviation_rate, tasks_completed, tasks_total')
        .eq('user_id', user.id)
        .eq('period', 'daily')
        .eq('period_start', yesterdayStr)
        .single()

      return NextResponse.json({
        todayTasks: {
          total: todayTasks.length,
          completed: todayTasks.filter((t) => t.status === 'completed').length,
          overTasks: overTasks.slice(0, 3),
          fastTasks: fastTasks.slice(0, 3),
          unfinishedTasks,
        },
        yesterdayReview: yesterdayReview
          ? { deviation_rate: yesterdayReview.deviation_rate, completion_rate: yesterdayReview.tasks_total > 0 ? Math.round((yesterdayReview.tasks_completed / yesterdayReview.tasks_total) * 100) : 0 }
          : null,
        streakDays,
      })
    }

    return NextResponse.json({ insights })
  } catch (error) {
    console.error('获取洞察失败:', error)
    return NextResponse.json({ insights: [] })
  }
}
