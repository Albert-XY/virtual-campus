'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * ImmersiveSceneLayout - 沉浸式场景布局
 *
 * 进入场景后：
 * - 隐藏顶部栏和侧边栏（通过 CSS class 控制）
 * - 全屏沉浸体验
 * - 独特的进入/离开过渡动画
 * - 底部固定的离开按钮
 *
 * 设计理念：场景不是工具面板，而是一个"地方"。
 * 进入图书馆就像真的走进图书馆——没有积分、没有通知、没有菜单。
 * 只有你、你的任务、和安静的氛围。
 */

interface ImmersiveSceneLayoutProps {
  children: React.ReactNode
  /** 场景名称 */
  sceneName: string
  /** 场景标识 (用于 CSS 变量前缀) */
  sceneId: string
  /** 返回路径 */
  backPath?: string
  /** 进入场景的回调（用于签到等） */
  onEnter?: () => Promise<void>
  /** 离开场景的回调（用于签退等） */
  onLeave?: () => Promise<void>
  /** 额外的底部操作区内容 */
  footerExtra?: React.ReactNode
  /** 自定义 className */
  className?: string
}

export default function ImmersiveSceneLayout({
  children,
  sceneName,
  sceneId,
  backPath = '/campus',
  onEnter,
  onLeave,
  footerExtra,
  className,
}: ImmersiveSceneLayoutProps) {
  const router = useRouter()
  const [entering, setEntering] = useState(true) // 进入动画
  const [leaving, setLeaving] = useState(false)  // 离开动画
  const [loading, setLoading] = useState(true)

  // 进入场景
  useEffect(() => {
    // 隐藏主布局的顶部栏和侧边栏
    document.body.classList.add('immersive-mode')

    const doEnter = async () => {
      try {
        await onEnter?.()
      } catch (e) {
        console.error('进入场景失败:', e)
      }
      // 进入动画结束
      setTimeout(() => {
        setEntering(false)
        setLoading(false)
      }, 800)
    }

    doEnter()

    return () => {
      // 离开时恢复主布局
      document.body.classList.remove('immersive-mode')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 离开场景
  const handleLeave = async () => {
    setLeaving(true)

    try {
      await onLeave?.()
    } catch (e) {
      console.error('离开场景失败:', e)
    }

    // 等待离开动画完成
    setTimeout(() => {
      router.push(backPath)
    }, 500)
  }

  return (
    <div
      className={cn(
        'immersive-scene',
        `immersive-scene--${sceneId}`,
        entering && 'immersive-scene--entering',
        leaving && 'immersive-scene--leaving',
        className
      )}
    >
      {/* 进入过渡遮罩 */}
      {entering && (
        <div className="immersive-scene__overlay">
          <div className="immersive-scene__overlay-content">
            <Loader2 className="size-6 animate-spin opacity-60" />
            <p className="mt-2 text-sm opacity-60">正在进入{sceneName}...</p>
          </div>
        </div>
      )}

      {/* 离开过渡遮罩 */}
      {leaving && (
        <div className="immersive-scene__overlay immersive-scene__overlay--leaving" />
      )}

      {/* 场景顶部栏 - 极简，只有返回按钮和场景名 */}
      <header className="immersive-scene__header">
        <button
          onClick={handleLeave}
          className="immersive-scene__back flex items-center gap-1.5 text-sm opacity-60 hover:opacity-100 transition-opacity"
        >
          <ArrowLeft className="size-4" />
          <span>离开{sceneName}</span>
        </button>
        <span className="immersive-scene__name text-xs opacity-40">
          {sceneName}
        </span>
      </header>

      {/* 场景主内容 */}
      <main className="immersive-scene__content">
        {loading ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <Loader2 className="size-6 animate-spin opacity-40" />
          </div>
        ) : (
          children
        )}
      </main>

      {/* 底部操作区 */}
      <footer className="immersive-scene__footer">
        {footerExtra}
        <button
          onClick={handleLeave}
          className="immersive-scene__leave-btn"
          disabled={leaving}
        >
          离开{sceneName}
        </button>
      </footer>
    </div>
  )
}
