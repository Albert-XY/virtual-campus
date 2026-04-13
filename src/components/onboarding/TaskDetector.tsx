'use client'

import { useEffect } from 'react'
import { useGuide } from '../GuideProvider'

interface TaskDetectorProps {
  scene: string
  onDetect?: (taskId: string) => void
}

export default function TaskDetector({ scene, onDetect }: TaskDetectorProps) {
  const {
    tasks,
    completeTask,
    showCharacterDialogue,
    getCurrentTask
  } = useGuide()

  const currentTask = getCurrentTask()

  useEffect(() => {
    if (!currentTask) return

    // 根据场景检测是否应该完成当前任务
    const shouldComplete = () => {
      // 简单的检测逻辑：如果用户在正确的场景中，就可以触发任务完成
      // 实际项目中可以添加更复杂的检测逻辑
      return currentTask.location === scene
    }

    if (shouldComplete()) {
      // 这里我们不自动完成，而是显示提示
      // 实际完成需要用户的明确操作
    }
  }, [scene, currentTask])

  // 提供一个手动完成任务的函数
  const tryCompleteTask = () => {
    if (currentTask && currentTask.location === scene && !currentTask.isCompleted) {
      completeTask(currentTask.id)
      onDetect?.(currentTask.id)
    }
  }

  return null // 这个组件不渲染任何东西，只是逻辑
}

// 手动完成任务的按钮组件
export function CompleteTaskButton() {
  const {
    getCurrentTask,
    completeTask,
    showCharacterDialogue
  } = useGuide()

  const currentTask = getCurrentTask()

  if (!currentTask) return null

  const handleComplete = () => {
    completeTask(currentTask.id)
  }

  return (
    <button
      onClick={handleComplete}
      className="fixed bottom-24 left-4 z-30 px-4 py-2 rounded-lg text-white text-sm font-medium shadow-lg transition-all hover:scale-105 active:scale-95"
      style={{ backgroundColor: 'var(--accent-color)' }}
    >
      完成「{currentTask.title}」
    </button>
  )
}
