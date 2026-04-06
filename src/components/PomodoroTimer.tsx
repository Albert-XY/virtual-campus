'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { PomodoroSession, SceneType } from '@/types'
import { Button } from '@/components/ui/button'
import { Play, Pause, Square, SkipForward, RotateCcw } from 'lucide-react'

// ============================================================
// 类型
// ============================================================
type TimerState = 'idle' | 'focusing' | 'breaking'

interface PomodoroTimerProps {
  scene: SceneType
  checkinId?: string
  onSessionComplete?: (session: PomodoroSession) => void
  autoStart?: boolean
  compact?: boolean
}

interface PersistedState {
  sessionId: string
  state: TimerState
  remainingSeconds: number
  scene: SceneType
  startedAt: string
}

// ============================================================
// 常量
// ============================================================
const DEFAULT_FOCUS_MINUTES = 25
const DEFAULT_BREAK_MINUTES = 5
const FOCUS_COLOR = 'var(--accent)'
const BREAK_COLOR = 'var(--accent-color)'
const TRACK_COLOR = 'var(--border)'

// ============================================================
// 工具函数
// ============================================================
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function getStorageKey(scene: SceneType): string {
  const today = new Date().toISOString().split('T')[0]
  return `pomodoro_${scene}_${today}`
}

function playNotificationSound() {
  try {
    const ctx = new AudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    oscillator.frequency.value = 800
    oscillator.type = 'sine'
    gainNode.gain.value = 0.3
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.3)
  } catch {
    // Web Audio API 不可用时静默失败
  }
}

// ============================================================
// 组件
// ============================================================
export default function PomodoroTimer({
  scene,
  checkinId,
  onSessionComplete,
  autoStart = false,
  compact = false,
}: PomodoroTimerProps) {
  // ---- 状态 ----
  const [timerState, setTimerState] = useState<TimerState>('idle')
  const [remainingSeconds, setRemainingSeconds] = useState(
    DEFAULT_FOCUS_MINUTES * 60
  )
  const [focusMinutes] = useState(DEFAULT_FOCUS_MINUTES)
  const [breakMinutes] = useState(DEFAULT_BREAK_MINUTES)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isPaused, setIsPaused] = useState(false)

  // ---- Refs ----
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  // ---- 计算属性 ----
  const totalSeconds =
    timerState === 'focusing'
      ? focusMinutes * 60
      : timerState === 'breaking'
        ? breakMinutes * 60
        : focusMinutes * 60

  const progress =
    totalSeconds > 0 ? (totalSeconds - remainingSeconds) / totalSeconds : 0

  const strokeColor = timerState === 'breaking' ? BREAK_COLOR : FOCUS_COLOR

  const size = compact ? 120 : 200
  const strokeWidth = compact ? 8 : 10
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - progress)

  // ---- localStorage 持久化 ----
  const persistState = useCallback(
    (state: TimerState, remaining: number, sid: string | null) => {
      if (!sid) return
      const data: PersistedState = {
        sessionId: sid,
        state,
        remainingSeconds: remaining,
        scene,
        startedAt: new Date().toISOString(),
      }
      try {
        localStorage.setItem(getStorageKey(scene), JSON.stringify(data))
      } catch {
        // localStorage 不可用时静默失败
      }
    },
    [scene]
  )

  const clearPersistedState = useCallback(() => {
    try {
      localStorage.removeItem(getStorageKey(scene))
    } catch {
      // 静默失败
    }
  }, [scene])

  // ---- 恢复持久化状态 ----
  useEffect(() => {
    try {
      const raw = localStorage.getItem(getStorageKey(scene))
      if (!raw) return

      const data: PersistedState = JSON.parse(raw)
      if (data.scene !== scene) return

      // 检查是否是今天的记录
      const today = new Date().toISOString().split('T')[0]
      const storedDate = data.startedAt?.split('T')[0]
      if (storedDate !== today) {
        clearPersistedState()
        return
      }

      setSessionId(data.sessionId)
      setTimerState(data.state)
      setRemainingSeconds(data.remainingSeconds)
      setIsPaused(false)
    } catch {
      // 解析失败时忽略
    }
  }, [scene, clearPersistedState])

  // ---- 自动开始 ----
  useEffect(() => {
    if (autoStart && timerState === 'idle' && !sessionId) {
      handleStart()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart])

  // ---- Wake Lock ----
  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen')
      }
    } catch {
      // Wake Lock 不可用时静默失败
    }
  }, [])

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {})
      wakeLockRef.current = null
    }
  }, [])

  // ---- 倒计时逻辑 ----
  useEffect(() => {
    if (timerState === 'idle' || isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (isPaused) {
        releaseWakeLock()
      }
      return
    }

    // 专注阶段请求 Wake Lock
    if (timerState === 'focusing') {
      requestWakeLock()
    }

    intervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          // 时间到
          clearInterval(intervalRef.current!)
          intervalRef.current = null
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [timerState, isPaused, requestWakeLock, releaseWakeLock])

  // ---- 时间到处理 ----
  useEffect(() => {
    if (remainingSeconds !== 0) return
    if (timerState === 'idle') return

    playNotificationSound()

    if (timerState === 'focusing') {
      // 专注完成 → 进入休息
      releaseWakeLock()
      setTimerState('breaking')
      setRemainingSeconds(breakMinutes * 60)
      setIsPaused(false)
      if (sessionId) {
        persistState('breaking', breakMinutes * 60, sessionId)
      }
    } else if (timerState === 'breaking') {
      // 休息完成 → 结束整个番茄钟
      handleComplete()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSeconds, timerState])

  // ---- API 调用 ----
  const startSession = useCallback(async () => {
    try {
      const res = await fetch('/api/pomodoro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scene,
          checkin_id: checkinId ?? null,
          focus_minutes: focusMinutes,
          break_minutes: breakMinutes,
        }),
      })

      if (!res.ok) {
        console.error('开始番茄钟失败:', await res.text())
        return null
      }

      const { session } = (await res.json()) as { session: PomodoroSession }
      return session
    } catch (error) {
      console.error('开始番茄钟异常:', error)
      return null
    }
  }, [scene, checkinId, focusMinutes, breakMinutes])

  const endSession = useCallback(
    async (sid: string, completed: boolean) => {
      try {
        const res = await fetch('/api/pomodoro', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sid,
            is_completed: completed,
          }),
        })

        if (!res.ok) {
          console.error('结束番茄钟失败:', await res.text())
          return null
        }

        const { session } = (await res.json()) as { session: PomodoroSession }
        return session
      } catch (error) {
        console.error('结束番茄钟异常:', error)
        return null
      }
    },
    []
  )

  // ---- 操作处理 ----
  const handleStart = useCallback(async () => {
    const session = await startSession()
    if (!session) return

    setSessionId(session.id)
    setTimerState('focusing')
    setRemainingSeconds(focusMinutes * 60)
    setIsPaused(false)
    persistState('focusing', focusMinutes * 60, session.id)
  }, [startSession, focusMinutes, persistState])

  const handlePause = useCallback(() => {
    setIsPaused(true)
    if (sessionId) {
      persistState(timerState, remainingSeconds, sessionId)
    }
  }, [sessionId, timerState, remainingSeconds, persistState])

  const handleResume = useCallback(() => {
    setIsPaused(false)
  }, [])

  const handleAbandon = useCallback(async () => {
    releaseWakeLock()

    if (sessionId) {
      await endSession(sessionId, false)
    }

    setSessionId(null)
    setTimerState('idle')
    setRemainingSeconds(focusMinutes * 60)
    setIsPaused(false)
    clearPersistedState()
  }, [sessionId, endSession, focusMinutes, clearPersistedState, releaseWakeLock])

  const handleSkipBreak = useCallback(async () => {
    if (sessionId) {
      await endSession(sessionId, true)
      onSessionComplete?.({
        id: sessionId,
        user_id: '',
        checkin_id: '',
        scene,
        focus_minutes: focusMinutes,
        break_minutes: breakMinutes,
        started_at: '',
        ended_at: new Date().toISOString(),
        is_completed: true,
      })
    }

    setSessionId(null)
    setTimerState('idle')
    setRemainingSeconds(focusMinutes * 60)
    setIsPaused(false)
    clearPersistedState()
  }, [
    sessionId,
    endSession,
    onSessionComplete,
    scene,
    focusMinutes,
    breakMinutes,
    clearPersistedState,
  ])

  const handleComplete = useCallback(async () => {
    releaseWakeLock()

    if (sessionId) {
      const session = await endSession(sessionId, true)
      if (session) {
        onSessionComplete?.(session)
      }
    }

    setSessionId(null)
    setTimerState('idle')
    setRemainingSeconds(focusMinutes * 60)
    setIsPaused(false)
    clearPersistedState()
  }, [
    sessionId,
    endSession,
    onSessionComplete,
    focusMinutes,
    clearPersistedState,
    releaseWakeLock,
  ])

  // ---- 清理 ----
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      releaseWakeLock()
    }
  }, [releaseWakeLock])

  // ---- 状态文字 ----
  const statusText =
    timerState === 'focusing'
      ? isPaused
        ? '已暂停'
        : '专注中...'
      : timerState === 'breaking'
        ? isPaused
          ? '已暂停'
          : '休息中...'
        : '准备开始'

  // ---- 渲染 ----
  return (
    <div className="flex flex-col items-center gap-4">
      {/* 圆形进度条 */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90"
        >
          {/* 背景轨道 */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={TRACK_COLOR}
            strokeWidth={strokeWidth}
          />
          {/* 进度条 */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        {/* 中间文字 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`font-mono font-bold tabular-nums ${compact ? 'text-xl' : 'text-3xl'}`}
            style={{ color: timerState === 'idle' ? 'var(--text-primary)' : strokeColor }}
          >
            {formatTime(remainingSeconds)}
          </span>
          {!compact && (
            <span className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{statusText}</span>
          )}
        </div>
      </div>

      {/* 按钮组 */}
      <div className="flex items-center gap-2">
        {timerState === 'idle' && (
          <Button
            onClick={handleStart}
            style={{ backgroundColor: FOCUS_COLOR }}
            className="text-white hover:opacity-90"
            size={compact ? 'sm' : 'default'}
          >
            <Play className="w-4 h-4 mr-1" />
            {compact ? '开始' : '开始专注'}
          </Button>
        )}

        {timerState === 'focusing' && !isPaused && (
          <>
            <Button
              onClick={handlePause}
              variant="outline"
              size={compact ? 'sm' : 'default'}
            >
              <Pause className="w-4 h-4 mr-1" />
              {compact ? '暂停' : '暂停'}
            </Button>
            <Button
              onClick={handleAbandon}
              variant="outline"
              size={compact ? 'sm' : 'default'}
              className="text-[var(--danger)] border-[var(--danger)]/20 hover:bg-[var(--danger)]/10"
            >
              <Square className="w-4 h-4 mr-1" />
              {compact ? '放弃' : '放弃'}
            </Button>
          </>
        )}

        {timerState === 'focusing' && isPaused && (
          <>
            <Button
              onClick={handleResume}
              style={{ backgroundColor: FOCUS_COLOR }}
              className="text-white hover:opacity-90"
              size={compact ? 'sm' : 'default'}
            >
              <Play className="w-4 h-4 mr-1" />
              {compact ? '继续' : '继续'}
            </Button>
            <Button
              onClick={handleAbandon}
              variant="outline"
              size={compact ? 'sm' : 'default'}
              className="text-[var(--danger)] border-[var(--danger)]/20 hover:bg-[var(--danger)]/10"
            >
              <Square className="w-4 h-4 mr-1" />
              {compact ? '放弃' : '放弃'}
            </Button>
          </>
        )}

        {timerState === 'breaking' && (
          <Button
            onClick={handleSkipBreak}
            variant="outline"
            style={{ borderColor: BREAK_COLOR, color: BREAK_COLOR }}
            size={compact ? 'sm' : 'default'}
          >
            <SkipForward className="w-4 h-4 mr-1" />
            {compact ? '跳过' : '跳过休息'}
          </Button>
        )}

        {timerState === 'idle' && sessionId === null && (
          <Button
            variant="ghost"
            size={compact ? 'sm' : 'default'}
            className="opacity-40"
            disabled
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            {compact ? '' : '重置'}
          </Button>
        )}
      </div>
    </div>
  )
}
