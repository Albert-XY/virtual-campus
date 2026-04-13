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

// 步骤到页面的映射 — 适配新架构
const STEP_PAGE_MAP: Record<number, string> = {
  0: '/',        // welcome → 看板首页
  1: '/',        // today-status → 看板首页
  2: '/campus',  // nav-campus → 校园
  3: '/campus',  // campus-dorm → 校园
  4: '/campus',  // campus-library → 校园
  5: '/campus',  // campus-study → 校园
  6: '/profile', // complete → 我的
}

export function GuideProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const skipCalledRef = useRef(false)
  const isNavigatingRef = useRef(false)
  const router = useRouter()

  const getStepPage = useCallback((stepIndex: number): string => {
    return STEP_PAGE_MAP[stepIndex] || '/'
  }, [])

  const navigateToStepPage = useCallback((stepIndex: number) => {
    const targetPage = getStepPage(stepIndex)
    const currentPath = window.location.pathname

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
      navigateToStepPage(next)
      return next
    })
  }, [navigateToStepPage])

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => {
      if (prev <= 0) return prev
      const back = prev - 1
      setCurrentStepIndex(back)
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

  useEffect(() => {
    if (!isActive) return

    const step = GUIDE_STEPS[currentStep]
    if (!step) return

    const checkTarget = () => {
      const targetEl = document.getElementById(step.targetId)
      if (!targetEl && !isNavigatingRef.current) {
        console.warn(`Guide: target element #${step.targetId} not found for step ${currentStep}`)
      }
      isNavigatingRef.current = false
    }

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
