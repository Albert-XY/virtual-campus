import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_PERIODS = ['yearly', 'monthly', 'weekly']
const VALID_STATUSES = ['active', 'completed', 'abandoned']

// ============================================================
// GET /api/goals — 获取当前用户的学习目标
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
    const period = searchParams.get('period')
    const includeChildren = searchParams.get('include_children') === 'true'
    const activeOnly = searchParams.get('active_only') === 'true'

    // 构建查询
    let query = supabase
      .from('learning_goals')
      .select('*')
      .eq('user_id', user.id)

    if (period && VALID_PERIODS.includes(period)) {
      query = query.eq('period', period)
    }

    if (activeOnly) {
      query = query.eq('status', 'active')
    }

    query = query.order('start_date', { ascending: false })

    const { data: goals, error } = await query

    if (error) {
      console.error('查询学习目标失败:', error)
      return NextResponse.json({ error: '查询学习目标失败' }, { status: 500 })
    }

    // 如果需要包含子目标
    if (includeChildren && goals && goals.length > 0) {
      const goalIds = goals.map((g) => g.id)

      const { data: children, error: childrenError } = await supabase
        .from('learning_goals')
        .select('*')
        .eq('user_id', user.id)
        .in('parent_goal_id', goalIds)
        .order('start_date', { ascending: false })

      if (childrenError) {
        console.error('查询子目标失败:', childrenError)
        // 子目标查询失败不影响主目标返回
      }

      // 将子目标挂载到对应的父目标上
      const childrenMap = new Map<string, unknown[]>()
      if (children) {
        for (const child of children) {
          const parentId = child.parent_goal_id as string
          if (!childrenMap.has(parentId)) {
            childrenMap.set(parentId, [])
          }
          childrenMap.get(parentId)!.push(child)
        }
      }

      // 为每个目标添加 children 字段
      const goalsWithChildren = goals.map((goal) => ({
        ...goal,
        children: childrenMap.get(goal.id) ?? [],
      }))

      return NextResponse.json({ goals: goalsWithChildren })
    }

    return NextResponse.json({ goals: goals ?? [] })
  } catch (error) {
    console.error('获取学习目标异常:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// ============================================================
// POST /api/goals — 创建学习目标
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

    const {
      period,
      title,
      description,
      total_units,
      start_date,
      target_date,
      parent_goal_id,
    } = body as {
      period: string
      title: string
      description?: string
      total_units: number
      start_date?: string
      target_date?: string | null
      parent_goal_id?: string | null
    }

    // 验证必填字段
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: '标题为必填项' }, { status: 400 })
    }

    if (!VALID_PERIODS.includes(period)) {
      return NextResponse.json(
        { error: '周期必须为 yearly、monthly 或 weekly' },
        { status: 400 }
      )
    }

    if (
      total_units === undefined ||
      total_units === null ||
      !Number.isInteger(total_units) ||
      total_units < 1
    ) {
      return NextResponse.json(
        { error: '总单元数必须为大于等于 1 的整数' },
        { status: 400 }
      )
    }

    // 如果是 weekly 且提供了 parent_goal_id，验证父目标存在
    if (period === 'weekly' && parent_goal_id) {
      const { data: parent, error: parentError } = await supabase
        .from('learning_goals')
        .select('id')
        .eq('id', parent_goal_id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (parentError) {
        console.error('查询父目标失败:', parentError)
        return NextResponse.json({ error: '查询父目标失败' }, { status: 500 })
      }

      if (!parent) {
        return NextResponse.json({ error: '父目标不存在' }, { status: 404 })
      }
    }

    // 构建插入数据
    const insertData: Record<string, unknown> = {
      user_id: user.id,
      period,
      title: title.trim(),
      total_units,
      completed_units: 0,
      status: 'active',
    }

    if (description !== undefined && description !== null) {
      insertData.description = description
    }

    if (start_date) {
      insertData.start_date = start_date
    }

    if (target_date !== undefined && target_date !== null) {
      insertData.target_date = target_date
    }

    if (parent_goal_id) {
      insertData.parent_goal_id = parent_goal_id
    }

    const { data: goal, error } = await supabase
      .from('learning_goals')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('创建学习目标失败:', error)
      console.error('插入数据:', JSON.stringify(insertData))
      return NextResponse.json({ error: `创建失败: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ goal }, { status: 201 })
  } catch (error) {
    console.error('创建学习目标异常:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// ============================================================
// PUT /api/goals — 更新学习目标
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

    const {
      id,
      title,
      description,
      total_units,
      target_date,
      status,
      completed_units,
    } = body as {
      id: string
      title?: string
      description?: string
      total_units?: number
      target_date?: string | null
      status?: string
      completed_units?: number
    }

    if (!id) {
      return NextResponse.json({ error: '缺少目标 ID' }, { status: 400 })
    }

    // 验证目标存在且属于当前用户
    const { data: existing, error: fetchError } = await supabase
      .from('learning_goals')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: '目标不存在' }, { status: 404 })
    }

    // 构建更新数据
    const updateData: Record<string, unknown> = {}

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        return NextResponse.json({ error: '标题不能为空' }, { status: 400 })
      }
      updateData.title = title.trim()
    }

    if (description !== undefined) {
      updateData.description = description
    }

    if (total_units !== undefined) {
      if (!Number.isInteger(total_units) || total_units < 1) {
        return NextResponse.json(
          { error: '总单元数必须为大于等于 1 的整数' },
          { status: 400 }
        )
      }
      updateData.total_units = total_units
    }

    if (target_date !== undefined) {
      updateData.target_date = target_date
    }

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { error: '状态必须为 active、completed 或 abandoned' },
          { status: 400 }
        )
      }
      // 如果状态改为 completed，自动设置 completed_units = total_units
      if (status === 'completed') {
        updateData.completed_units = updateData.total_units ?? existing.total_units
      }
      updateData.status = status
    }

    if (completed_units !== undefined) {
      if (!Number.isInteger(completed_units) || completed_units < 0) {
        return NextResponse.json(
          { error: '已完成单元数必须为非负整数' },
          { status: 400 }
        )
      }
      updateData.completed_units = completed_units

      // 如果 completed_units >= total_units，自动设置状态为 completed
      const effectiveTotal = (updateData.total_units as number) ?? existing.total_units
      if (completed_units >= effectiveTotal) {
        updateData.status = 'completed'
        updateData.completed_units = effectiveTotal
      }
    }

    const { data: goal, error } = await supabase
      .from('learning_goals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('更新学习目标失败:', error)
      return NextResponse.json({ error: '更新学习目标失败' }, { status: 500 })
    }

    return NextResponse.json({ goal })
  } catch (error) {
    console.error('更新学习目标异常:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// ============================================================
// DELETE /api/goals — 删除学习目标（级联删除子目标）
// ============================================================
export async function DELETE(request: Request) {
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

    const { id } = body as { id: string }

    if (!id) {
      return NextResponse.json({ error: '缺少目标 ID' }, { status: 400 })
    }

    // 验证目标存在且属于当前用户
    const { data: existing, error: fetchError } = await supabase
      .from('learning_goals')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (fetchError || !existing) {
      return NextResponse.json({ error: '目标不存在' }, { status: 404 })
    }

    // 级联删除所有子目标（递归查找所有后代）
    const allIdsToDelete: string[] = [id]
    let currentParentIds = [id]

    // BFS 查找所有层级的子目标
    while (currentParentIds.length > 0) {
      const { data: children } = await supabase
        .from('learning_goals')
        .select('id')
        .eq('user_id', user.id)
        .in('parent_goal_id', currentParentIds)

      if (children && children.length > 0) {
        const childIds = children.map((c) => c.id)
        allIdsToDelete.push(...childIds)
        currentParentIds = childIds
      } else {
        break
      }
    }

    // 删除所有目标（子目标先删）
    const { error: deleteError } = await supabase
      .from('learning_goals')
      .delete()
      .in('id', allIdsToDelete)

    if (deleteError) {
      console.error('删除学习目标失败:', deleteError)
      return NextResponse.json({ error: '删除学习目标失败' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除学习目标异常:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
