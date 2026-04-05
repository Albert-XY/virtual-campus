'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Clock, Utensils, CheckCircle2, MapPin } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { DailyPlan, Task, PlanTaskType } from '@/types'

// 任务类型配置
const TASK_TYPE_CONFIG: Record<
  PlanTaskType,
  { label: string; color: string }
> = {
  knowledge: { label: '知识学习', color: 'bg-blue-100 text-blue-700' },
  practice: { label: '练习巩固', color: 'bg-green-100 text-green-700' },
  collaboration: { label: '协作讨论', color: 'bg-purple-100 text-purple-700' },
  self: { label: '自主学习', color: 'bg-orange-100 text-orange-700' },
}

const REST_TYPE_LABELS: Record<string, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
}

interface PlanSummaryProps {
  plan: DailyPlan
  tasks: Task[]
}

export default function PlanSummary({ plan, tasks }: PlanSummaryProps) {
  // 计算任务完成进度
  const completedCount = tasks.filter(
    (t) => t.status === 'completed'
  ).length
  const totalCount = tasks.length
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  // 格式化日期
  const formattedDate = (() => {
    try {
      return format(new Date(plan.plan_date + 'T00:00:00'), 'yyyy年M月d日 EEEE', {
        locale: zhCN,
      })
    } catch {
      return plan.plan_date
    }
  })()

  // 计算总学习时长
  const totalStudyMinutes = plan.study_blocks.reduce((sum, block) => {
    const [sh, sm] = block.start.split(':').map(Number)
    const [eh, em] = block.end.split(':').map(Number)
    return sum + (eh * 60 + em) - (sh * 60 + sm)
  }, 0)
  const studyHours = Math.floor(totalStudyMinutes / 60)
  const studyMins = totalStudyMinutes % 60

  return (
    <div className="space-y-4">
      {/* 日期和状态 */}
      <Card>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">今日规划</p>
              <p className="text-base font-semibold">{formattedDate}</p>
            </div>
            <div className="flex items-center gap-1.5">
              {plan.is_completed ? (
                <Badge className="bg-green-100 text-green-700">
                  <CheckCircle2 className="size-3" />
                  已完成
                </Badge>
              ) : (
                <Badge className="bg-[#1E40AF] text-white">
                  进行中
                </Badge>
              )}
            </div>
          </div>
          {totalStudyMinutes > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              计划学习 {studyHours > 0 ? `${studyHours}小时` : ''}
              {studyMins > 0 ? ` ${studyMins}分钟` : ''}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 任务完成进度 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">
            任务进度
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm mb-2">
            <span>
              已完成 {completedCount}/{totalCount} 个任务
            </span>
            <span className="font-semibold text-[#1E40AF]">
              {progressPercent}%
            </span>
          </div>
          <Progress value={progressPercent}>
            <div className="h-full bg-[#1E40AF] rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
          </Progress>
        </CardContent>
      </Card>

      {/* 学习区间 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1E40AF]">
            <Clock className="size-4" />
            学习区间
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {plan.study_blocks.map((block, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2"
            >
              <span className="text-sm font-medium">{block.start}</span>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <div className="h-px w-8 bg-blue-200" />
              </div>
              <span className="text-sm font-medium">{block.end}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 休息区间 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#F97316]">
            <Utensils className="size-4" />
            休息区间
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {plan.rest_blocks.map((block, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-lg bg-orange-50 px-3 py-2"
            >
              <Badge variant="secondary" className="text-xs">
                {REST_TYPE_LABELS[block.type] || block.type}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {block.start} - {block.end}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 任务列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1E40AF]">
            <span>&#128203;</span>
            今日任务
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {plan.tasks.map((task, index) => {
            // 查找对应的任务状态
            const taskRecord = tasks.find(
              (t) => t.task_index === index
            )
            const isCompleted = taskRecord?.status === 'completed'

            return (
              <div
                key={index}
                className={`rounded-lg border p-3 transition-colors ${
                  isCompleted
                    ? 'bg-green-50 border-green-200'
                    : 'bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        className={
                          TASK_TYPE_CONFIG[task.type as PlanTaskType]?.color ??
                          'bg-gray-100 text-gray-700'
                        }
                      >
                        {
                          TASK_TYPE_CONFIG[task.type as PlanTaskType]
                            ?.label ?? task.type
                        }
                      </Badge>
                      {isCompleted && (
                        <CheckCircle2 className="size-4 text-green-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-sm font-medium truncate">
                      {task.subject}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {task.topic}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {task.estimated_min}分钟
                  </span>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* 进入校园按钮 */}
      <Link href="/campus" className="block">
        <Button
          className="w-full h-11 text-base font-semibold bg-[#F97316] hover:bg-[#EA580C] text-white"
        >
          <MapPin className="size-4" />
          进入校园
        </Button>
      </Link>
    </div>
  )
}
