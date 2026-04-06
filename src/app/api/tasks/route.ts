import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ============================================================
// GET /api/tasks — 获取今日任务
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

    const today = new Date().toISOString().split('T')[0]

    // 查询今日规划
    const { data: plan, error: planError } = await supabase
      .from('daily_plans')
      .select('id')
      .eq('user_id', user.id)
      .eq('plan_date', today)
      .single()

    if (planError && planError.code !== 'PGRST116') {
      console.error('查询规划失败:', planError)
      return NextResponse.json({ error: '查询规划失败' }, { status: 500 })
    }

    if (!plan) {
      return NextResponse.json({ tasks: [] })
    }

    // 查询该规划下的所有任务
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('plan_id', plan.id)
      .order('task_index', { ascending: true })

    if (tasksError) {
      console.error('查询任务失败:', tasksError)
      return NextResponse.json({ error: '查询任务失败' }, { status: 500 })
    }

    // 已完成的任务排在最后
    const sortedTasks = (tasks ?? []).sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') return 1
      if (a.status !== 'completed' && b.status === 'completed') return -1
      return 0
    })

    return NextResponse.json({ tasks: sortedTasks })
  } catch (error) {
    console.error('获取任务异常:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// ============================================================
// PUT /api/tasks/start — 开始任务
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
    const { action, task_id, actual_minutes, accuracy_rate } = body as {
      action: 'start' | 'complete'
      task_id: string
      actual_minutes?: number
      accuracy_rate?: number
    }

    if (!task_id || !action) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 })
    }

    // 验证任务属于当前用户
    const { data: existing, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', task_id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 })
    }

    if (action === 'start') {
      // 开始任务
      const { data: task, error } = await supabase
        .from('tasks')
        .update({ status: 'in_progress' })
        .eq('id', task_id)
        .select()
        .single()

      if (error) {
        console.error('更新任务状态失败:', error)
        return NextResponse.json({ error: '更新任务失败' }, { status: 500 })
      }

      return NextResponse.json({ task })
    }

    if (action === 'complete') {
      // 完成任务
      if (actual_minutes === undefined || accuracy_rate === undefined) {
        return NextResponse.json(
          { error: '缺少实际用时或准确率' },
          { status: 400 }
        )
      }

      if (actual_minutes < 0) {
        return NextResponse.json(
          { error: '实际用时不能为负数' },
          { status: 400 }
        )
      }

      if (accuracy_rate < 0 || accuracy_rate > 100) {
        return NextResponse.json(
          { error: '准确率需在0-100之间' },
          { status: 400 }
        )
      }

      const { data: task, error } = await supabase
        .from('tasks')
        .update({
          status: 'completed',
          actual_minutes,
          accuracy_rate,
          completed_at: new Date().toISOString(),
        })
        .eq('id', task_id)
        .select()
        .single()

      if (error) {
        console.error('完成任务失败:', error)
        return NextResponse.json({ error: '完成任务失败' }, { status: 500 })
      }

      return NextResponse.json({ task })
    }

    return NextResponse.json({ error: '无效的操作' }, { status: 400 })
  } catch (error) {
    console.error('更新任务异常:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
