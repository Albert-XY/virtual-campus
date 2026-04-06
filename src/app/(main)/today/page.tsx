'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Loader2,
  Zap,
  ClipboardList,
  MapPin,
  LogOut,
  Clock,
  Star,
  CheckCircle2,
  Circle,
  Copy,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

// ============================================================
// 类型定义
// ============================================================
interface TodayData {
  has_plan: boolean
  plan: Record<string, unknown> | null
  tasks: TaskRecord[]
  active_scene: {
    scene: string
    scene_name: string
    checkin_id: string
    started_at: string
  } | null
  today_checkins: CheckinRecord[]
  today_points: number
  yesterday_plan: Record<string, unknown> | null
}

interface TaskRecord {
  id: string
  task_index: number
  task_type: string
  subject: string
  topic: string
  estimated_minutes: number
  status: string
}

interface CheckinRecord {
  id: string
  scene: string
  scene_name: string
  check_in_at: string
  check_out_at: string | null
  duration_minutes: number | null
}

// 任务类型配置
const TASK_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  knowledge: { label: '知识学习', color: 'bg-blue-100 text-blue-700' },
  practice: { label: '练习巩固', color: 'bg-green-100 text-green-700' },
  collaboration: { label: '协作讨论', color: 'bg-purple-100 text-purple-700' },
  self: { label: '自主学习', color: 'bg-orange-100 text-orange-700' },
}

// 场景 emoji 映射
const SCENE_EMOJI: Record<string, string> = {
  library: '\u{1F4DA}',
  'study-room': '\u270F\uFE0F',
  dormitory: '\u{1F319}',
  'exam-center': '\u{1F3EB}',
  sports: '\u26BD',
  canteen: '\u{1F35C}',
  bulletin: '\u{1F4CB}',
  shop: '\u{1F3EA}',
}

// ============================================================
// 工具函数
// ============================================================
function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

function formatTime(isoStr: string): string {
  const d = new Date(isoStr)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

function getElapsedMinutes(isoStr: string): number {
  const start = new Date(isoStr)
  const now = new Date()
  return Math.round((now.getTime() - start.getTime()) / 60000)
}

// ============================================================
// 主页面
// ============================================================
export default function TodayPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<TodayData | null>(null)
  const [nickname, setNickname] = useState('')
  const [quickPlanning, setQuickPlanning] = useState(false)
  const [copying, setCopying] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/today')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (error) {
      console.error('获取今日数据失败:', error)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('id', user.id)
          .single()
        if (profile?.nickname) {
          setNickname(profile.nickname)
        }
      }

      await fetchData()
      setLoading(false)
    }

    init()
  }, [fetchData])

  // 快速规划
  const handleQuickPlan = async () => {
    setQuickPlanning(true)
    try {
      const res = await fetch('/api/plan?action=quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error || '快速规划失败')
        return
      }

      toast.success('规划创建成功！')
      await fetchData()
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setQuickPlanning(false)
    }
  }

  // 复制昨天的规划
  const handleCopyYesterday = async () => {
    if (!data?.yesterday_plan) return

    setCopying(true)
    try {
      const yesterdayPlan = data.yesterday_plan as {
        study_blocks: unknown[]
        rest_blocks: unknown[]
        tasks: unknown[]
      }

      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          study_blocks: yesterdayPlan.study_blocks,
          rest_blocks: yesterdayPlan.rest_blocks,
          tasks: yesterdayPlan.tasks,
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error || '复制规划失败')
        return
      }

      toast.success('已复制昨天的规划！')
      await fetchData()
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setCopying(false)
    }
  }

  // 离开当前场景
  const handleLeaveScene = async () => {
    if (!data?.active_scene) return

    try {
      const res = await fetch('/api/scene', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkin_id: data.active_scene.checkin_id }),
      })
      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error || '离开场景失败')
        return
      }

      toast.success('已离开场景')
      await fetchData()
    } catch {
      toast.error('网络错误，请重试')
    }
  }

  // 加载状态
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#1E40AF]" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6 text-center text-muted-foreground">
        加载失败，请刷新重试
      </div>
    )
  }

  const greeting = getGreeting()

  // 计算任务进度
  const tasks = data.tasks ?? []
  const completedTasks = tasks.filter((t) => t.status === 'completed').length
  const totalTasks = tasks.length
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-5">
      {/* 顶部问候语 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#1E40AF]">
            {greeting}，{nickname || '同学'}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString('zh-CN', {
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-yellow-50 px-3 py-1.5">
          <Star className="size-4 text-yellow-500" />
          <span className="text-sm font-semibold text-yellow-700">
            +{data.today_points}
          </span>
        </div>
      </div>

      {/* ============================================ */}
      {/* 状态1：未规划 */}
      {/* ============================================ */}
      {!data.has_plan && (
        <>
          {/* 大卡片提示 */}
          <div
            className="rounded-2xl p-6 text-white"
            style={{
              background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 50%, #60A5FA 100%)',
            }}
          >
            <div className="flex items-start gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/20">
                <ClipboardList className="size-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold">新的一天，先规划一下今天吧！</h3>
                <p className="mt-1 text-sm text-blue-100">
                  完成规划后即可进入虚拟校园开始学习
                </p>
              </div>
            </div>
          </div>

          {/* 快速规划 + 详细规划 */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleQuickPlan}
              disabled={quickPlanning}
              className="flex flex-col items-center gap-2 rounded-xl border-2 border-[#1E40AF]/20 bg-[#1E40AF]/5 p-4 transition-all active:scale-[0.97] disabled:opacity-50"
            >
              {quickPlanning ? (
                <Loader2 className="size-6 animate-spin text-[#1E40AF]" />
              ) : (
                <Zap className="size-6 text-[#1E40AF]" />
              )}
              <span className="text-sm font-semibold text-[#1E40AF]">快速规划</span>
              <span className="text-xs text-muted-foreground text-center">
                使用默认模板一键创建
              </span>
            </button>

            <Link href="/dashboard" className="flex flex-col items-center gap-2 rounded-xl border-2 border-[#F97316]/20 bg-[#F97316]/5 p-4 transition-all active:scale-[0.97]">
              <ClipboardList className="size-6 text-[#F97316]" />
              <span className="text-sm font-semibold text-[#F97316]">详细规划</span>
              <span className="text-xs text-muted-foreground text-center">
                自定义学习区间和任务
              </span>
            </Link>
          </div>

          {/* 复制昨天的规划 */}
          {data.yesterday_plan && (
            <button
              onClick={handleCopyYesterday}
              disabled={copying}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3 text-sm text-muted-foreground transition-colors hover:bg-gray-100 disabled:opacity-50"
            >
              {copying ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Copy className="size-4" />
              )}
              复制昨天的规划
            </button>
          )}
        </>
      )}

      {/* ============================================ */}
      {/* 状态2：已规划，有进行中的场景 */}
      {/* ============================================ */}
      {data.has_plan && data.active_scene && (
        <>
          {/* 当前场景卡片 */}
          <div
            className="rounded-2xl p-5 text-white"
            style={{
              background: 'linear-gradient(135deg, #059669 0%, #10B981 50%, #34D399 100%)',
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">
                {SCENE_EMOJI[data.active_scene.scene] || '\u{1F4CD}'}
              </span>
              <div>
                <p className="text-sm text-green-100">正在学习中</p>
                <h3 className="text-lg font-bold">
                  {data.active_scene.scene_name}
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-green-100">
              <Clock className="size-4" />
              <span>已学习 {getElapsedMinutes(data.active_scene.started_at)} 分钟</span>
            </div>
          </div>

          {/* 任务进度 */}
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">今日任务进度</span>
                <span className="font-semibold text-[#1E40AF]">
                  {completedTasks}/{totalTasks}
                </span>
              </div>
              <Progress value={progressPercent}>
                <div
                  className="h-full bg-[#1E40AF] rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </Progress>
            </CardContent>
          </Card>

          {/* 快捷操作 */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={handleLeaveScene}
              className="h-11 gap-2"
            >
              <LogOut className="size-4" />
              离开场景
            </Button>
            <Link href="/dashboard" className="block">
              <Button variant="outline" className="w-full h-11 gap-2">
                <ClipboardList className="size-4" />
                查看详情
              </Button>
            </Link>
          </div>
        </>
      )}

      {/* ============================================ */}
      {/* 状态3：已规划，无进行中的场景 */}
      {/* ============================================ */}
      {data.has_plan && !data.active_scene && (
        <>
          {/* 今日规划摘要 */}
          <Card>
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[#1E40AF]">今日规划</h3>
                <Badge className="bg-[#1E40AF] text-white">已规划</Badge>
              </div>

              {/* 学习区间 */}
              {data.plan && (data.plan.study_blocks as { start: string; end: string }[]).map((block, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2"
                >
                  <span className="text-sm font-medium">{block.start}</span>
                  <div className="h-px flex-1 mx-2 bg-blue-200" />
                  <span className="text-sm font-medium">{block.end}</span>
                </div>
              ))}

              {/* 任务进度 */}
              <div className="pt-1">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">任务进度</span>
                  <span className="font-semibold text-[#1E40AF]">
                    {completedTasks}/{totalTasks} ({progressPercent}%)
                  </span>
                </div>
                <Progress value={progressPercent}>
                  <div
                    className="h-full bg-[#1E40AF] rounded-full transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </Progress>
              </div>

              {/* 任务列表 */}
              {tasks.length > 0 && (
                <div className="space-y-2 pt-1">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className={`flex items-center gap-2 rounded-lg border p-2.5 ${
                        task.status === 'completed'
                          ? 'bg-green-50 border-green-200'
                          : 'bg-white'
                      }`}
                    >
                      {task.status === 'completed' ? (
                        <CheckCircle2 className="size-4 text-green-600 shrink-0" />
                      ) : (
                        <Circle className="size-4 text-gray-300 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            className={
                              TASK_TYPE_CONFIG[task.task_type]?.color ??
                              'bg-gray-100 text-gray-700'
                            }
                          >
                            {TASK_TYPE_CONFIG[task.task_type]?.label ?? task.task_type}
                          </Badge>
                          <span className="text-sm font-medium truncate">
                            {task.subject}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {task.topic}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {task.estimated_minutes}min
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 进入校园按钮 */}
          <Link href="/campus" className="block">
            <Button
              className="w-full h-12 text-base font-semibold text-white"
              style={{
                background: 'linear-gradient(135deg, #F97316 0%, #FB923C 100%)',
              }}
            >
              <MapPin className="size-5" />
              进入校园开始学习
            </Button>
          </Link>

          {/* 今日积分 */}
          {data.today_points > 0 && (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-yellow-50 px-4 py-3">
              <Star className="size-4 text-yellow-500" />
              <span className="text-sm text-yellow-700">
                今日已获得 <strong>{data.today_points}</strong> 积分
              </span>
            </div>
          )}
        </>
      )}

      {/* ============================================ */}
      {/* 底部时间线 */}
      {/* ============================================ */}
      {data.today_checkins.length > 0 && (
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground">
                今日时间线
              </h3>
              {data.has_plan && (
                <Link
                  href="/dashboard"
                  className="flex items-center gap-0.5 text-xs text-[#1E40AF]"
                >
                  查看详情
                  <ChevronRight className="size-3" />
                </Link>
              )}
            </div>
            <div className="space-y-2.5">
              {data.today_checkins.map((checkin) => (
                <div key={checkin.id} className="flex items-center gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className="size-2.5 rounded-full"
                      style={{
                        backgroundColor: checkin.check_out_at ? '#10B981' : '#F97316',
                      }}
                    />
                    {checkin !== data.today_checkins[data.today_checkins.length - 1] && (
                      <div className="w-px h-6 bg-gray-200" />
                    )}
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {SCENE_EMOJI[checkin.scene] || '\u{1F4CD}'}
                      </span>
                      <span className="text-sm">{checkin.scene_name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(checkin.check_in_at)}
                      {checkin.duration_minutes != null
                        ? ` ${checkin.duration_minutes}min`
                        : ' 进行中'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
