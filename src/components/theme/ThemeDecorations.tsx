'use client'

import { useEffect, useState } from 'react'

/**
 * ThemeDecorations - 主题特定的视觉装饰层
 *
 * 根据当前主题添加独特的视觉元素：
 * - Star Citizen: 全息网格、扫描线、角落装饰
 * - Mirror's Edge: 红色指引线、几何切割
 * - Pixel: 像素网格、CRT效果
 * - Magazine: 霓虹光晕、噪点
 */

interface ThemeDecorationsProps {
  theme: string
}

export default function ThemeDecorations({ theme }: ThemeDecorationsProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  // Star Citizen: 全息座舱装饰
  if (theme === 'star-citizen') {
    return (
      <>
        {/* 顶部状态栏装饰 */}
        <div className="fixed top-0 left-0 right-0 h-8 pointer-events-none z-30">
          <div className="absolute inset-0 bg-gradient-to-b from-[rgba(0,153,221,0.05)] to-transparent" />
          <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[rgba(0,153,221,0.3)] to-transparent" />
          {/* 角落装饰 */}
          <div className="absolute top-2 left-2 w-16 h-px bg-[rgba(0,153,221,0.4)]" />
          <div className="absolute top-2 left-2 w-px h-4 bg-[rgba(0,153,221,0.4)]" />
          <div className="absolute top-2 right-2 w-16 h-px bg-[rgba(0,153,221,0.4)]" />
          <div className="absolute top-2 right-2 w-px h-4 bg-[rgba(0,153,221,0.4)]" />
        </div>

        {/* 底部装饰 */}
        <div className="fixed bottom-0 left-0 right-0 h-6 pointer-events-none z-30">
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(0,153,221,0.03)] to-transparent" />
          <div className="absolute bottom-2 left-2 w-12 h-px bg-[rgba(0,153,221,0.3)]" />
          <div className="absolute bottom-2 left-2 w-px h-3 bg-[rgba(0,153,221,0.3)]" />
          <div className="absolute bottom-2 right-2 w-12 h-px bg-[rgba(0,153,221,0.3)]" />
          <div className="absolute bottom-2 right-2 w-px h-3 bg-[rgba(0,153,221,0.3)]" />
        </div>

        {/* 动态扫描线 */}
        <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
          <div
            className="absolute w-full h-px bg-gradient-to-r from-transparent via-[rgba(0,153,221,0.15)] to-transparent animate-scan"
            style={{
              animation: 'scanLine 8s linear infinite',
            }}
          />
        </div>
      </>
    )
  }

  // Mirror's Edge: 极简红色指引线
  if (theme === 'mirrors-edge') {
    return (
      <>
        {/* 顶部红色指引线 */}
        <div className="fixed top-0 left-0 right-0 h-1 pointer-events-none z-30">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#E8302A] to-transparent opacity-60" />
        </div>

        {/* 角落红色标记 */}
        <div className="fixed top-4 left-4 w-8 h-8 pointer-events-none z-30">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-[#E8302A]" />
          <div className="absolute top-0 left-0 w-0.5 h-full bg-[#E8302A]" />
        </div>
        <div className="fixed top-4 right-4 w-8 h-8 pointer-events-none z-30">
          <div className="absolute top-0 right-0 w-full h-0.5 bg-[#E8302A]" />
          <div className="absolute top-0 right-0 w-0.5 h-full bg-[#E8302A]" />
        </div>
      </>
    )
  }

  // Pixel: CRT扫描线和像素网格
  if (theme === 'pixel') {
    return (
      <>
        {/* CRT扫描线动画 */}
        <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
          <div
            className="absolute w-full h-2 bg-[rgba(83,52,131,0.1)]"
            style={{
              animation: 'crtScan 6s linear infinite',
            }}
          />
        </div>
      </>
    )
  }

  // Magazine: 霓虹光晕
  if (theme === 'magazine') {
    return (
      <>
        {/* 角落霓虹光晕 */}
        <div className="fixed top-0 right-0 w-64 h-64 pointer-events-none z-30">
          <div
            className="absolute inset-0 rounded-full blur-3xl opacity-20"
            style={{
              background: 'radial-gradient(circle, #FF3D00 0%, transparent 70%)',
            }}
          />
        </div>
        <div className="fixed bottom-0 left-0 w-48 h-48 pointer-events-none z-30">
          <div
            className="absolute inset-0 rounded-full blur-3xl opacity-15"
            style={{
              background: 'radial-gradient(circle, #AA00FF 0%, transparent 70%)',
            }}
          />
        </div>
      </>
    )
  }

  return null
}
