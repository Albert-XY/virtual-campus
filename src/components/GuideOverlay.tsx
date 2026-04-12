'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { GUIDE_STEPS, type GuideStep } from '@/lib/guide'

interface GuideOverlayProps {
  currentStep: number
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
}

interface TargetRect {
  top: number
  left: number
  width: number
  height: number
}

const HIGHLIGHT_PADDING = 6
const BUBBLE_OFFSET = 12

export default function GuideOverlay({ currentStep, onNext, onPrev, onSkip }: GuideOverlayProps) {
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null)
  const [visible, setVisible] = useState(false)
  const [bubbleStyle, setBubbleStyle] = useState<React.CSSProperties>({})
  const [arrowStyle, setArrowStyle] = useState<React.CSSProperties>({})
  const bubbleRef = useRef<HTMLDivElement>(null)

  const step: GuideStep | undefined = GUIDE_STEPS[currentStep]

  // 计算目标元素位置和高亮区域
  const updatePosition = useCallback(() => {
    if (!step) return

    const targetEl = document.getElementById(step.targetId)
    if (!targetEl) {
      // 如果目标元素不在当前页面，跳过此步骤
      return
    }

    const rect = targetEl.getBoundingClientRect()
    setTargetRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    })

    // 计算气泡位置
    const bubbleWidth = 280
    const bubbleHeight = 200 // 预估高度
    const gap = BUBBLE_OFFSET

    let bubbleTop = 0
    let bubbleLeft = 0
    let arrowTop = 0
    let arrowLeft = 0
    let arrowRotation = 0

    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    switch (step.placement) {
      case 'bottom': {
        bubbleTop = rect.bottom + gap
        bubbleLeft = centerX - bubbleWidth / 2
        arrowTop = -8
        arrowLeft = bubbleWidth / 2 - 8
        arrowRotation = 45
        break
      }
      case 'top': {
        bubbleTop = rect.top - gap - bubbleHeight
        bubbleLeft = centerX - bubbleWidth / 2
        arrowTop = bubbleHeight - 1
        arrowLeft = bubbleWidth / 2 - 8
        arrowRotation = 45
        break
      }
      case 'left': {
        bubbleTop = centerY - bubbleHeight / 2
        bubbleLeft = rect.left - gap - bubbleWidth
        arrowTop = bubbleHeight / 2 - 8
        arrowLeft = bubbleWidth - 1
        arrowRotation = 45
        break
      }
      case 'right': {
        bubbleTop = centerY - bubbleHeight / 2
        bubbleLeft = rect.right + gap
        arrowTop = bubbleHeight / 2 - 8
        arrowLeft = -8
        arrowRotation = 45
        break
      }
    }

    // 确保气泡不超出屏幕边界
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    if (bubbleLeft < 8) bubbleLeft = 8
    if (bubbleLeft + bubbleWidth > viewportWidth - 8) {
      bubbleLeft = viewportWidth - bubbleWidth - 8
    }
    if (bubbleTop < 8) bubbleTop = 8
    if (bubbleTop + bubbleHeight > viewportHeight - 8) {
      bubbleTop = viewportHeight - bubbleHeight - 8
    }

    setBubbleStyle({
      position: 'fixed',
      top: bubbleTop,
      left: bubbleLeft,
      width: bubbleWidth,
      zIndex: 60,
    })

    setArrowStyle({
      position: 'absolute',
      top: arrowTop,
      left: arrowLeft,
      width: 16,
      height: 16,
      transform: `rotate(${arrowRotation}deg)`,
      backgroundColor: 'var(--bg-card, #fff)',
      borderRight: '1px solid var(--border-color, #e5e7eb)',
      borderBottom: '1px solid var(--border-color, #e5e7eb)',
    })
  }, [step])

  // 淡入动画 + 位置计算
  useEffect(() => {
    setVisible(false)
    const timer = setTimeout(() => {
      updatePosition()
      setVisible(true)
    }, 50)
    return () => clearTimeout(timer)
  }, [currentStep, updatePosition])

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      updatePosition()
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [updatePosition])

  // 滚动目标元素到可视区域
  useEffect(() => {
    if (!step) return
    const targetEl = document.getElementById(step.targetId)
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentStep, step])

  if (!step || !targetRect) {
    // 目标元素不在当前页面，显示一个居中的提示
    return (
      <div
        className="fixed inset-0 flex items-center justify-center transition-opacity duration-300"
        style={{
          zIndex: 55,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          opacity: visible ? 1 : 0,
        }}
      >
        <div
          className="max-w-xs rounded-xl p-5 shadow-xl transition-all duration-300"
          style={{
            backgroundColor: 'var(--bg-card, #fff)',
            border: '1px solid var(--border-color, #e5e7eb)',
            transform: visible ? 'scale(1)' : 'scale(0.95)',
          }}
        >
          <h3
            className="text-base font-bold mb-2"
            style={{ color: 'var(--fg, #111)' }}
          >
            {step?.title}
          </h3>
          <p
            className="text-sm mb-4 leading-relaxed"
            style={{ color: 'var(--text-secondary, #666)' }}
          >
            {step?.description}
          </p>
          <div className="flex items-center justify-between">
            <button
              onClick={onSkip}
              className="text-xs transition-colors"
              style={{ color: 'var(--text-muted, #999)' }}
            >
              跳过引导
            </button>
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  onClick={onPrev}
                  className="px-3 py-1.5 text-sm rounded-lg transition-all active:scale-95"
                  style={{ color: 'var(--text-secondary, #666)', border: '1px solid var(--border-color, #e5e7eb)' }}
                >
                  上一步
                </button>
              )}
              <button
                onClick={onNext}
                className="px-4 py-1.5 text-sm font-medium text-white rounded-lg transition-all active:scale-95"
                style={{ backgroundColor: 'var(--accent-color, #3b82f6)' }}
              >
                下一步
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const isLastStep = currentStep === GUIDE_STEPS.length - 1

  return (
    <>
      {/* 全屏遮罩 */}
      <div
        className="fixed inset-0 transition-opacity duration-300"
        style={{
          zIndex: 50,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? 'auto' : 'none',
        }}
        onClick={(e) => {
          // 点击遮罩区域不关闭，防止误操作
        }}
      />

      {/* 高亮挖洞效果 */}
      <div
        className="fixed pointer-events-none transition-all duration-300 ease-in-out"
        style={{
          zIndex: 51,
          top: targetRect.top - HIGHLIGHT_PADDING,
          left: targetRect.left - HIGHLIGHT_PADDING,
          width: targetRect.width + HIGHLIGHT_PADDING * 2,
          height: targetRect.height + HIGHLIGHT_PADDING * 2,
          borderRadius: 8,
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
          border: `2px solid var(--accent-color, #3b82f6)`,
          opacity: visible ? 1 : 0,
        }}
      />

      {/* 气泡卡片 */}
      <div
        ref={bubbleRef}
        className="rounded-xl p-4 shadow-xl transition-all duration-300"
        style={{
          ...bubbleStyle,
          backgroundColor: 'var(--bg-card, #fff)',
          border: '1px solid var(--border-color, #e5e7eb)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(8px)',
        }}
      >
        {/* 箭头 */}
        <div style={arrowStyle} />

        {/* 标题 */}
        <h3
          className="text-base font-bold mb-1.5"
          style={{ color: 'var(--fg, #111)' }}
        >
          {step.title}
        </h3>

        {/* 描述 */}
        <p
          className="text-sm leading-relaxed mb-3"
          style={{ color: 'var(--text-secondary, #666)' }}
        >
          {step.description}
        </p>

        {/* 操作提示 */}
        {step.action && (
          <p
            className="text-xs mb-3 px-2 py-1 rounded-md inline-block"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--accent-color, #3b82f6) 10%, transparent)',
              color: 'var(--accent-color, #3b82f6)',
            }}
          >
            {step.action}
          </p>
        )}

        {/* 步骤指示器 + 按钮 */}
        <div className="flex items-center justify-between mt-2">
          <span
            className="text-xs"
            style={{ color: 'var(--text-muted, #999)' }}
          >
            第 {currentStep + 1}/{GUIDE_STEPS.length} 步
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onSkip}
              className="text-xs transition-colors hover:underline"
              style={{ color: 'var(--text-muted, #999)' }}
            >
              跳过
            </button>
            {currentStep > 0 && (
              <button
                onClick={onPrev}
                className="px-3 py-1.5 text-xs rounded-lg transition-all active:scale-95"
                style={{ color: 'var(--text-secondary, #666)', border: '1px solid var(--border-color, #e5e7eb)' }}
              >
                上一步
              </button>
            )}
            <button
              onClick={onNext}
              className="px-4 py-1.5 text-sm font-medium text-white rounded-lg transition-all active:scale-95"
              style={{ backgroundColor: 'var(--accent-color, #3b82f6)' }}
            >
              {isLastStep ? '完成' : '下一步'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
