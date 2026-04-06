'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Clock, Utensils, CheckCircle2, MapPin, Pencil } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { DailyPlan, Task } from '@/types'

const REST_TYPE_LABELS: Record<string, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
}

interface PlanSummaryProps {
  plan: DailyPlan
  tasks: Task[]
  onReplan?: () => void
}

export default function PlanSummary({ plan, tasks, onReplan }: PlanSummaryProps) {
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
                <Badge
                  className="text-white border-0"
                  style={{ backgroundColor: 'var(--success)' }}
                >
                  <CheckCircle2 className="size-3" />
                  已完成
                </Badge>
              ) : (
                <Badge className="bg-[var(--accent)] text-white">
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
            <span className="font-semibold" style={{ color: 'var(--accent-color)' }}>
              {progressPercent}%
            </span>
          </div>
          <Progress value={progressPercent}>
            <div className="h-full rounded-full transition-all" style={{ width: `${progressPercent}%`, backgroundColor: 'var(--accent-color)' }} />
          </Progress>
        </CardContent>
      </Card>

      {/* 学习区间 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: 'var(--accent-color)' }}>
            <Clock className="size-4" />
            学习区间
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {plan.study_blocks.map((block, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-lg px-3 py-2"
              style={{ backgroundColor: 'var(--scene-library-bg)' }}
            >
              <span className="text-sm font-medium">{block.start}</span>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <div className="h-px w-8" style={{ backgroundColor: 'var(--scene-library)', opacity: 0.3 }} />
              </div>
              <span className="text-sm font-medium">{block.end}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 休息区间 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: 'var(--accent-color)' }}>
            <Utensils className="size-4" />
            休息区间
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {plan.rest_blocks.map((block, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-lg px-3 py-2"
              style={{ backgroundColor: 'var(--accent-light)' }}
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

      {/* 任务列表（简化：去掉任务类型 badge） */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: 'var(--accent-color)' }}>
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
                className="rounded-lg border p-3 transition-colors"
                style={{
                  backgroundColor: isCompleted ? 'var(--success-light)' : 'var(--bg-card)',
                  borderColor: isCompleted ? 'var(--success)' : 'var(--border-color)',
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {index + 1}
                      </span>
                      {isCompleted && (
                        <CheckCircle2 className="size-4 shrink-0" style={{ color: 'var(--success)' }} />
                      )}
                    </div>
                    <p className={`text-sm font-medium truncate ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                      {task.subject}
                    </p>
                    <p className={`text-xs text-muted-foreground truncate ${isCompleted ? 'line-through' : ''}`}>
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

      {/* 重新规划按钮 */}
      {onReplan && (
        <Button
          onClick={onReplan}
          variant="outline"
          className="w-full h-10 text-sm font-medium rounded-xl"
        >
          <Pencil className="size-4" />
          重新规划
        </Button>
      )}

      {/* 进入校园按钮（更突出） */}
      <Link href="/campus" className="block">
        <Button
          className="w-full h-12 text-base font-bold text-white rounded-xl shadow-lg transition-all active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, var(--hero-gradient-from) 0%, var(--hero-gradient-to) 100%)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <MapPin className="size-5" />
          进入校园
        </Button>
      </Link>
    </div>
  )
}
