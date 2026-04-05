'use client'

import { useEffect, useState } from 'react'
import type { PointsLog } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Star,
  MapPin,
  CheckCircle2,
  Gift,
  Moon,
  Timer,
  ArrowLeft,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'

// ============================================================
// 积分来源类型配置
// ============================================================
const POINT_TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  scene_checkin: {
    label: '场景签到',
    icon: MapPin,
    color: 'text-blue-500',
  },
  task_complete: {
    label: '任务完成',
    icon: CheckCircle2,
    color: 'text-green-500',
  },
  daily_bonus: {
    label: '每日奖励',
    icon: Gift,
    color: 'text-purple-500',
  },
  sleep: {
    label: '睡眠打卡',
    icon: Moon,
    color: 'text-indigo-500',
  },
  pomodoro: {
    label: '番茄钟',
    icon: Timer,
    color: 'text-red-500',
  },
}

// ============================================================
// 辅助函数
// ============================================================
function formatTime(isoString: string): string {
  const date = new Date(isoString)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

// ============================================================
// 主页面组件
// ============================================================
export default function PointsPage() {
  const [balance, setBalance] = useState(0)
  const [todayEarned, setTodayEarned] = useState(0)
  const [logs, setLogs] = useState<PointsLog[]>([])
  const [stats, setStats] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        // 并行请求积分数据和统计数据
        const [pointsRes, statsRes] = await Promise.all([
          fetch('/api/points'),
          fetch('/api/points?action=stats'),
        ])

        if (pointsRes.ok) {
          const data = await pointsRes.json()
          setBalance(data.balance)
          setTodayEarned(data.today_earned)
          setLogs(data.logs)
        }

        if (statsRes.ok) {
          const data = await statsRes.json()
          setStats(data.stats)
        }
      } catch (error) {
        console.error('获取积分数据失败:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-4">
      {/* 返回按钮 */}
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        返回
      </Link>

      {/* 积分余额卡片 */}
      <Card className="mb-4 overflow-hidden border-yellow-500/20 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30">
        <CardContent className="flex flex-col items-center py-8">
          <div className="mb-2 flex items-center gap-2">
            <Star className="size-8 text-yellow-500" />
            <span className="text-4xl font-bold text-yellow-600 dark:text-yellow-400">
              {balance}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">总积分</p>
          <Separator className="my-3 w-32 bg-yellow-500/20" />
          <p className="text-sm text-muted-foreground">
            今日获得{' '}
            <span className="font-medium text-green-600 dark:text-green-400">
              +{todayEarned}
            </span>{' '}
            积分
          </p>
        </CardContent>
      </Card>

      {/* 积分来源统计 */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>积分来源</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(POINT_TYPE_CONFIG).map(([type, config]) => {
              const Icon = config.icon
              const points = stats[type] ?? 0
              return (
                <div
                  key={type}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`size-5 ${config.color}`} />
                    <span className="text-sm">{config.label}</span>
                  </div>
                  <Badge variant="secondary" className="font-mono">
                    +{points}
                  </Badge>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 积分流水列表 */}
      <Card>
        <CardHeader>
          <CardTitle>积分明细</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Star className="mb-2 size-8 opacity-30" />
                <p className="text-sm">暂无积分记录</p>
              </div>
            ) : (
              <div className="px-4">
                {logs.map((log, index) => {
                  const config = POINT_TYPE_CONFIG[log.type]
                  const Icon = config?.icon ?? Star
                  const isPositive = log.points > 0

                  return (
                    <div key={log.id}>
                      <div className="flex items-center justify-between py-3">
                        <div className="flex items-start gap-3">
                          <Icon
                            className={`mt-0.5 size-4 shrink-0 ${config?.color ?? 'text-muted-foreground'}`}
                          />
                          <div>
                            <p className="text-sm leading-tight">
                              {log.description || config?.label || log.type}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {formatTime(log.created_at)}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`shrink-0 text-sm font-medium ${
                            isPositive
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {isPositive ? '+' : ''}
                          {log.points}
                        </span>
                      </div>
                      {index < logs.length - 1 && <Separator />}
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
