'use client'

import { forwardRef, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/**
 * ThemedCard - 主题感知的卡片组件
 *
 * 根据当前主题自动应用独特的视觉样式：
 * - Star Citizen: 全息面板、发光边框、角落装饰
 * - Mirror's Edge: 硬边阴影、红色高亮边框
 * - Pixel: 像素边框、硬阴影
 * - Magazine: 霓虹边框、渐变背景
 */

export interface ThemedCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'primary' | 'elevated'
  glow?: boolean
  runnerVision?: boolean // Mirror's Edge 特有
  holoActive?: boolean // Star Citizen 特有
}

export const ThemedCard = forwardRef<HTMLDivElement, ThemedCardProps>(
  ({ className, variant = 'default', glow, runnerVision, holoActive, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'themed-card',
          `themed-card--${variant}`,
          glow && 'themed-card--glow',
          runnerVision && 'themed-card--runner-vision',
          holoActive && 'themed-card--holo-active',
          className
        )}
        {...props}
      >
        {/* Star Citizen: 角落装饰 */}
        <div className="themed-card__corners" aria-hidden="true">
          <span className="themed-card__corner themed-card__corner--tl" />
          <span className="themed-card__corner themed-card__corner--tr" />
          <span className="themed-card__corner themed-card__corner--bl" />
          <span className="themed-card__corner themed-card__corner--br" />
        </div>

        {/* 内容区域 */}
        <div className="themed-card__content">
          {children}
        </div>

        {/* Star Citizen: 底部扫描线 */}
        <div className="themed-card__scanline" aria-hidden="true" />
      </div>
    )
  }
)

ThemedCard.displayName = 'ThemedCard'

/**
 * ThemedButton - 主题感知的按钮组件
 */
export interface ThemedButtonProps extends HTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  glow?: boolean
}

export const ThemedButton = forwardRef<HTMLButtonElement, ThemedButtonProps>(
  ({ className, variant = 'default', size = 'md', glow, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'themed-button',
          `themed-button--${variant}`,
          `themed-button--${size}`,
          glow && 'themed-button--glow',
          className
        )}
        {...props}
      >
        <span className="themed-button__content">
          {children}
        </span>
        {/* Star Citizen: 按钮光效 */}
        <span className="themed-button__glow" aria-hidden="true" />
      </button>
    )
  }
)

ThemedButton.displayName = 'ThemedButton'

/**
 * ThemedProgressBar - 主题感知的进度条
 */
export interface ThemedProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  variant?: 'default' | 'success' | 'warning' | 'danger'
  animated?: boolean
}

export const ThemedProgressBar = forwardRef<HTMLDivElement, ThemedProgressBarProps>(
  ({ className, value, max = 100, variant = 'default', animated, ...props }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100))

    return (
      <div
        ref={ref}
        className={cn(
          'themed-progress',
          `themed-progress--${variant}`,
          animated && 'themed-progress--animated',
          className
        )}
        {...props}
      >
        <div
          className="themed-progress__fill"
          style={{ width: `${percentage}%` }}
        >
          {/* Star Citizen: 能量流动效果 */}
          <span className="themed-progress__energy" aria-hidden="true" />
        </div>
        {/* Mirror's Edge: 刻度线 */}
        <div className="themed-progress__ticks" aria-hidden="true">
          {[...Array(10)].map((_, i) => (
            <span key={i} className="themed-progress__tick" />
          ))}
        </div>
      </div>
    )
  }
)

ThemedProgressBar.displayName = 'ThemedProgressBar'

/**
 * ThemedBadge - 主题感知的徽章
 */
export interface ThemedBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
  pulse?: boolean
}

export const ThemedBadge = forwardRef<HTMLSpanElement, ThemedBadgeProps>(
  ({ className, variant = 'default', pulse, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'themed-badge',
          `themed-badge--${variant}`,
          pulse && 'themed-badge--pulse',
          className
        )}
        {...props}
      >
        {children}
      </span>
    )
  }
)

ThemedBadge.displayName = 'ThemedBadge'

/**
 * ThemedInput - 主题感知的输入框
 */
export interface ThemedInputProps extends HTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  glow?: boolean
}

export const ThemedInput = forwardRef<HTMLInputElement, ThemedInputProps>(
  ({ className, label, error, glow, ...props }, ref) => {
    return (
      <div className={cn('themed-input-wrapper', error && 'themed-input-wrapper--error', className)}>
        {label && <label className="themed-input__label">{label}</label>}
        <div className="themed-input__container">
          <input
            ref={ref}
            className={cn(
              'themed-input',
              glow && 'themed-input--glow'
            )}
            {...props}
          />
          {/* Star Citizen: 输入框装饰 */}
          <span className="themed-input__decoration" aria-hidden="true" />
        </div>
        {error && <span className="themed-input__error">{error}</span>}
      </div>
    )
  }
)

ThemedInput.displayName = 'ThemedInput'
