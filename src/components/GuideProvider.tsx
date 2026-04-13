'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'

// ============================================================
// 类型定义
// ============================================================

export interface VirtualTask {
  id: string
  title: string
  description: string
  location: string
  locationName: string
  objective: string
  reward: number
  order: number
  isCompleted: boolean
  isActive: boolean
  prerequisites?: string[]
}

export interface Character {
  id: string
  name: string
  avatar: string
  personality: string
}

export interface Dialogue {
  id: string
  characterId: string
  text: string
  type: 'greeting' | 'task_intro' | 'task_complete' | 'hint' | 'encouragement'
}

export interface OnboardingState {
  isFirstTime: boolean
  hasSeenWelcome: boolean
  currentTask: VirtualTask | null
  completedTasks: string[]
  currentStep: number
  tutorialProgress: Record<string, number>
  totalPoints: number
  unlockedBadges: string[]
}

interface GuideContextType {
  state: OnboardingState
  tasks: VirtualTask[]
  character: Character
  currentDialogue: Dialogue | null
  showWelcome: boolean
  showTaskPanel: boolean
  showDialogue: boolean
  isHighlighting: boolean
  highlightTarget: string | null
  // Actions
  setShowWelcome: (show: boolean) => void
  setShowTaskPanel: (show: boolean) => void
  setShowDialogue: (show: boolean) => void
  completeWelcome: () => void
  completeTask: (taskId: string) => void
  activateTask: (taskId: string) => void
  getNextTask: () => VirtualTask | null
  getCurrentTask: () => VirtualTask | null
  addPoints: (points: number) => void
  unlockBadge: (badgeId: string) => void
  startHighlight: (target: string) => void
  endHighlight: () => void
  showCharacterDialogue: (type: Dialogue['type']) => void
  resetOnboarding: () => void
}

// ============================================================
// 常量数据
// ============================================================

const CHARACTER: Character = {
  id: 'sophia',
  name: '苏菲',
  avatar: '🎓',
  personality: '热情、友善、知识渊博'
}

const MAIN_TASKS: VirtualTask[] = [
  {
    id: 'task-001',
    title: '规划今天的学习',
    description: '让我们一起规划今天要做什么吧',
    location: 'dormitory',
    locationName: '宿舍',
    objective: '创建第一个学习计划',
    reward: 10,
    order: 1,
    isCompleted: false,
    isActive: true
  },
  {
    id: 'task-002',
    title: '探索知识殿堂',
    description: '图书馆是探索新知识的好地方',
    location: 'library',
    locationName: '图书馆',
    objective: '进入图书馆并开始专注学习',
    reward: 15,
    order: 2,
    isCompleted: false,
    isActive: false,
    prerequisites: ['task-001']
  },
  {
    id: 'task-003',
    title: '开始专注练习',
    description: '自习室是练习和应用知识的地方',
    location: 'study-room',
    locationName: '自习室',
    objective: '在自习室专注10分钟',
    reward: 20,
    order: 3,
    isCompleted: false,
    isActive: false,
    prerequisites: ['task-002']
  },
  {
    id: 'task-004',
    title: '给自己一个休息',
    description: '学习累了，来海神湖放松一下吧',
    location: 'lake',
    locationName: '海神湖',
    objective: '尝试呼吸引导',
    reward: 10,
    order: 4,
    isCompleted: false,
    isActive: false,
    prerequisites: ['task-003']
  },
  {
    id: 'task-005',
    title: '回顾这一天',
    description: '回到宿舍，总结今天的收获',
    location: 'dormitory',
    locationName: '宿舍',
    objective: '完成日总结',
    reward: 15,
    order: 5,
    isCompleted: false,
    isActive: false,
    prerequisites: ['task-004']
  }
]

const SIDE_TASKS: VirtualTask[] = [
  {
    id: 'side-001',
    title: '探索主题',
    description: '试试不同的视觉主题',
    location: 'profile',
    locationName: '个人资料',
    objective: '切换一个主题',
    reward: 5,
    order: 1,
    isCompleted: false,
    isActive: true
  },
  {
    id: 'side-002',
    title: '环境音效',
    description: '开启环境音效，更有沉浸感',
    location: 'library',
    locationName: '图书馆',
    objective: '播放环境音效',
    reward: 5,
    order: 2,
    isCompleted: false,
    isActive: true
  }
]

const DIALOGUES: Dialogue[] = [
  {
    id: 'welcome',
    characterId: 'sophia',
    text: '欢迎来到虚拟校园！我是你的引导者苏菲。让我带你探索这个神奇的学习世界吧！',
    type: 'greeting'
  },
  {
    id: 'task-001-intro',
    characterId: 'sophia',
    text: '好的！我们的第一站是宿舍。宿舍是一天的起点和终点。让我们先规划一下今天要做什么吧！',
    type: 'task_intro'
  },
  {
    id: 'task-001-complete',
    characterId: 'sophia',
    text: '太棒了！你已经完成了今天的学习规划！接下来，让我们去图书馆探索新知识吧！',
    type: 'task_complete'
  },
  {
    id: 'task-002-intro',
    characterId: 'sophia',
    text: '这是图书馆，一个安静的学习环境。在这里你可以专注学习，探索知识的海洋。',
    type: 'task_intro'
  },
  {
    id: 'task-002-complete',
    characterId: 'sophia',
    text: '干得好！你已经在图书馆开始学习了！现在去自习室练习一下吧！',
    type: 'task_complete'
  },
  {
    id: 'task-003-intro',
    characterId: 'sophia',
    text: '自习室是练习和应用知识的地方。让我们在这里专注练习一段时间！',
    type: 'task_intro'
  },
  {
    id: 'task-003-complete',
    characterId: 'sophia',
    text: '你专注学习了这么久，太棒了！现在去海神湖放松一下吧！',
    type: 'task_complete'
  },
  {
    id: 'task-004-intro',
    characterId: 'sophia',
    text: '这是海神湖，一个让人放松的地方。试试呼吸引导，让自己平静下来。',
    type: 'task_intro'
  },
  {
    id: 'task-004-complete',
    characterId: 'sophia',
    text: '放松得怎么样？现在回到宿舍，总结一下今天的收获吧！',
    type: 'task_complete'
  },
  {
    id: 'task-005-intro',
    characterId: 'sophia',
    text: '回到宿舍了！让我们回顾一下今天的学习，总结收获。',
    type: 'task_intro'
  },
  {
    id: 'task-005-complete',
    characterId: 'sophia',
    text: '恭喜你！你已经完成了虚拟校园的第一天！你已经解锁了"第一天"徽章！',
    type: 'task_complete'
  },
  {
    id: 'hint-plan',
    characterId: 'sophia',
    text: '点击"规划"按钮，开始制定今天的学习计划吧！',
    type: 'hint'
  },
  {
    id: 'encouragement',
    characterId: 'sophia',
    text: '你做得很好！继续加油，你越来越棒了！',
    type: 'encouragement'
  }
]

// ============================================================
// 存储工具
// ============================================================

const STORAGE_KEYS = {
  ONBOARDING: 'virtual-campus-onboarding',
  TASKS: 'virtual-campus-tasks'
}

function loadState(): Partial<OnboardingState> {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ONBOARDING)
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

function saveState(state: OnboardingState) {
  try {
    localStorage.setItem(STORAGE_KEYS.ONBOARDING, JSON.stringify(state))
  } catch {
    // 静默失败
  }
}

function loadTasks(): VirtualTask[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.TASKS)
    return data ? JSON.parse(data) : [...MAIN_TASKS]
  } catch {
    return [...MAIN_TASKS]
  }
}

function saveTasks(tasks: VirtualTask[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks))
  } catch {
    // 静默失败
  }
}

// ============================================================
// Context 创建
// ============================================================

const GuideContext = createContext<GuideContextType | undefined>(undefined)

export function GuideProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<OnboardingState>(() => {
    const saved = loadState()
    return {
      isFirstTime: saved.isFirstTime ?? true,
      hasSeenWelcome: saved.hasSeenWelcome ?? false,
      currentTask: saved.currentTask ?? null,
      completedTasks: saved.completedTasks ?? [],
      currentStep: saved.currentStep ?? 0,
      tutorialProgress: saved.tutorialProgress ?? {},
      totalPoints: saved.totalPoints ?? 0,
      unlockedBadges: saved.unlockedBadges ?? []
    }
  })

  const [tasks, setTasks] = useState<VirtualTask[]>(() => loadTasks())
  const [showWelcome, setShowWelcome] = useState(!state.hasSeenWelcome)
  const [showTaskPanel, setShowTaskPanel] = useState(true)
  const [showDialogue, setShowDialogue] = useState(false)
  const [currentDialogue, setCurrentDialogue] = useState<Dialogue | null>(null)
  const [isHighlighting, setIsHighlighting] = useState(false)
  const [highlightTarget, setHighlightTarget] = useState<string | null>(null)

  // 自动保存状态
  useEffect(() => {
    saveState(state)
  }, [state])

  useEffect(() => {
    saveTasks(tasks)
  }, [tasks])

  // 计算当前任务
  const getCurrentTask = useCallback(() => {
    return tasks.find(t => t.isActive && !t.isCompleted) || null
  }, [tasks])

  // 获取下一个任务
  const getNextTask = useCallback(() => {
    const activeTask = getCurrentTask()
    if (activeTask) return activeTask

    const nextTask = tasks.find(t => {
      if (t.isCompleted) return false
      if (!t.prerequisites) return true
      return t.prerequisites.every(p => state.completedTasks.includes(p))
    })

    return nextTask || null
  }, [tasks, state.completedTasks, getCurrentTask])

  // 完成欢迎
  const completeWelcome = useCallback(() => {
    setState(prev => ({ ...prev, hasSeenWelcome: true }))
    setShowWelcome(false)
    
    const firstTask = tasks[0]
    if (firstTask) {
      activateTask(firstTask.id)
      showCharacterDialogue('task_intro', firstTask.id)
    }
  }, [tasks])

  // 激活任务
  const activateTask = useCallback((taskId: string) => {
    setTasks(prev => prev.map(t => ({
      ...t,
      isActive: t.id === taskId
    })))
    
    const task = tasks.find(t => t.id === taskId)
    if (task) {
      setState(prev => ({ ...prev, currentTask: task }))
    }
  }, [tasks])

  // 完成任务
  const completeTask = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task || task.isCompleted) return

    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, isCompleted: true, isActive: false } : t
    ))

    setState(prev => ({
      ...prev,
      completedTasks: [...prev.completedTasks, taskId],
      totalPoints: prev.totalPoints + task.reward
    }))

    addPoints(task.reward)
    showCharacterDialogue('task_complete', taskId)

    const allMainTasksCompleted = MAIN_TASKS.every(t => 
      state.completedTasks.includes(t.id) || t.id === taskId
    )
    if (allMainTasksCompleted && !state.unlockedBadges.includes('first-day')) {
      unlockBadge('first-day')
      addPoints(50)
    }

    const nextTask = getNextTask()
    if (nextTask) {
      setTimeout(() => {
        activateTask(nextTask.id)
        showCharacterDialogue('task_intro', nextTask.id)
      }, 3000)
    }
  }, [tasks, state, addPoints, unlockBadge, getNextTask, activateTask])

  // 添加积分
  const addPoints = useCallback((points: number) => {
    setState(prev => ({
      ...prev,
      totalPoints: prev.totalPoints + points
    }))
  }, [])

  // 解锁徽章
  const unlockBadge = useCallback((badgeId: string) => {
    setState(prev => {
      if (prev.unlockedBadges.includes(badgeId)) return prev
      return {
        ...prev,
        unlockedBadges: [...prev.unlockedBadges, badgeId]
      }
    })
  }, [])

  // 高亮
  const startHighlight = useCallback((target: string) => {
    setHighlightTarget(target)
    setIsHighlighting(true)
  }, [])

  const endHighlight = useCallback(() => {
    setIsHighlighting(false)
    setHighlightTarget(null)
  }, [])

  // 角色对话
  const showCharacterDialogue = useCallback((type: Dialogue['type'], taskId?: string) => {
    let dialogue: Dialogue | undefined

    if (taskId) {
      if (type === 'task_intro') {
        dialogue = DIALOGUES.find(d => d.id === `${taskId}-intro`)
      } else if (type === 'task_complete') {
        dialogue = DIALOGUES.find(d => d.id === `${taskId}-complete`)
      }
    }

    if (!dialogue) {
      dialogue = DIALOGUES.find(d => d.type === type)
    }

    if (dialogue) {
      setCurrentDialogue(dialogue)
      setShowDialogue(true)
    }
  }, [])

  // 重置引导
  const resetOnboarding = useCallback(() => {
    const newState: OnboardingState = {
      isFirstTime: true,
      hasSeenWelcome: false,
      currentTask: null,
      completedTasks: [],
      currentStep: 0,
      tutorialProgress: {},
      totalPoints: 0,
      unlockedBadges: []
    }
    setState(newState)
    setTasks([...MAIN_TASKS])
    setShowWelcome(true)
  }, [])

  const contextValue: GuideContextType = useMemo(() => ({
    state,
    tasks,
    character: CHARACTER,
    currentDialogue,
    showWelcome,
    showTaskPanel,
    showDialogue,
    isHighlighting,
    highlightTarget,
    setShowWelcome,
    setShowTaskPanel,
    setShowDialogue,
    completeWelcome,
    completeTask,
    activateTask,
    getNextTask,
    getCurrentTask,
    addPoints,
    unlockBadge,
    startHighlight,
    endHighlight,
    showCharacterDialogue,
    resetOnboarding
  }), [
    state, tasks, currentDialogue, showWelcome, showTaskPanel, showDialogue,
    isHighlighting, highlightTarget,
    completeWelcome, completeTask, activateTask,
    getNextTask, getCurrentTask,
    addPoints, unlockBadge,
    startHighlight, endHighlight,
    showCharacterDialogue, resetOnboarding
  ])

  return (
    <GuideContext.Provider value={contextValue}>
      {children}
    </GuideContext.Provider>
  )
}

export function useGuide() {
  const context = useContext(GuideContext)
  if (!context) {
    throw new Error('useGuide must be used within a GuideProvider')
  }
  return context
}
