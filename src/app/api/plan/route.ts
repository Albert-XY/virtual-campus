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

    // 查询今日规划
    const { data: plan, error: planError } = await supabase
      .from('daily_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('plan_date', today)
      .single()

    if (planError && planError.code !== 'PGRST116') {
      // PGRST116 = 没有找到行
      console.error('查询规划失败:', planError)
      return NextResponse.json({ error: '查询规划失败' }, { status: 500 })
    }

    if (!plan) {
      return NextResponse.json({ plan: null, tasks: [] })
    }

    // 查询任务状态
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('plan_id', plan.id)
      .order('task_index', { ascending: true })

    if (tasksError) {
      console.error('查询任务失败:', tasksError)
      return NextResponse.json({ error: '查询任务失败' }, { status: 500 })
    }

    return NextResponse.json({ plan, tasks: tasks ?? [] })
  } catch (error) {
    console.error('获取规划异常:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

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
    const { study_blocks, rest_blocks, tasks } = body

    // 验证
    if (!study_blocks || study_blocks.length === 0) {
      return NextResponse.json(
        { error: '至少需要1个学习区间' },
        { status: 400 }
      )
    }

    if (!tasks || tasks.length === 0) {
      return NextResponse.json(
        { error: '至少需要1个任务' },
        { status: 400 }
      )
    }

    // 检查是否已有今日规划
    const today = new Date().toISOString().split('T')[0]
    const { data: existingPlan } = await supabase
      .from('daily_plans')
      .select('id')
      .eq('user_id', user.id)
      .eq('plan_date', today)
      .single()

    if (existingPlan) {
      return NextResponse.json(
        { error: '今日已有规划，请勿重复提交' },
        { status: 409 }
      )
    }

    // 创建规划
    const { data: plan, error: planError } = await supabase
      .from('daily_plans')
      .insert({
        user_id: user.id,
        plan_date: today,
        study_blocks,
        rest_blocks: rest_blocks ?? [],
        tasks,
      })
      .select()
      .single()

    if (planError) {
      console.error('创建规划失败:', planError)
      return NextResponse.json({ error: '创建规划失败' }, { status: 500 })
    }

    // 创建任务记录
    if (tasks.length > 0) {
      const taskRows = tasks.map(
        (task: {
          type: string
          subject: string
          topic: string
          estimated_min: number
        },
          index: number
        ) => ({
          user_id: user.id,
          plan_id: plan.id,
          task_index: index,
          task_type: task.type,
          subject: task.subject,
          topic: task.topic,
          estimated_minutes: task.estimated_min,
        })
      )

      const { error: tasksError } = await supabase
        .from('tasks')
        .insert(taskRows)

      if (tasksError) {
        console.error('创建任务失败:', tasksError)
        // 规划已创建但任务创建失败，仍然返回成功
      }
    }

    return NextResponse.json({ plan }, { status: 201 })
  } catch (error) {
    console.error('创建规划异常:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
