export interface GuideStep {
  id: string
  targetId: string
  title: string
  description: string
  placement: 'top' | 'bottom' | 'left' | 'right'
  action?: string
}

// ============================================================
// 新版引导流程 — 适配3Tab导航架构
//
// 流程：看板(规划) → 校园(场景) → 完成
// ============================================================
export const GUIDE_STEPS: GuideStep[] = [
  // 第一步：看板首页
  {
    id: 'welcome',
    targetId: 'guide-today-greeting',
    title: '欢迎来到虚拟校园！',
    description: '这是你的看板，每天打开App都会先到这里。系统会根据你的状态显示不同的内容。',
    placement: 'bottom',
  },
  {
    id: 'today-status',
    targetId: 'guide-today-status',
    title: '今日概览',
    description: '这里显示你今天的规划状态、任务进度和积分情况。完成规划后这里会显示更多信息。',
    placement: 'bottom',
  },
  // 第二步：引导去校园（宿舍做规划）
  {
    id: 'nav-campus',
    targetId: 'guide-nav-campus',
    title: '虚拟校园',
    description: '点击"校园"进入校园场景。宿舍始终可以进入——在那里做规划、写总结、休息。',
    placement: 'top',
    action: '点击进入校园',
  },
  // 第三步：场景介绍
  {
    id: 'campus-dorm',
    targetId: 'guide-campus-dorm',
    title: '宿舍',
    description: '一天从这里开始。在宿舍做今日规划，晚上回来写总结和打卡。宿舍始终可用。',
    placement: 'right',
  },
  {
    id: 'campus-library',
    targetId: 'guide-campus-library',
    title: '图书馆',
    description: '完成规划后解锁。在这里进行知识学习，选择任务、启动番茄钟专注学习。',
    placement: 'right',
  },
  {
    id: 'campus-study',
    targetId: 'guide-campus-study',
    title: '自习室',
    description: '完成规划后解锁。在这里完成练习任务，记录用时和准确率。',
    placement: 'right',
  },
  // 最后一步
  {
    id: 'complete',
    targetId: 'guide-nav-profile',
    title: '引导完成！',
    description: '你已经了解了虚拟校园的核心流程：宿舍规划 → 图书馆/自习室学习 → 宿舍总结。在"我的"页面可以修改昵称、切换主题。开始你的自主学习之旅吧！',
    placement: 'top',
  },
]

// localStorage 管理
export function isGuideCompleted(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('guide_completed') === 'true'
}

export function markGuideCompleted(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('guide_completed', 'true')
}

export function resetGuide(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('guide_completed')
}

export function getCurrentStepIndex(): number {
  if (typeof window === 'undefined') return 0
  return parseInt(localStorage.getItem('guide_step') || '0', 10)
}

export function setCurrentStepIndex(index: number): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('guide_step', String(index))
}
