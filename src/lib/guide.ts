export interface GuideStep {
  id: string
  targetId: string // 要高亮的DOM元素id
  title: string
  description: string
  placement: 'top' | 'bottom' | 'left' | 'right' // 气泡位置
  action?: string // 可选的操作提示，如"点击试试"
}

// 引导流程定义
export const GUIDE_STEPS: GuideStep[] = [
  // 第一步：今日页面
  {
    id: 'welcome',
    targetId: 'guide-today-greeting', // 今日页问候区域
    title: '欢迎来到虚拟校园！',
    description: '这是你的"今日"主页，每天打开App都会先到这里。系统会根据你的状态显示不同的内容。',
    placement: 'bottom',
  },
  {
    id: 'today-status',
    targetId: 'guide-today-status', // 今日状态区域
    title: '今日概览',
    description: '这里显示你今天的规划状态、任务进度和积分情况。完成规划后这里会显示更多信息。',
    placement: 'bottom',
  },
  // 第二步：引导去规划
  {
    id: 'nav-plan',
    targetId: 'guide-nav-plan', // 底部导航"规划"tab
    title: '先规划，再行动',
    description: '这是核心规则——每天必须先完成规划，才能进入校园学习。点击"规划"开始你的第一次规划吧！',
    placement: 'top',
    action: '点击进入规划中心',
  },
  // 第三步：规划中心（用户点击后跳转到/dashboard）
  {
    id: 'plan-form',
    targetId: 'guide-plan-form', // 规划表单区域
    title: '填写今日规划',
    description: '添加你今天要学习的任务，设置预计时长。也可以点击"快速规划"一键创建默认模板。',
    placement: 'top',
  },
  {
    id: 'plan-submit',
    targetId: 'guide-plan-submit', // 提交按钮
    title: '开始今天的学习！',
    description: '规划完成后点击这个按钮，校园就会解锁。试试看吧！',
    placement: 'top',
    action: '点击提交规划',
  },
  // 第四步：校园地图
  {
    id: 'nav-campus',
    targetId: 'guide-nav-campus', // 底部导航"校园"tab
    title: '虚拟校园',
    description: '规划完成后，这里会解锁。你可以选择进入不同的场景学习。',
    placement: 'top',
    action: '点击进入校园',
  },
  // 第五步：场景介绍
  {
    id: 'campus-library',
    targetId: 'guide-campus-library', // 图书馆卡片
    title: '图书馆',
    description: '在这里进行知识学习。你可以选择要做的任务，启动番茄钟专注学习。',
    placement: 'right',
  },
  {
    id: 'campus-study',
    targetId: 'guide-campus-study', // 自习室卡片
    title: '自习室',
    description: '在这里完成练习任务。完成任务后记录实际用时和准确率。',
    placement: 'right',
  },
  {
    id: 'campus-dorm',
    targetId: 'guide-campus-dorm', // 宿舍卡片
    title: '宿舍',
    description: '别忘了早睡打卡！22:30前打卡可以获得更多积分。',
    placement: 'right',
  },
  // 第六步：积分
  {
    id: 'nav-points',
    targetId: 'guide-nav-points', // 底部导航"积分"tab
    title: '积分体系',
    description: '完成任务、早睡打卡、写总结都能获得积分。积分是你的学习行为记录。',
    placement: 'top',
  },
  // 第七步：复盘
  {
    id: 'review-reminder',
    targetId: 'guide-review-area', // 今日页总结区域
    title: '每日复盘',
    description: '每天结束学习后，记得写今日总结。回顾今天的表现，规划明天的安排。坚持复盘是进步的关键！',
    placement: 'bottom',
  },
  // 最后一步
  {
    id: 'complete',
    targetId: 'guide-nav-profile', // 底部导航"我的"tab
    title: '引导完成！',
    description: '你已经了解了虚拟校园的核心功能。记住：规划→执行→复盘，每天循环。在"我的"页面可以修改昵称、切换主题。开始你的自主学习之旅吧！',
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
