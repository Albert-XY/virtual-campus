'use client'

import React from 'react'
import { BookOpen, Pencil, X } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

// ============================================================
// 类型
// ============================================================
interface ScenePanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scene: 'library' | 'study-room'
  title: string
  children: React.ReactNode
}

// ============================================================
// 场景配置
// ============================================================
const sceneConfig = {
  library: {
    icon: BookOpen,
    colorVar: '--scene-library',
  },
  'study-room': {
    icon: Pencil,
    colorVar: '--scene-study',
  },
} as const

// ============================================================
// 组件
// ============================================================
export default function ScenePanel({
  open,
  onOpenChange,
  scene,
  title,
  children,
}: ScenePanelProps) {
  const config = sceneConfig[scene]
  const Icon = config.icon

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="rounded-t-2xl max-h-[85vh] overflow-hidden p-0"
      >
        {/* 拖拽指示条 */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* 头部 */}
        <SheetHeader className="flex-row items-center justify-between px-4 pb-2 pt-0">
          <SheetTitle className="flex items-center gap-2">
            <Icon
              className="size-5"
              style={{ color: `var(${config.colorVar})` }}
            />
            <span style={{ color: `var(${config.colorVar})` }}>{title}</span>
          </SheetTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="flex items-center justify-center size-8 rounded-full hover:bg-muted transition-colors"
          >
            <X className="size-4 text-muted-foreground" />
          </button>
        </SheetHeader>

        {/* 可滚动内容区域 */}
        <div className="overflow-y-auto flex-1 px-4 pb-6">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  )
}
