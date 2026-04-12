'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Target, ListTree, ClipboardList } from 'lucide-react'

// ============================================================
// Types
// ============================================================
interface OnboardingStep {
  title: string
  description: string
  icon?: React.ReactNode
  isFinal?: boolean
}

// ============================================================
// Constants
// ============================================================
const STORAGE_KEY = 'vc_onboarding_done'

const STEPS: OnboardingStep[] = [
  {
    title: '欢迎来到虚拟校园',
    description: '这里帮助你养成规划→执行→复盘的学习习惯',
  },
  {
    title: '第一步：设定目标',
    description: '设定这个月想完成什么，比如"考研数学完成高数部分"',
    icon: <Target className="size-10" style={{ color: 'var(--accent-color)' }} />,
  },
  {
    title: '第二步：拆解计划',
    description: '把月目标拆成每周、每天的具体任务',
    icon: <ListTree className="size-10" style={{ color: 'var(--accent-color)' }} />,
  },
  {
    title: '第三步：执行+复盘',
    description: '按计划学习，每天写总结看看哪里可以改进',
    icon: <ClipboardList className="size-10" style={{ color: 'var(--accent-color)' }} />,
  },
  {
    title: '准备好了',
    description: '从设定你的第一个月目标开始吧！',
    isFinal: true,
  },
]

// ============================================================
// Component
// ============================================================
export default function OnboardingFlow() {
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')

  // Check if onboarding has been completed
  useEffect(() => {
    try {
      const done = localStorage.getItem(STORAGE_KEY)
      if (!done) {
        setVisible(true)
      }
    } catch {
      // localStorage not available, skip onboarding
    }
  }, [])

  const completeOnboarding = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true')
    } catch {
      // ignore
    }
    setVisible(false)
  }, [])

  const skipOnboarding = useCallback(() => {
    completeOnboarding()
  }, [completeOnboarding])

  const goNext = useCallback(() => {
    const step = STEPS[currentStep]
    if (step?.isFinal) {
      completeOnboarding()
      router.push('/goals')
      return
    }

    if (currentStep < STEPS.length - 1) {
      setDirection('forward')
      setAnimating(true)
      setTimeout(() => {
        setCurrentStep((s) => s + 1)
        setAnimating(false)
      }, 200)
    }
  }, [currentStep, completeOnboarding, router])

  // Don't render if not visible
  if (!visible) return null

  const step = STEPS[currentStep]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div
        className="mx-4 w-full max-w-sm overflow-hidden"
        style={{
          borderRadius: 'var(--radius-lg, 12px)',
          backgroundColor: 'var(--bg-card, white)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Step content */}
        <div
          className="px-8 pt-10 pb-6 text-center"
          style={{
            opacity: animating ? 0 : 1,
            transform: animating
              ? `translateY(${direction === 'forward' ? '-12px' : '12px'})`
              : 'translateY(0)',
            transition: 'opacity 0.2s ease, transform 0.2s ease',
          }}
        >
          {/* Icon */}
          {step.icon && (
            <div
              className="mx-auto mb-5 flex size-16 items-center justify-center"
              style={{
                borderRadius: '50%',
                backgroundColor: 'var(--accent-light)',
              }}
            >
              {step.icon}
            </div>
          )}

          {/* Title */}
          <h2
            className="text-xl font-bold mb-3"
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--text-primary)',
            }}
          >
            {step.title}
          </h2>

          {/* Description */}
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            {step.description}
          </p>
        </div>

        {/* Actions */}
        <div className="px-8 pb-8 space-y-3">
          {step.isFinal ? (
            <button
              onClick={goNext}
              className="w-full py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{
                borderRadius: 'var(--radius-md, 8px)',
                backgroundColor: 'var(--accent-color)',
              }}
            >
              开始使用
            </button>
          ) : (
            <button
              onClick={goNext}
              className="w-full py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{
                borderRadius: 'var(--radius-md, 8px)',
                backgroundColor: 'var(--accent-color)',
              }}
            >
              下一步
            </button>
          )}

          {!step.isFinal && (
            <button
              onClick={skipOnboarding}
              className="w-full py-2 text-sm transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-muted)' }}
            >
              跳过
            </button>
          )}
        </div>

        {/* Step indicator dots */}
        <div className="flex items-center justify-center gap-2 pb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="transition-all duration-300"
              style={{
                width: i === currentStep ? 20 : 6,
                height: 6,
                borderRadius: '9999px',
                backgroundColor:
                  i === currentStep
                    ? 'var(--accent-color)'
                    : 'var(--border-light, #E5E7EB)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
