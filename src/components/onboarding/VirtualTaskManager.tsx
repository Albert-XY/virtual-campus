'use client'

import { useState } from 'react'
import { useGuide } from '../GuideProvider'
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  MapPin,
  Trophy,
  Star,
  Flag
} from 'lucide-react'

export default function VirtualTaskManager() {
  const {
    state,
    tasks,
    getCurrentTask,
    showTaskPanel,
    setShowTaskPanel
  } = useGuide()

  const [expanded, setExpanded] = useState(true)
  const currentTask = getCurrentTask()
  const completedCount = tasks.filter(t => t.isCompleted).length
  const totalCount = tasks.length
  const progressPercent = Math.round((completedCount / totalCount) * 100)

  if (!showTaskPanel) {
    return (
      <button
        onClick={() => setShowTaskPanel(true)}
        className="fixed bottom-4 right-4 z-40 p-3 rounded-full shadow-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
        style={{ backgroundColor: 'var(--accent-color)' }}
      >
        <Flag size={20} color="white" />
        {currentTask && (
          <span className="text-white font-medium text-sm hidden sm:block">
            {currentTask.title}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 w-80 max-w-[calc(100vw-2rem)]">
      <div 
        className="rounded-2xl shadow-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
        }}
      >
        {/* 头部 */}
        <div 
          className="p-4 flex items-center justify-between cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--accent-color)' }}
            >
              <Flag size={20} color="white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 
                  className="font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  主线任务
                </h3>
                <span 
                  className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: 'var(--accent-color)' }}
                >
                  {completedCount}/{totalCount}
                </span>
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                第一天旅程
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {expanded ? (
              <ChevronDown size={20} style={{ color: 'var(--text-muted)' }} />
            ) : (
              <ChevronUp size={20} style={{ color: 'var(--text-muted)' }} />
            )}
          </div>
        </div>

        {expanded && (
          <>
            {/* 进度条 */}
            <div className="px-4 pb-4">
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-color)' }}>
                <div 
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${progressPercent}%`,
                    backgroundColor: 'var(--accent-color)',
                  }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  进度
                </span>
                <span className="text-xs font-medium" style={{ color: 'var(--accent-color)' }}>
                  {progressPercent}%
                </span>
              </div>
            </div>

            {/* 任务列表 */}
            <div className="max-h-80 overflow-y-auto">
              {tasks
                .sort((a, b) => a.order - b.order)
                .map((task) => {
                  const isCurrent = currentTask?.id === task.id
                  const isCompleted = task.isCompleted
                  const isLocked = !isCompleted && !isCurrent && task.prerequisites?.some(
                    p => !state.completedTasks.includes(p)
                  )

                  return (
                    <div
                      key={task.id}
                      className={`px-4 py-3 border-t transition-colors ${
                        isCurrent ? 'bg-white/5' : ''
                      }`}
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      <div className="flex items-start gap-3">
                        {/* 状态图标 */}
                        <div className="flex-shrink-0 mt-0.5">
                          {isCompleted ? (
                            <CheckCircle2 size={20} style={{ color: 'var(--accent-color)' }} />
                          ) : isLocked ? (
                            <Circle size={20} style={{ color: 'var(--text-muted)' }} />
                          ) : (
                            <Circle 
                              size={20} 
                              style={{ color: 'var(--accent-color)' }}
                              className="animate-pulse"
                            />
                          )}
                        </div>

                        {/* 任务内容 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4
                              className={`font-medium text-sm ${
                                isCompleted ? 'line-through' : ''
                              }`}
                              style={{ 
                                color: isLocked 
                                  ? 'var(--text-muted)' 
                                  : isCurrent 
                                    ? 'var(--accent-color)' 
                                    : 'var(--text-primary)'
                              }}
                            >
                              {task.title}
                            </h4>
                            {isCurrent && (
                              <span 
                                className="px-1.5 py-0.5 rounded text-xs font-medium text-white"
                                style={{ backgroundColor: 'var(--accent-color)' }}
                              >
                                当前
                              </span>
                            )}
                            {isCompleted && (
                              <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--accent-color)' }}>
                                <Star size={14} />
                                <span>+{task.reward}</span>
                              </div>
                            )}
                          </div>
                          <p 
                            className="text-xs mb-2"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {task.description}
                          </p>
                          <div className="flex items-center gap-2">
                            <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
                            <span 
                              className="text-xs"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              {task.locationName}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>

            {/* 底部信息 */}
            <div className="p-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-2">
                <Trophy size={18} style={{ color: 'var(--accent-color)' }} />
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  总积分: {state.totalPoints}
                </span>
              </div>
              <button
                onClick={() => setShowTaskPanel(false)}
                className="text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                收起
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
