'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  GUIDE_STEPS,
  markGuideCompleted,
  setCurrentStepIndex,
} from '@/lib/guide'
import GuideOverlay from '@/components/GuideOverlay'

interface GuideContextValue {
  isActive: boolean
  currentStep: number
  startGuide: () => void
  nextStep: () => void
  prevStep: () => void
  skipGuide: () => void
}

const GuideContext = createContext<GuideContextValue>({
  isActive: false,
  currentStep: 0,
  startGuide: () => {},
  nextStep: () => {},
  prevStep: () => {},
  skipGuide: () => {},
})

export function useGuide() {
  return useContext(GuideContext)
}

// 步骤到页面的映射
const STEP_PAGE_MAP: Record<number, string> = {
  0: '/today',
  1: '/today',
  2: '/today',    // nav-plan（底部导航，所有页面可见）
  3: '/dashboard',
  4: '/dashboard',
  5: '/campus',
  6: '/campus',
  7: '/campus',
  8: '/campus',
  9: '/today',    // nav-points（底部导航）
  10: '/today',
  11: '/profile',
}

export function GuideProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const skipCalledRef = useRef(false)
  const isNavigatingRef = useRef(false)
  const router = useRouter()

  // 获取步骤对应的页面路径
  const getStepPage = useCallback((stepIndex: number): string => {
    return STEP_PAGE_MAP[stepIndex] || '/today'
  }, [])

  // 导航到步骤对应的页面
  const navigateToStepPage = useCallback((stepIndex: number) => {
    const targetPage = getStepPage(stepIndex)
    const currentPath = window.location.pathname

    // 底部导航步骤（2=nav-plan, 9=nav-points）在所有主页面都可见
    const isNavStep = stepIndex === 2 || stepIndex === 9
    const isMainPage = currentPath.startsWith('/today') ||
                       currentPath.startsWith('/dashboard') ||
                       currentPath.startsWith('/campus') ||
                       currentPath.startsWith('/profile')

    if (isNavStep && isMainPage) {
      // 不需要跳转，当前页面就能看到底部导航
      return
    }

    if (!currentPath.startsWith(targetPage)) {
      isNavigatingRef.current = true
      router.push(targetPage)
    }
  }, [getStepPage, router])

  const startGuide = useCallback(() => {
    setCurrentStep(0)
    setCurrentStepIndex(0)
    setIsActive(true)
    skipCalledRef.current = false
    isNavigatingRef.current = false

    // 确保在正确的页面
    const targetPage = getStepPage(0)
    const currentPath = window.location.pathname
    if (!currentPath.startsWith(targetPage)) {
      isNavigatingRef.current = true
      router.push(targetPage)
    }
  }, [getStepPage, router])

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => {
      const next = prev + 1
      if (next >= GUIDE_STEPS.length) {
        markGuideCompleted()
        setCurrentStepIndex(0)
        setIsActive(false)
        return prev
      }
      setCurrentStepIndex(next)
      // 导航到下一步对应的页面
      navigateToStepPage(next)
      return next
    })
  }, [navigateToStepPage])

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => {
      if (prev <= 0) return prev
      const back = prev - 1
      setCurrentStepIndex(back)
      // 导航到上一步对应的页面
      navigateToStepPage(back)
      return back
    })
  }, [navigateToStepPage])

  const skipGuide = useCallback(() => {
    if (skipCalledRef.current) return
    skipCalledRef.current = true
    markGuideCompleted()
    setCurrentStepIndex(0)
    setIsActive(false)
  }, [])

  // 当步骤变化且目标元素不存在时，等待页面导航完成后重试
  useEffect(() => {
    if (!isActive) return

    const step = GUIDE_STEPS[currentStep]
    if (!step) return

    // 如果正在导航中，等待一下再检查
    const checkTarget = () => {
      const targetEl = document.getElementById(step.targetId)
      if (!targetEl && !isNavigatingRef.current) {
        // 目标元素不存在且不在导航中，说明页面有问题
        // 不自动跳过，等用户手动操作
        console.warn(`Guide: target element #${step.targetId} not found for step ${currentStep}`)
      }
      isNavigatingRef.current = false
    }

    // 导航后等待页面渲染
    const timer = setTimeout(checkTarget, 800)
    return () => clearTimeout(timer)
  }, [isActive, currentStep])

  return (
    <GuideContext.Provider
      value={{
        isActive,
        currentStep,
        startGuide,
        nextStep,
        prevStep,
        skipGuide,
      }}
    >
      {children}
      {isActive && (
        <GuideOverlay
          currentStep={currentStep}
          onNext={nextStep}
          onPrev={prevStep}
          onSkip={skipGuide}
        />
      )}
    </GuideContext.Provider>
  )
}
