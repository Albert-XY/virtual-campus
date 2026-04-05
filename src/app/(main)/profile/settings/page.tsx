'use client'

import Link from 'next/link'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Bell,
  Moon,
  Info,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
      {/* 顶部导航 */}
      <div className="flex items-center gap-3">
        <Link href="/profile">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-bold">设置</h1>
      </div>

      {/* 通知设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="size-4 text-[#1E40AF]" />
            通知设置
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="divide-y">
            <button
              onClick={() => toast.info('通知设置功能即将开放，敬请期待')}
              className="w-full"
            >
              <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
                <span className="text-sm">学习提醒</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">即将开放</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </div>
            </button>
            <button
              onClick={() => toast.info('通知设置功能即将开放，敬请期待')}
              className="w-full"
            >
              <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
                <span className="text-sm">打卡提醒</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">即将开放</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* 外观设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="size-4 text-[#1E40AF]" />
            外观
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="divide-y">
            <button
              onClick={() => toast.info('深色模式功能即将开放，敬请期待')}
              className="w-full"
            >
              <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
                <span className="text-sm">深色模式</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">即将开放</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* 关于 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="size-4 text-[#1E40AF]" />
            关于
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">应用名称</span>
            <span className="text-sm font-medium">虚拟校园</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">版本号</span>
            <span className="text-sm font-medium">v0.1.0</span>
          </div>
          <Separator />
          <div className="text-sm text-muted-foreground leading-relaxed">
            虚拟校园是一款面向学生的自主学习平台，通过游戏化的方式帮助学生养成良好学习习惯。包含每日规划、番茄钟专注、场景打卡、睡眠管理等核心功能。
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
