'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import {
  GUIDE_STEPS,
  isGuideCompleted,
  markGuideCompleted,
  getCurrentStepIndex,
  setCurrentStepIndex,
} from '@/lib/guide'
import GuideOverlay from '@/components/GuideOverlay'

interface GuideContextValue {
  isActive: boolean
  currentStep: number
  startGuide: () => void
  nextStep: () => void
  skipGuide: () => void
  goToStep: (index: number) => void
}

const GuideContext = createContext<GuideContextValue>({
  isActive: false,
  currentStep: 0,
  startGuide: () => {},
  nextStep: () => {},
  skipGuide: () => {},
  goToStep: () => {},
})

export function useGuide() {
  return useContext(GuideContext)
}

// 步骤到页面的映射，用于判断当前页面应该显示哪个步骤
const STEP_PAGE_MAP: Record<number, string> = {
  0: '/today',   // welcome
  1: '/today',   // today-status
  2: '/today',   // nav-plan (底部导航在所有页面都可见)
  3: '/dashboard', // plan-form
  4: '/dashboard', // plan-submit
  5: '/campus',  // nav-campus
  6: '/campus',  // campus-library
  7: '/campus',  // campus-study
  8: '/campus',  // campus-dorm
  9: '/today',   // nav-points (底部导航)
  10: '/today',  // review-reminder
  11: '/profile', // complete - nav-profile
}

export function GuideProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [currentPath, setCurrentPath] = useState('')
  const skipCalledRef = useRef(false)

  // 监听路由变化
  useEffect(() => {
    const handlePathChange = () => {
      setCurrentPath(window.location.pathname)
    }

    // 初始设置
    handlePathChange()

    // 使用 popstate 监听浏览器前进后退
    window.addEventListener('popstate', handlePathChange)

    // 使用 MutationObserver 监听 DOM 变化来检测路由变化
    // Next.js App Router 使用 pushState
    const originalPushState = history.pushState
    const originalReplaceState = history.replaceState

    history.pushState = function (...args) {
      originalPushState.apply(this, args)
      setTimeout(handlePathChange, 50)
    }

    history.replaceState = function (...args) {
      originalReplaceState.apply(this, args)
      setTimeout(handlePathChange, 50)
    }

    return () => {
      window.removeEventListener('popstate', handlePathChange)
      history.pushState = originalPushState
      history.replaceState = originalReplaceState
    }
  }, [])

  const startGuide = useCallback(() => {
    const savedStep = getCurrentStepIndex()
    setCurrentStep(savedStep)
    setIsActive(true)
    skipCalledRef.current = false
  }, [])

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => {
      const next = prev + 1
      if (next >= GUIDE_STEPS.length) {
        // 引导完成
        markGuideCompleted()
        setCurrentStepIndex(0)
        setIsActive(false)
        return prev
      }
      setCurrentStepIndex(next)
      return next
    })
  }, [])

  const skipGuide = useCallback(() => {
    if (skipCalledRef.current) return
    skipCalledRef.current = true
    markGuideCompleted()
    setCurrentStepIndex(0)
    setIsActive(false)
  }, [])

  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < GUIDE_STEPS.length) {
      setCurrentStep(index)
      setCurrentStepIndex(index)
    }
  }, [])

  // 当路由变化时，自动跳转到对应页面的步骤
  useEffect(() => {
    if (!isActive || !currentPath) return

    // 查找当前路径对应的步骤
    const matchingSteps = Object.entries(STEP_PAGE_MAP)
      .filter(([, path]) => {
        // 底部导航步骤在所有 (main) 页面都可见
        if (path === '/today' && (currentStep === 2 || currentStep === 9)) {
          return currentPath.startsWith('/today') ||
                 currentPath.startsWith('/dashboard') ||
                 currentPath.startsWith('/campus') ||
                 currentPath.startsWith('/profile')
        }
        return currentPath.startsWith(path)
      })
      .map(([stepStr]) => parseInt(stepStr, 10))

    if (matchingSteps.length > 0) {
      // 找到最接近当前步骤的匹配步骤
      const closestStep = matchingSteps.reduce((closest, step) => {
        if (step >= currentStep) return step
        return closest
      }, matchingSteps[0])

      if (closestStep !== currentStep) {
        setCurrentStep(closestStep)
        setCurrentStepIndex(closestStep)
      }
    }
  }, [isActive, currentPath, currentStep])

  // 检查目标元素是否存在，如果不存在则自动跳过
  useEffect(() => {
    if (!isActive) return

    const step = GUIDE_STEPS[currentStep]
    if (!step) return

    // 给页面一点时间渲染
    const timer = setTimeout(() => {
      const targetEl = document.getElementById(step.targetId)
      if (!targetEl) {
        // 目标元素不在当前页面，自动前进到下一步
        const next = currentStep + 1
        if (next >= GUIDE_STEPS.length) {
          markGuideCompleted()
          setCurrentStepIndex(0)
          setIsActive(false)
        } else {
          setCurrentStep(next)
          setCurrentStepIndex(next)
        }
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [isActive, currentStep])

  return (
    <GuideContext.Provider
      value={{
        isActive,
        currentStep,
        startGuide,
        nextStep,
        skipGuide,
        goToStep,
      }}
    >
      {children}
      {isActive && (
        <GuideOverlay
          currentStep={currentStep}
          onNext={nextStep}
          onSkip={skipGuide}
        />
      )}
    </GuideContext.Provider>
  )
}
